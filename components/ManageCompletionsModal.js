import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faTimes,
    faUsers,
    faCheckCircle,
    faInfoCircle,
    faSave,
    faClipboardCheck
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

// Import services
import {
    fetchClassMembers,
    fetchStudentCompletions,
    deleteStudentCompletion,
    addStudentCompletion,
    saveCompletionMark
} from '../services/classService';

const defaultUserImage = require('../assets/user.png');

const ManageCompletionsModal = React.memo(({
    visible,
    onClose,
    item,
    type // 'homework' or 'assignment'
}) => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [completions, setCompletions] = useState([]); // Array of completion objects
    const [processingId, setProcessingId] = useState(null);
    const [editScores, setEditScores] = useState({}); // { studentId: { score, total } }

    useEffect(() => {
        if (visible && item) {
            fetchData();
        }
    }, [visible, item, type]); // Added type to dependencies

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Students in Class
            const data = await fetchClassMembers(item.class_id);
            const studentMembers = data.filter(m => m.role === 'student');
            setStudents(studentMembers || []);

            // 2. Fetch Existing Completions for this item
            const idField = type === 'homework' ? 'homework_id' : 'assignment_id';
            const completionsData = await fetchStudentCompletions(idField, item.id);

            // completionsData is now array of { id, student_id, score, total_possible }
            setCompletions(completionsData || []);

            // Initialize edit scores
            const initialScores = {};
            completionsData.forEach(c => {
                initialScores[c.student_id] = {
                    score: c.score?.toString() || '',
                    total: c.total_possible?.toString() || '100'
                };
            });
            setEditScores(initialScores);

        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Failed to load students', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleCompletion = async (studentId) => {
        if (processingId) return;
        setProcessingId(studentId);

        const completion = completions.find(c => c.student_id === studentId);
        const isDone = !!completion;
        const idField = type === 'homework' ? 'homework_id' : 'assignment_id';

        try {
            if (isDone) {
                // Remove completion
                await deleteStudentCompletion(studentId, idField, item.id);
                setCompletions(prev => prev.filter(c => c.student_id !== studentId));
                setEditScores(prev => {
                    const next = { ...prev };
                    delete next[studentId];
                    return next;
                });
                showToast('Marking removed', 'success');
            } else {
                // Add completion
                const newComp = await addStudentCompletion(studentId, idField, item.id);
                setCompletions(prev => [...prev, newComp]);
                setEditScores(prev => ({
                    ...prev,
                    [studentId]: { score: '', total: '100' }
                }));
                showToast('Student marked as done', 'success');
            }
        } catch (error) {
            console.error('Error toggling completion:', error);
            showToast('Action failed', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleScoreUpdate = async (studentId) => {
        const completion = completions.find(c => c.student_id === studentId);
        if (!completion) return;

        const scoreData = editScores[studentId];
        if (!scoreData) return;

        setProcessingId(studentId);
        try {
            await saveCompletionMark(completion.id, {
                score: scoreData.score ? parseFloat(scoreData.score) : null,
                total_possible: scoreData.total ? parseFloat(scoreData.total) : 100
            });
            showToast('Student mark saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving mark:', error);
            showToast('Failed to save mark', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const renderStudent = useCallback(({ item: member }) => {
        const studentCompletion = completions.find(c => c.student_id === member.user_id);
        const isDone = !!studentCompletion;
        const isProcessing = processingId === member.user_id;
        const scoreData = editScores[member.user_id] || { score: '', total: '100' };

        return (
            <View
                style={[
                    styles.studentCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }
                ]}
            >
                <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleCompletion(member.user_id)}
                    disabled={!!processingId}
                    activeOpacity={0.7}
                >
                    <Image
                        source={member.users?.avatar_url ? { uri: member.users.avatar_url } : defaultUserImage}
                        style={styles.avatar}
                    />
                    <View style={styles.studentInfo}>
                        <Text style={[styles.studentName, { color: theme.colors.text }]}>
                            {member.users?.full_name}
                        </Text>
                        <Text style={[styles.studentEmail, { color: theme.colors.placeholder }]}>
                            {member.users?.email}
                        </Text>
                    </View>
                    <View style={styles.statusContainer}>
                        {isProcessing ? (
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                        ) : (
                            <View style={[styles.checkCircle, { borderColor: isDone ? theme.colors.success : theme.colors.cardBorder, backgroundColor: isDone ? theme.colors.success : 'transparent' }]}>
                                {isDone && <FontAwesomeIcon icon={faCheckCircle} size={12} color="#fff" />}
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                {isDone && (
                    <View style={[styles.markingRow, { borderTopColor: theme.colors.cardBorder }]}>
                        <View style={styles.scoreInputGroup}>
                            <Text style={[styles.markLabel, { color: theme.colors.placeholder }]}>SCORE</Text>
                            <TextInput
                                style={[styles.markInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}
                                value={scoreData.score}
                                onChangeText={(val) => setEditScores(prev => ({
                                    ...prev,
                                    [member.user_id]: { ...scoreData, score: val }
                                }))}
                                placeholder="0"
                                placeholderTextColor={theme.colors.placeholder}
                                keyboardType="numeric"
                            />
                        </View>
                        <Text style={[styles.markDivider, { color: theme.colors.placeholder }]}>/</Text>
                        <View style={styles.scoreInputGroup}>
                            <Text style={[styles.markLabel, { color: theme.colors.placeholder }]}>TOTAL</Text>
                            <TextInput
                                style={[styles.markInput, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}
                                value={scoreData.total}
                                onChangeText={(val) => setEditScores(prev => ({
                                    ...prev,
                                    [member.user_id]: { ...scoreData, total: val }
                                }))}
                                placeholder="100"
                                placeholderTextColor={theme.colors.placeholder}
                                keyboardType="numeric"
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.saveMarkBtn, { backgroundColor: theme.colors.primary }]}
                            onPress={() => handleScoreUpdate(member.user_id)}
                            disabled={!!processingId}
                        >
                            <FontAwesomeIcon icon={faSave} size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }, [completions, editScores, processingId, theme, toggleCompletion, handleScoreUpdate]);

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            style={styles.modal}
            backdropOpacity={0.4}
            propagateSwipe={true}
            animationInTiming={300}
            animationOutTiming={300}
            useNativeDriver={true}
            useNativeDriverForBackdrop={true}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : null}
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                <View style={[styles.content, { backgroundColor: theme.colors.surface, paddingBottom: 40 }]}>
                    <View style={styles.swipeIndicator} />

                    <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                        <View style={styles.headerTitleRow}>
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                <FontAwesomeIcon icon={faUsers} size={18} color={theme.colors.primary} />
                            </View>
                            <Text style={[styles.title, { color: theme.colors.text }]}>Track Students</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.infoBanner, { backgroundColor: theme.colors.primary + '10' }]}>
                        <FontAwesomeIcon icon={faInfoCircle} size={14} color={theme.colors.primary} />
                        <Text style={[styles.infoText, { color: theme.colors.primary }]}>
                            Tap a student to verify completion and reveal marking inputs. Parents will see a "Done" badge on their dashboard.
                        </Text>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={{ color: theme.colors.placeholder, marginTop: 16, fontWeight: '700', fontSize: 12 }}>LOADING ROSTER...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={students}
                            keyExtractor={item => item.id}
                            renderItem={renderStudent}
                            extraData={[completions, editScores, processingId]}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Text style={{ color: theme.colors.placeholder, fontWeight: '700' }}>No students found in this class.</Text>
                                </View>
                            }
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    content: {
        height: '85%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBanner: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 24,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingBottom: 40,
    },
    studentCard: {
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
    },
    studentInfo: {
        flex: 1,
        marginLeft: 16,
    },
    studentName: {
        fontSize: 15,
        fontWeight: '800',
    },
    studentEmail: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    statusContainer: {
        marginLeft: 12,
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    markingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    scoreInputGroup: {
        flex: 1,
    },
    markLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    markInput: {
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 8,
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    markDivider: {
        fontSize: 20,
        fontWeight: '300',
        marginTop: 12,
    },
    saveMarkBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
});

export default ManageCompletionsModal;
