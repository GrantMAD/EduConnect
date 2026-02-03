import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { fetchExamPapers, deleteExamPaper, autoAllocateSession, fetchExamVenues, notifySessionStudents, clearSessionAllocations, fetchExamSession } from '../services/examService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrash, faArrowLeft, faFileAlt, faClock, faCalendarAlt, faChair, faBullhorn, faPlus, faCheckCircle, faList, faRedo, faBan, faUserShield } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/Button';
import LinearGradient from 'react-native-linear-gradient';
import ExamSessionDetailScreenSkeleton from '../components/skeletons/ExamSessionDetailScreenSkeleton';

export default function ExamSessionDetailScreen({ route, navigation }) {
    const { sessionId, sessionName } = route.params;
    const insets = useSafeAreaInsets();
    const { profile } = useAuth();
    const { theme } = useTheme();
    const { showToast } = useToast();

    const [session, setSession] = useState(null);
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [allocating, setAllocating] = useState(false);
    const [notifying, setNotifying] = useState(false);

    // Allocate Modal State
    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const [papersData, venuesData, sessionData] = await Promise.all([
                fetchExamPapers(sessionId),
                fetchExamVenues(profile.school_id),
                fetchExamSession(sessionId)
            ]);
            setPapers(papersData);
            setVenues(venuesData);
            setSession(sessionData);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const unsubscribe = navigation.addListener('focus', loadData);
        return unsubscribe;
    }, [navigation]);

    const handleDeletePaper = async (id) => {
        Alert.alert(
            "Delete Paper",
            "Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteExamPaper(id);
                            loadData();
                        } catch (error) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleNotify = async () => {
        Alert.alert(
            "Notify Students",
            "This will send notifications to all allocated students and their parents. Continue?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Send",
                    onPress: async () => {
                        setNotifying(true);
                        try {
                            const result = await notifySessionStudents(sessionId, sessionName);
                            if (result.message) {
                                showToast(result.message, 'info');
                            } else {
                                showToast(`Sent notifications to ${result.count} students.`, 'success');
                            }
                            loadData();
                        } catch (error) {
                            Alert.alert("Error", error.message);
                        } finally {
                            setNotifying(false);
                        }
                    }
                }
            ]
        );
    };

    const handleAutoAllocate = async () => {
        if (!selectedVenue) {
            Alert.alert("Select Venue", "Please select a venue for allocation.");
            return;
        }

        setAllocating(true);
        try {
            const count = await autoAllocateSession(sessionId, selectedVenue, profile.school_id, session?.target_grade);
            showToast(`Allocated ${count} seats successfully.`, 'success');
            setShowAllocateModal(false);
            loadData(); // Refresh counts
        } catch (error) {
            Alert.alert("Allocation Failed", error.message);
        } finally {
            setAllocating(false);
        }
    };

    const handleClearAllocations = async () => {
        Alert.alert(
            "Clear All Allocations",
            "Are you sure? This will remove ALL assigned seats for this session. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        setAllocating(true);
                        try {
                            await clearSessionAllocations(sessionId);
                            loadData();
                            showToast("All allocations cleared.", 'success');
                        } catch (error) {
                            Alert.alert("Error", error.message);
                        } finally {
                            setAllocating(false);
                        }
                    }
                }
            ]
        );
    };

    const handleManageSeats = () => {
        const totalAllocated = papers.reduce((acc, p) => acc + (p.exam_seat_allocations?.[0]?.count || 0), 0);

        if (totalAllocated === 0) {
            setShowAllocateModal(true);
            return;
        }

        Alert.alert(
            "Manage Seats",
            `There are currently ${totalAllocated} allocated seats. What would you like to do?`,
            [
                { text: "View/Edit List", onPress: () => navigation.navigate('ExamAllocations', { sessionId, sessionName }) },
                { text: "Auto-Allocate Remaining", onPress: () => setShowAllocateModal(true) },
                { text: "Clear All Seats", style: "destructive", onPress: handleClearAllocations },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const renderPaperItem = ({ item }) => (
        <View style={styles.glowWrapper}>
            <TouchableOpacity
                style={[styles.paperCard, { backgroundColor: theme.cardBackground }]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('ExamAllocations', { sessionId, sessionName, initialPaperId: item.id })}
            >
                {/* LEFT ICON */}
                <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.iconBadge}
                >
                    <FontAwesomeIcon icon={faFileAlt} size={18} color="#fff" />
                </LinearGradient>

                {/* MAIN CONTENT */}
                <View style={styles.paperInfo}>
                    <Text style={[styles.paperCode, { color: '#0d9488' }]}>{item.paper_code}</Text>
                    <Text style={[styles.paperSubject, { color: theme.text }]} numberOfLines={1}>{item.subject_name}</Text>
                    <View style={styles.timeInfo}>
                        <FontAwesomeIcon icon={faCalendarAlt} size={10} color={theme.textSecondary} />
                        <Text style={[styles.paperTime, { color: theme.textSecondary }]}>
                            {new Date(item.date).toLocaleDateString()}
                        </Text>
                        <Text style={[styles.dotSeparator, { color: theme.textSecondary }]}>•</Text>
                        <FontAwesomeIcon icon={faClock} size={10} color={theme.textSecondary} />
                        <Text style={[styles.paperTime, { color: theme.textSecondary }]}>
                            {item.start_time.slice(0, 5)}
                        </Text>
                        {item.exam_seat_allocations?.[0]?.count > 0 && (
                            <>
                                <Text style={[styles.dotSeparator, { color: theme.textSecondary }]}>•</Text>
                                <Text style={[styles.paperTime, { color: '#0d9488', fontWeight: 'bold' }]}>
                                    {item.exam_seat_allocations[0].count} Seats
                                </Text>
                            </>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => handleDeletePaper(item.id)}
                    style={styles.deleteGhost}
                    hitSlop={10}
                >
                    <FontAwesomeIcon icon={faTrash} size={12} color="#ef4444" />
                </TouchableOpacity>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#0d9488', '#14b8a6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
                            <FontAwesomeIcon icon={faArrowLeft} size={12} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.backText}>Back to Exam Hub</Text>
                        </TouchableOpacity>
                        <Text style={styles.heroTitle} numberOfLines={1}>{sessionName}</Text>
                        <Text style={styles.heroDescription}>Papers, allocations, and staff rosters.</Text>
                    </View>
                    <View style={styles.roleBadge}>
                        <FontAwesomeIcon icon={faList} size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.roleText}>DETAILS</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.actionsBar}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
                    onPress={handleManageSeats}
                    activeOpacity={0.7}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#6366f115' }]}>
                        <FontAwesomeIcon icon={faChair} size={14} color="#6366f1" />
                    </View>
                    <Text style={[styles.actionText, { color: theme.text }]}>Seats</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
                    onPress={() => navigation.navigate('InvigilatorManagement', { sessionId, sessionName })}
                    activeOpacity={0.7}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#f59e0b15' }]}>
                        <FontAwesomeIcon icon={faUserShield} size={14} color="#f59e0b" />
                    </View>
                    <Text style={[styles.actionText, { color: theme.text }]}>Staff</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
                    onPress={handleNotify}
                    activeOpacity={0.7}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#0d948815' }]}>
                        <FontAwesomeIcon icon={faBullhorn} size={14} color="#0d9488" />
                    </View>
                    <Text style={[styles.actionText, { color: theme.text }]}>Notify</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.cardBackground }]}
                    onPress={() => navigation.navigate('CreateExamPaper', { sessionId })}
                    activeOpacity={0.7}
                >
                    <View style={[styles.actionIcon, { backgroundColor: '#10b98115' }]}>
                        <FontAwesomeIcon icon={faPlus} size={14} color="#10b981" />
                    </View>
                    <Text style={[styles.actionText, { color: theme.text }]}>Add Paper</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>EXAM PAPERS</Text>

            {loading && papers.length === 0 ? (
                <ExamSessionDetailScreenSkeleton />
            ) : (
                <FlatList
                    data={papers}
                    renderItem={renderPaperItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={faFileAlt} size={48} color={theme.border} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No papers added yet.</Text>
                        </View>
                    }
                />
            )}

            {/* Allocation Modal */}
            <Modal visible={showAllocateModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface || '#ffffff' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Auto Allocate Seats</Text>
                            <TouchableOpacity onPress={() => setShowAllocateModal(false)}>
                                <FontAwesomeIcon icon={faPlus} size={20} color={theme.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                            Select a venue to automatically assign seats for all papers in this session.
                        </Text>

                        <ScrollView style={{ maxHeight: 200, marginVertical: 16 }}>
                            {venues.map(v => (
                                <TouchableOpacity
                                    key={v.id}
                                    style={[
                                        styles.venueItem,
                                        { backgroundColor: theme.background, borderColor: selectedVenue === v.id ? theme.primary : theme.border }
                                    ]}
                                    onPress={() => setSelectedVenue(v.id)}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.venueName, { color: theme.text }]}>{v.name}</Text>
                                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Capacity: {v.capacity}</Text>
                                    </View>
                                    {selectedVenue === v.id && (
                                        <FontAwesomeIcon icon={faCheckCircle} size={16} color={theme.primary} />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Button title="Start Allocation" onPress={handleAutoAllocate} loading={allocating} />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heroContainer: {
        padding: 24,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 8,
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -1,
    },
    heroDescription: {
        color: '#e0f2f1',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    backRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    backText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '700',
    },
    backButton: { marginRight: 12 },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    roleText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        marginTop: 2,
    },
    actionsBar: {
        flexDirection: 'row',
        padding: 20,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        padding: 12,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    actionText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginTop: 8,
        marginLeft: 20,
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
    },
    paperCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.1)',
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    paperInfo: {
        flex: 1,
    },
    paperCode: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    paperSubject: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    paperTime: {
        fontSize: 12,
        fontWeight: '500',
    },
    dotSeparator: {
        fontSize: 10,
    },
    deleteGhost: {
        padding: 6,
        marginLeft: 8,
    },
    glowWrapper: {
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 2,

        // iOS glow
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 10,

        // Android glow
        elevation: 4,
    },

    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        borderRadius: 24,
        padding: 24,
        backgroundColor: 'white', // Fallback
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
    },
    modalDesc: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    venueItem: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    venueName: {
        fontWeight: '700',
        fontSize: 15,
        marginBottom: 2,
    },
});

