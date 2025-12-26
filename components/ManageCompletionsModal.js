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

export default function ManageCompletionsModal({
    visible,
    onClose,
    item,
    type // 'homework' or 'assignment'
}) {
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
    }, [visible, item]);

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
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }
                ]}
                onPress={() => toggleCompletion(member.user_id)}
                disabled={!!processingId}
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
                        <FontAwesomeIcon
                            icon={isDone ? faCheckCircle : faCircle}
                            size={24}
                            color={isDone ? theme.colors.success : theme.colors.cardBorder}
                        />
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
            backdropOpacity={0.5}
        >
            <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.handle} />

                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <FontAwesomeIcon icon={faUsers} size={20} color={theme.colors.primary} />
                        <Text style={[styles.title, { color: theme.colors.text }]}>Track Students</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.infoBanner, { backgroundColor: theme.colors.primary + '10' }]}>
                    <FontAwesomeIcon icon={faInfoCircle} size={16} color={theme.colors.primary} />
                    <Text style={[styles.infoText, { color: theme.colors.primary }]}>
                        Tap a student's card to mark their work as complete. Verified tasks appear with a "Done" badge for parents and students.
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={{ color: theme.colors.placeholder, marginTop: 10 }}>Loading Roster...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={students}
                        keyExtractor={item => item.id}
                        renderItem={renderStudent}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={{ color: theme.colors.placeholder }}>No students enrolled in this class.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    content: {
        height: '80%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    infoBanner: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        gap: 10,
        marginBottom: 20,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
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
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    studentInfo: {
        flex: 1,
        marginLeft: 12,
    },
    studentName: {
        fontSize: 16,
        fontWeight: '700',
    },
    studentEmail: {
        fontSize: 12,
    },
    statusContainer: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    empty: {
        padding: 20,
        alignItems: 'center',
    },
});
