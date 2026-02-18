import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faGraduationCap, faCalendarAlt, faChevronRight, faCircle, faFileSignature } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const StudentGradeDetailModal = ({ visible, onClose, student, marks, categories }) => {
    const { theme } = useTheme();

    if (!student) return null;

    // Group marks by category
    const marksByCategory = categories.map(cat => ({
        ...cat,
        marks: marks.filter(m => m.category_id === cat.id)
    })).filter(c => c.marks.length > 0);

    const getGradeColor = (grade) => {
        if (!grade) return '#94a3b8';
        if (grade >= 80) return '#10b981';
        if (grade >= 60) return '#3b82f6';
        if (grade >= 40) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            style={styles.modal}
            backdropOpacity={0.5}
            propagateSwipe={true}
        >
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={styles.headerInfo}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{student.full_name.charAt(0)}</Text>
                        </View>
                        <View>
                            <Text style={[styles.title, { color: theme.colors.text }]}>{student.full_name}</Text>
                            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Academic Performance Breakdown</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                    {marksByCategory.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No marks recorded for this student.</Text>
                        </View>
                    ) : (
                        marksByCategory.map((cat, idx) => (
                            <View key={cat.id || idx} style={styles.categorySection}>
                                <View style={styles.categoryHeader}>
                                    <Text style={[styles.categoryName, { color: theme.colors.primary }]}>{cat.name.toUpperCase()}</Text>
                                    <View style={[styles.weightBadge, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <Text style={[styles.weightText, { color: theme.colors.primary }]}>{cat.weight}% Weight</Text>
                                    </View>
                                </View>

                                {cat.marks.map((mark, mIdx) => {
                                    const percentage = mark.score !== null && mark.total_possible ? Math.round((mark.score / mark.total_possible) * 100) : null;
                                    const isExam = !!mark.exam_paper_id;

                                    return (
                                        <View key={mark.id || mIdx} style={[styles.markRow, { borderColor: theme.colors.cardBorder }]}>
                                            <View style={styles.markMain}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    {isExam && <FontAwesomeIcon icon={faFileSignature} size={14} color="#10b981" />}
                                                    <Text style={[styles.assessmentName, { color: theme.colors.text }]}>{mark.assessment_name || 'Assessment'}</Text>
                                                </View>
                                                <View style={styles.dateRow}>
                                                    <FontAwesomeIcon icon={faCalendarAlt} size={10} color={theme.colors.placeholder} />
                                                    <Text style={[styles.dateText, { color: theme.colors.placeholder }]}>
                                                        {mark.assessment_date ? new Date(mark.assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={styles.markScore}>
                                                <Text style={[styles.scoreValue, { color: theme.colors.text }]}>
                                                    {mark.score}/{mark.total_possible}
                                                </Text>
                                                {percentage !== null && (
                                                    <Text style={[styles.percentageText, { color: getGradeColor(percentage) }]}>
                                                        {percentage}%
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ))
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { margin: 0, justifyContent: 'flex-end' },
    container: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
    headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '900', fontSize: 20 },
    title: { fontSize: 20, fontWeight: '900' },
    subtitle: { fontSize: 13, fontWeight: '600' },
    closeBtn: { padding: 4 },
    content: { padding: 24 },
    scrollContent: { paddingBottom: 40 },
    categorySection: { marginBottom: 24 },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    categoryName: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    weightBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    weightText: { fontSize: 11, fontWeight: '800' },
    markRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
    markMain: { flex: 1 },
    assessmentName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateText: { fontSize: 11, fontWeight: '500' },
    markScore: { alignItems: 'flex-end' },
    scoreValue: { fontSize: 14, fontWeight: '800' },
    percentageText: { fontSize: 12, fontWeight: '900' },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, fontStyle: 'italic', fontWeight: '500' }
});

export default StudentGradeDetailModal;
