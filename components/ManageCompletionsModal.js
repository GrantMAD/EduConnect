import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Image
} from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faTimes,
    faUsers,
    faCheckCircle,
    faInfoCircle,
    faCircle
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

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
    const [completions, setCompletions] = useState([]);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        if (visible && item) {
            fetchData();
        }
    }, [visible, item, type]); // Added type to dependencies

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Students in Class
            const { data: members, error: memError } = await supabase
                .from('class_members')
                .select('*, users(id, full_name, email, avatar_url)')
                .eq('class_id', item.class_id)
                .eq('role', 'student');

            if (memError) throw memError;
            setStudents(members || []);

            // 2. Fetch Existing Completions for this item
            const idField = type === 'homework' ? 'homework_id' : 'assignment_id';
            const { data: comp, error: compError } = await supabase
                .from('student_completions')
                .select('student_id')
                .eq(idField, item.id);

            if (compError) throw compError;
            setCompletions(comp?.map(c => c.student_id) || []);

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

        const isDone = completions.includes(studentId);
        const idField = type === 'homework' ? 'homework_id' : 'assignment_id';

        try {
            if (isDone) {
                // Remove completion
                const { error } = await supabase
                    .from('student_completions')
                    .delete()
                    .eq('student_id', studentId)
                    .eq(idField, item.id);

                if (error) throw error;
                setCompletions(prev => prev.filter(id => id !== studentId));
            } else {
                // Add completion
                const { error } = await supabase
                    .from('student_completions')
                    .insert({
                        student_id: studentId,
                        [idField]: item.id
                    });

                if (error) throw error;
                setCompletions(prev => [...prev, studentId]);
            }
        } catch (error) {
            console.error('Error toggling completion:', error);
            showToast('Action failed', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const renderStudent = ({ item: member }) => {
        const isDone = completions.includes(member.user_id);
        const isProcessing = processingId === member.user_id;

        return (
            <TouchableOpacity
                style={[
                    styles.studentCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }
                ]}
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
        );
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            style={styles.modal}
            backdropOpacity={0.4}
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
                        Tap a student to verify completion. Parents will see a "Done" badge on their dashboard.
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
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
    empty: {
        padding: 40,
        alignItems: 'center',
    },
});

export default ManageCompletionsModal;
