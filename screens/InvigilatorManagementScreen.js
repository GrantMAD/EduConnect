import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, TextInput, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchExamPapers, fetchInvigilators, assignInvigilator, removeInvigilator, fetchExamVenues } from '../services/examService';
import { fetchUsersBySchool } from '../services/userService';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faFileAlt, faUserShield, faUserPlus, faTrash, faSearch, faChalkboardTeacher, faCheckCircle, faPlus, faChevronRight, faMapMarkerAlt, faUser, faUsers } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import Button from '../components/Button';
import InvigilatorManagementScreenSkeleton from '../components/skeletons/InvigilatorManagementScreenSkeleton';

export default function InvigilatorManagementScreen({ route, navigation }) {
    const { sessionId, sessionName } = route.params;
    const insets = useSafeAreaInsets();
    const { profile } = useAuth();
    const { theme } = useTheme();

    const [papers, setPapers] = useState([]);
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);

    // Per-paper management state
    const [selectedPaper, setSelectedPaper] = useState(null);
    const [showPaperModal, setShowPaperModal] = useState(false);
    const [paperInvigilators, setPaperInvigilators] = useState([]);
    const [loadingInvigilators, setLoadingInvigilators] = useState(false);

    // Assignment state
    const [staff, setStaff] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVenueId, setSelectedVenueId] = useState(null);
    const [isChief, setIsChief] = useState(false);
    const [assigning, setAssigning] = useState(false);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const [papersData, venuesData, staffData] = await Promise.all([
                fetchExamPapers(sessionId),
                fetchExamVenues(profile.school_id),
                fetchUsersBySchool(profile.school_id)
            ]);
            setPapers(papersData);
            setVenues(venuesData);
            setStaff(staffData.filter(u => u.role === 'teacher' || u.role === 'admin'));
            
            if (venuesData.length > 0) {
                setSelectedVenueId(venuesData[0].id);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const handleManagePaper = async (paper) => {
        setSelectedPaper(paper);
        setPaperInvigilators([]);
        setLoadingInvigilators(true);
        setShowPaperModal(true);
        
        try {
            const data = await fetchInvigilators(paper.id);
            setPaperInvigilators(data);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoadingInvigilators(false);
        }
    };

    const handleAssign = async (teacher) => {
        if (!selectedVenueId) {
            Alert.alert("Error", "Please select a venue first.");
            return;
        }

        setAssigning(true);
        try {
            await assignInvigilator({
                paper_id: selectedPaper.id,
                teacher_id: teacher.id,
                venue_id: selectedVenueId,
                is_chief_invigilator: isChief
            });

            // Create notification
            const venueName = venues.find(v => v.id === selectedVenueId)?.name || 'a venue';
            await supabase.from('notifications').insert({
                user_id: teacher.id,
                type: 'exam_invigilation',
                title: 'New Invigilation Duty',
                message: `You have been assigned as ${isChief ? 'Chief ' : ''}Invigilator for "${selectedPaper.subject_name}" on ${new Date(selectedPaper.date).toLocaleDateString()} at ${selectedPaper.start_time} in ${venueName}.`,
                is_read: false
            });

            // Refresh local invigilators
            const updated = await fetchInvigilators(selectedPaper.id);
            setPaperInvigilators(updated);
            
            // Refresh main papers list for counts
            const papersUpdated = await fetchExamPapers(sessionId);
            setPapers(papersUpdated);

            setIsChief(false);
            Alert.alert("Success", "Invigilator assigned successfully.");
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleRemove = async (invId) => {
        Alert.alert(
            "Remove Invigilator",
            "Are you sure you want to remove this duty?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await removeInvigilator(invId);
                            const updated = await fetchInvigilators(selectedPaper.id);
                            setPaperInvigilators(updated);
                            
                            const papersUpdated = await fetchExamPapers(sessionId);
                            setPapers(papersUpdated);
                        } catch (error) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const filteredStaff = staff.filter(s => 
        (s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !paperInvigilators.some(inv => inv.teacher_id === s.id)
    );

    const renderPaperItem = ({ item }) => (
        <View style={styles.glowWrapper}>
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: theme.cardBackground }]}
                onPress={() => handleManagePaper(item)}
                activeOpacity={0.85}
            >
                {/* LEFT ICON */}
                <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.iconBadge}
                >
                    <FontAwesomeIcon icon={faUserShield} size={18} color="#fff" />
                </LinearGradient>

                <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.subject_name}</Text>
                    <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
                        {new Date(item.date).toLocaleDateString()} • {item.start_time.slice(0, 5)}
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: item.exam_invigilators?.[0]?.count > 0 ? '#dcfce7' : '#fff7ed' }]}>
                        <Text style={[styles.countText, { color: item.exam_invigilators?.[0]?.count > 0 ? '#166534' : '#c2410c' }]}>
                            {item.exam_invigilators?.[0]?.count || 0} STAFF ASSIGNED
                        </Text>
                    </View>
                </View>
                <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.border} />
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
                            <Text style={styles.backText}>Back to Session Details</Text>
                        </TouchableOpacity>
                        <Text style={styles.heroTitle}>Staff Roster</Text>
                        <Text style={styles.heroDescription} numberOfLines={1}>
                            {sessionName}
                        </Text>
                    </View>
                    <View style={styles.roleBadge}>
                        <FontAwesomeIcon icon={faChalkboardTeacher} size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.roleText}>DUTY</Text>
                    </View>
                </View>
            </LinearGradient>

            {loading && papers.length === 0 ? (
                <InvigilatorManagementScreenSkeleton />
            ) : (
                <FlatList
                    data={papers}
                    renderItem={renderPaperItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={<Text style={styles.sectionTitle}>EXAM PAPERS</Text>}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={faFileAlt} size={64} color={theme.border} />
                            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No papers found.</Text>
                        </View>
                    }
                />
            )}

            {/* Paper Management Modal */}
            <Modal visible={showPaperModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPaperModal(false)}>
                <View style={[styles.modalRoot, { backgroundColor: theme.colors.background }]}>
                    <LinearGradient
                        colors={['#0d9488', '#14b8a6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.modalHero, { paddingTop: insets.top + 16 }]}
                    >
                        <TouchableOpacity onPress={() => setShowPaperModal(false)} style={styles.modalBackRow}>
                            <FontAwesomeIcon icon={faArrowLeft} size={12} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.modalBackText}>Back to Staff Roster</Text>
                        </TouchableOpacity>

                        <View style={styles.modalHeroContent}>
                            <View style={{ flex: 1, paddingRight: 16 }}>
                                <Text style={styles.modalHeroTitle} numberOfLines={1}>{selectedPaper?.subject_name}</Text>
                                <View style={styles.modalHeroBadge}>
                                    <Text style={styles.modalHeroBadgeText}>DUTY ASSIGNMENT</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setShowPaperModal(false)} style={styles.doneButton}>
                                <Text style={styles.doneButtonText}>DONE</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                        {/* Global Venue Selection */}
                        <View style={styles.modalSection}>
                            <Text style={styles.innerSectionTitle}>SESSION SETTINGS</Text>
                            <View style={styles.glowWrapper}>
                                <View style={[styles.assignmentContainer, { backgroundColor: theme.cardBackground }]}>
                                    <View style={styles.venuePickerHeader}>
                                        <Text style={styles.settingLabel}>TARGET VENUE</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueScroll}>
                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                {venues.map(v => (
                                                    <TouchableOpacity 
                                                        key={v.id} 
                                                        style={[
                                                            styles.venueSettingChip, 
                                                            { 
                                                                backgroundColor: selectedVenueId === v.id ? '#0d9488' : theme.background,
                                                                borderColor: selectedVenueId === v.id ? '#0d9488' : theme.border 
                                                            }
                                                        ]}
                                                        onPress={() => setSelectedVenueId(v.id)}
                                                    >
                                                        <Text style={[styles.venueSettingText, { color: selectedVenueId === v.id ? '#fff' : theme.textSecondary }]}>{v.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Current Roster Section */}
                        <View style={styles.modalSection}>
                            <Text style={styles.innerSectionTitle}>CURRENT ROSTER</Text>
                            {loadingInvigilators ? (
                                <ActivityIndicator style={{ marginTop: 20 }} color="#0d9488" />
                            ) : paperInvigilators.length > 0 ? (
                                paperInvigilators.map(inv => (
                                <View key={inv.id} style={styles.glowWrapper}>
                                    <View style={[styles.rosterCard, { backgroundColor: theme.cardBackground }]}>
                                        <View style={styles.avatarWrapper}>
                                            <Image 
                                                source={inv.teacher?.avatar_url ? { uri: inv.teacher.avatar_url } : require('../assets/user.png')} 
                                                style={styles.avatar} 
                                            />
                                            {inv.is_chief_invigilator && (
                                                <View style={styles.chiefBadge}>
                                                    <FontAwesomeIcon icon={faUserShield} size={8} color="#fff" />
                                                </View>
                                            )}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 16 }}>
                                            <Text style={[styles.staffName, { color: theme.text }]}>{inv.teacher?.full_name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                                <FontAwesomeIcon icon={faMapMarkerAlt} size={10} color="#0d9488" />
                                                <Text style={[styles.venueName, { color: '#0d9488' }]}>
                                                    {venues.find(v => v.id === inv.venue_id)?.name || 'Venue'}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemove(inv.id)} style={styles.removeBtn}>
                                            <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                ))
                            ) : (
                                <View style={[styles.emptyBlock, { borderColor: theme.border }]}>
                                    <FontAwesomeIcon icon={faChalkboardTeacher} size={32} color={theme.border} style={{ marginBottom: 12 }} />
                                    <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 13 }}>No staff assigned yet.</Text>
                                </View>
                            )}
                        </View>

                        {/* Assignment Section */}
                        <View style={styles.modalSection}>
                            <View style={styles.sectionHeaderRow}>
                                <View style={{ flex: 1, paddingRight: 12 }}>
                                    <Text style={styles.innerSectionTitle}>ASSIGN NEW STAFF</Text>
                                    <Text style={styles.innerSectionDescription}>Search and add staff. Toggle "Chief Duty" to assign an overseer role.</Text>
                                </View>
                                <TouchableOpacity 
                                    style={[styles.chiefSetting, { backgroundColor: isChief ? '#fff7ed' : theme.cardBackground, borderColor: isChief ? '#f59e0b' : theme.border }]}
                                    onPress={() => setIsChief(!isChief)}
                                >
                                    <FontAwesomeIcon icon={faUserShield} size={10} color={isChief ? '#f59e0b' : theme.textSecondary} />
                                    <Text style={[styles.chiefSettingText, { color: isChief ? '#f59e0b' : theme.textSecondary }]}>CHIEF DUTY</Text>
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.glowWrapper}>
                                <View style={[styles.assignmentContainer, { backgroundColor: theme.cardBackground }]}>
                                    <View style={[styles.searchBarBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                        <FontAwesomeIcon icon={faSearch} size={12} color={theme.textSecondary} />
                                        <TextInput
                                            placeholder="Search staff members..."
                                            placeholderTextColor={theme.textSecondary}
                                            style={[styles.searchInput, { color: theme.text }]}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                    </View>

                                    <View style={styles.staffGrid}>
                                        {filteredStaff.slice(0, 6).map(s => (
                                            <TouchableOpacity 
                                                key={s.id} 
                                                style={[styles.staffRow, { borderBottomColor: theme.border }]}
                                                onPress={() => handleAssign(s)}
                                                disabled={assigning}
                                            >
                                                <Image 
                                                    source={s.avatar_url ? { uri: s.avatar_url } : require('../assets/user.png')} 
                                                    style={styles.miniAvatar} 
                                                />
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={[styles.staffName, { color: theme.text }]} numberOfLines={1}>{s.full_name}</Text>
                                                    <Text style={[styles.staffRole, { color: theme.textSecondary }]}>{s.role.toUpperCase()}</Text>
                                                </View>
                                                <View style={[styles.quickAddBtn, { backgroundColor: '#0d9488' }]}>
                                                    <FontAwesomeIcon icon={faPlus} size={10} color="#fff" />
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                        {filteredStaff.length === 0 && (
                                            <View style={styles.noResults}>
                                                <FontAwesomeIcon icon={faUsers} size={24} color={theme.colors.cardBorder || theme.border} style={{ marginBottom: 8 }} />
                                                <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                                                    {searchQuery !== '' ? 'No staff matching your search' : 'No staff members available to add'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                        <View style={{ height: 60 }} />
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContainer: {
        padding: 24,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
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
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginTop: 24,
        marginLeft: 20,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.1)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBadge: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2,
    },
    cardDescription: {
        fontSize: 12,
        fontWeight: '500',
        marginBottom: 8,
    },
    countBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    countText: {
        fontSize: 9,
        fontWeight: '900',
    },
    modalRoot: {
        flex: 1,
    },
    modalHero: {
        padding: 24,
        paddingBottom: 32,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    modalBackRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    modalBackText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '700',
    },
    modalHeroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalHeroTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    modalHeroBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    modalHeroBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    doneButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
    },
    modalScroll: {
        padding: 24,
    },
    modalSection: {
        marginBottom: 32,
    },
    innerSectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 1.5,
    },
    innerSectionDescription: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
        marginTop: 2,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    chiefSetting: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6,
    },
    chiefSettingText: {
        fontSize: 9,
        fontWeight: '900',
    },
    assignmentContainer: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.1)',
        overflow: 'hidden',
    },
    venuePickerHeader: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    settingLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: '#94a3b8',
        marginBottom: 10,
    },
    venueSettingChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
    },
    venueSettingText: {
        fontSize: 11,
        fontWeight: '700',
    },
    searchBarBox: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 13,
        fontWeight: '500',
    },
    staffGrid: {
        paddingHorizontal: 16,
        paddingBottom: 8,
    },
    staffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    miniAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    staffName: {
        fontSize: 14,
        fontWeight: '700',
    },
    staffRole: {
        fontSize: 9,
        fontWeight: '800',
        marginTop: 1,
    },
    quickAddBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rosterCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.1)',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    chiefBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#f59e0b',
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    venueName: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
    },
    removeBtn: {
        padding: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 10,
    },
    emptyBlock: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 20,
        borderStyle: 'dashed',
        borderWidth: 1,
    },
    noResults: {
        paddingVertical: 32,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        opacity: 0.5,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: 'bold',
    },
    glowWrapper: {
        marginBottom: 16,
        // iOS glow
        shadowColor: '#0d9488',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        // Android glow
        elevation: 4,
    },
});
