import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faSave, faExclamationTriangle, faCheckCircle, faStar } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { fetchSeatAllocations } from '../services/examService';
import { fetchClassMembers } from '../services/classService';
import { fetchGradingCategories, saveGradingCategory, saveStudentMarks, fetchGradebookData } from '../services/gradebookService';
import Button from './Button';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const EnterExamResultsModal = ({ visible, onClose, paper }) => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [categories, setCategories] = useState([]);
    const [marks, setMarks] = useState({}); // { studentId: score }
    const [selectedCategoryId, setSelectedCategoryId] = useState('new');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [maxMarks, setMaxMarks] = useState(100);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (paper && visible) {
            setNewCategoryName(`${paper.subject_name} - ${paper.paper_code || 'Exam'}`);
            setMaxMarks(paper.total_marks || 100);
            setMarks({});
            setSelectedCategoryId('new');
            loadData();
        }
    }, [paper, visible]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Students (Allocated OR Class Members)
            let studentsData = [];
            const allocations = await fetchSeatAllocations(paper.id);
            if (allocations && allocations.length > 0) {
                studentsData = allocations.map(a => a.student).filter(Boolean);
            } else if (paper.class_id) {
                const members = await fetchClassMembers(paper.class_id);
                studentsData = members.map(m => m.users).filter(Boolean);
            }
            
            // Sort students alphabetically
            studentsData.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
            setStudents(studentsData);

            // 2. Fetch Existing Grading Categories
            if (paper.class_id) {
                const cats = await fetchGradingCategories(paper.class_id);
                setCategories(cats);
                
                // If there's an existing category with same name, maybe auto-select? 
                // For now, default to 'new' or let user choose.
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to load student data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!paper.class_id) {
            Alert.alert('Error', 'This exam is not linked to a Class. Please link it first.');
            return;
        }

        setSaving(true);
        try {
            let targetCategoryId = selectedCategoryId;

            // 1. Create Category if New
            if (selectedCategoryId === 'new') {
                if (!newCategoryName.trim()) {
                    Alert.alert('Error', 'Please provide a name for the new Gradebook category.');
                    setSaving(false);
                    return;
                }
                const category = await saveGradingCategory({
                    class_id: paper.class_id,
                    name: newCategoryName,
                    weight: 0
                });
                targetCategoryId = category.id;
            }

            // 2. Prepare Marks Data
            const marksData = Object.entries(marks)
                .filter(([_, score]) => score !== '' && !isNaN(parseFloat(score)))
                .map(([studentId, score]) => {
                    const numScore = parseFloat(score);
                    const percentage = ((numScore / maxMarks) * 100).toFixed(1);

                    return {
                        class_id: paper.class_id,
                        student_id: studentId,
                        teacher_id: user.id,
                        category_id: targetCategoryId,
                        exam_paper_id: paper.id,
                        score: numScore,
                        total_possible: maxMarks,
                        mark: `${numScore}/${maxMarks} (${percentage}%)`,
                        assessment_date: paper.date,
                        assessment_name: paper.subject_name,
                        teacher_feedback: 'Exam Result'
                    };
                });

            if (marksData.length === 0) {
                showToast('No scores entered', 'info');
                setSaving(false);
                return;
            }

            // 3. Bulk Upsert
            await saveStudentMarks(marksData);
            showToast('Results published to Gradebook', 'success');
            onClose();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleMarkChange = (studentId, value) => {
        // Allow only numbers and decimals
        const cleaned = value.replace(/[^0-9.]/g, '');
        setMarks(prev => ({ ...prev, [studentId]: cleaned }));
    };

    if (!paper) return null;

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            style={styles.modal}
            propagateSwipe
            avoidKeyboard
        >
            <View style={[styles.container, { backgroundColor: theme.colors.surface || '#fff' }]}>
                <View style={styles.modalDragIndicator} />
                
                <View style={styles.header}>
                    <View style={styles.titleIconBox}>
                        <FontAwesomeIcon icon={faStar} size={18} color={theme.colors.primary} />
                        <Text style={[styles.title, { color: theme.colors.text }]}>Enter Results</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <View style={[styles.paperHeader, { backgroundColor: theme.dark ? '#1e293b' : '#f8fafc', borderColor: theme.colors.cardBorder }]}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.subjectName, { color: theme.colors.text }]}>{paper.subject_name}</Text>
                        <Text style={[styles.paperMeta, { color: theme.colors.placeholder }]}>
                            {new Date(paper.date).toLocaleDateString()} • {paper.start_time}
                        </Text>
                    </View>
                    <View style={styles.maxMarksBadge}>
                        <Text style={styles.maxMarksLabel}>MAX SCORE</Text>
                        <Text style={[styles.maxMarksValue, { color: theme.colors.primary }]}>{maxMarks}</Text>
                    </View>
                </View>

                {!paper.class_id ? (
                    <View style={styles.warningContainer}>
                        <FontAwesomeIcon icon={faExclamationTriangle} size={32} color="#f59e0b" />
                        <Text style={[styles.warningTitle, { color: theme.colors.text }]}>Class Link Missing</Text>
                        <Text style={[styles.warningText, { color: theme.colors.placeholder }]}>
                            This exam paper is not linked to an academic class. You must link it to a class in 'Edit Paper' before you can sync results with the Gradebook.
                        </Text>
                    </View>
                ) : (
                    <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.placeholder }]}>GRADEBOOK CATEGORY</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                                <TouchableOpacity
                                    style={[
                                        styles.categoryOption,
                                        { 
                                            backgroundColor: selectedCategoryId === 'new' ? theme.colors.primary + '15' : theme.colors.background,
                                            borderColor: selectedCategoryId === 'new' ? theme.colors.primary : theme.colors.cardBorder
                                        }
                                    ]}
                                    onPress={() => setSelectedCategoryId('new')}
                                >
                                    <Text style={[styles.categoryOptionText, { color: selectedCategoryId === 'new' ? theme.colors.primary : theme.colors.text }]}>+ New Category</Text>
                                </TouchableOpacity>
                                
                                {categories.map(cat => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryOption,
                                            { 
                                                backgroundColor: selectedCategoryId === cat.id ? theme.colors.primary + '15' : theme.colors.background,
                                                borderColor: selectedCategoryId === cat.id ? theme.colors.primary : theme.colors.cardBorder
                                            }
                                        ]}
                                        onPress={() => setSelectedCategoryId(cat.id)}
                                    >
                                        <Text style={[styles.categoryOptionText, { color: selectedCategoryId === cat.id ? theme.colors.primary : theme.colors.text }]}>{cat.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {selectedCategoryId === 'new' && (
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                                        placeholder="e.g. Mid-Term Examination"
                                        placeholderTextColor={theme.colors.placeholder}
                                        value={newCategoryName}
                                        onChangeText={setNewCategoryName}
                                    />
                                </View>
                            )}
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={[styles.sectionTitle, { color: theme.colors.placeholder }]}>STUDENT SCORES</Text>
                                <Text style={[styles.studentCount, { color: theme.colors.placeholder }]}>{students.length} Students</Text>
                            </View>
                            
                            {loading ? (
                                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 30 }} />
                            ) : students.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Text style={[styles.emptyStateText, { color: theme.colors.placeholder }]}>No students found. Ensure students are allocated or enrolled in the class.</Text>
                                </View>
                            ) : (
                                students.map((student, index) => (
                                    <View key={student.id} style={[styles.studentRow, index === students.length - 1 && { borderBottomWidth: 0 }, { borderBottomColor: theme.colors.cardBorder }]}>
                                        <View style={styles.studentInfo}>
                                            <View style={[styles.avatar, { backgroundColor: theme.colors.primary + '15' }]}>
                                                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>{student.full_name?.charAt(0)}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={[styles.studentName, { color: theme.colors.text }]} numberOfLines={1}>{student.full_name}</Text>
                                                <Text style={[styles.studentEmail, { color: theme.colors.placeholder }]} numberOfLines={1}>{student.email}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.scoreInputContainer}>
                                            <TextInput
                                                style={[styles.scoreInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={theme.colors.placeholder}
                                                value={marks[student.id] || ''}
                                                onChangeText={(val) => handleMarkChange(student.id, val)}
                                            />
                                            <Text style={[styles.scoreMax, { color: theme.colors.placeholder }]}>/{maxMarks}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </ScrollView>
                )}

                <View style={[styles.footer, { borderTopColor: theme.colors.cardBorder }]}>
                    <Button
                        title="Publish to Gradebook"
                        onPress={handleSave}
                        loading={saving}
                        disabled={students.length === 0 || !paper.class_id}
                        style={styles.saveButton}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: {
        margin: 0,
        justifyContent: 'flex-end',
    },
    container: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: SCREEN_HEIGHT * 0.9,
        minHeight: SCREEN_HEIGHT * 0.6,
    },
    modalDragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
    },
    titleIconBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
    },
    closeBtn: {
        padding: 4,
    },
    paperHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 24,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    subjectName: {
        fontSize: 16,
        fontWeight: '800',
    },
    paperMeta: {
        fontSize: 12,
        marginTop: 2,
        fontWeight: '500',
    },
    maxMarksBadge: {
        alignItems: 'center',
        paddingLeft: 16,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0,0,0,0.05)',
    },
    maxMarksLabel: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        color: '#94a3b8',
    },
    maxMarksValue: {
        fontSize: 20,
        fontWeight: '900',
    },
    warningContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginTop: 16,
        marginBottom: 8,
    },
    warningText: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
    },
    section: {
        marginBottom: 28,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.2,
    },
    studentCount: {
        fontSize: 10,
        fontWeight: '700',
    },
    categoryScroll: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    categoryOption: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
        marginRight: 10,
    },
    categoryOptionText: {
        fontSize: 13,
        fontWeight: '700',
    },
    inputContainer: {
        marginTop: 4,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        fontSize: 15,
    },
    studentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    studentInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontWeight: '900',
        fontSize: 16,
    },
    studentName: {
        fontSize: 14,
        fontWeight: '700',
    },
    studentEmail: {
        fontSize: 11,
        marginTop: 1,
    },
    scoreInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreInput: {
        width: 64,
        height: 44,
        borderWidth: 1,
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '800',
    },
    scoreMax: {
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyStateText: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
    },
    saveButton: {
        height: 54,
        borderRadius: 16,
    }
});

export default EnterExamResultsModal;