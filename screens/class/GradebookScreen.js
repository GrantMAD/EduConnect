import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faChartPie, faListCheck, faPlus, faGraduationCap, faFilter } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import { fetchGradebookData, fetchGradingCategories, calculateWeightedGrade } from '../../services/gradebookService';
import GradingCategoriesModal from '../../components/GradingCategoriesModal';
import StudentGradeDetailModal from '../../components/StudentGradeDetailModal';

const StudentGradeCard = React.memo(({ item, theme, onPress, getGradeColor }) => (
    <TouchableOpacity
        style={[styles.studentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        activeOpacity={0.7}
        onPress={() => onPress(item)}
    >
        <View style={styles.studentInfo}>
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{item.student.full_name.charAt(0)}</Text>
            </View>
            <View style={styles.studentDetails}>
                <Text style={[styles.studentName, { color: theme.colors.text }]}>{item.student.full_name}</Text>
                <Text style={[styles.studentEmail, { color: theme.colors.placeholder }]}>{item.student.email}</Text>
            </View>
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(item.weightedGrade) + '20' }]}>
                <Text style={[styles.gradeText, { color: getGradeColor(item.weightedGrade) }]}>
                    {item.weightedGrade ? `${item.weightedGrade}%` : 'N/A'}
                </Text>
            </View>
        </View>
    </TouchableOpacity>
));

const GradebookScreen = ({ route, navigation }) => {
    const { classId, className } = route.params;
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [grades, setGrades] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
    const [selectedStudentData, setSelectedStudentData] = useState(null);
    const [isStudentModalVisible, setIsStudentModalVisible] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [marksData, catsData] = await Promise.all([
                fetchGradebookData(classId),
                fetchGradingCategories(classId)
            ]);

            // Transform data into student-centric view
            const studentMap = {};
            marksData.forEach(mark => {
                if (!studentMap[mark.student_id]) {
                    studentMap[mark.student_id] = {
                        student: mark.student,
                        marks: [],
                    };
                }
                studentMap[mark.student_id].marks.push(mark);
            });

            const stats = Object.values(studentMap).map(item => ({
                ...item,
                weightedGrade: calculateWeightedGrade(item.marks, catsData)
            })).sort((a, b) => (b.weightedGrade || 0) - (a.weightedGrade || 0));

            setGrades(stats);
            setCategories(catsData);
        } catch (error) {
            console.error(error);
            showToast('Failed to load gradebook', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [classId, showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    const getGradeColor = useCallback((grade) => {
        if (!grade) return '#94a3b8';
        if (grade >= 80) return '#10b981';
        if (grade >= 60) return '#3b82f6';
        if (grade >= 40) return '#f59e0b';
        return '#ef4444';
    }, []);

    const handleStudentPress = useCallback((item) => {
        setSelectedStudentData(item);
        setIsStudentModalVisible(true);
    }, []);

    const renderStudentItem = useCallback(({ item }) => (
        <StudentGradeCard 
            item={item} 
            theme={theme} 
            onPress={handleStudentPress} 
            getGradeColor={getGradeColor} 
        />
    ), [theme, handleStudentPress, getGradeColor]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#0f172a', '#1e293b']}
                style={styles.header}
            >
                <View style={styles.headerTitleRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <FontAwesomeIcon icon={faChevronLeft} size={20} color="#fff" />
                        </TouchableOpacity>
                        <View style={{ marginLeft: 16 }}>
                            <Text style={styles.headerTitle}>Gradebook</Text>
                            <Text style={styles.headerSubtitle}>{className}</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.setupButton}
                        onPress={() => setIsCategoryModalVisible(true)}
                    >
                        <FontAwesomeIcon icon={faFilter} size={16} color="#fff" />
                    </TouchableOpacity>
                </View>

                {categories.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                        {categories.map(cat => (
                            <View key={cat.id} style={styles.catBadge}>
                                <Text style={styles.catBadgeText}>{cat.name} ({cat.weight}%)</Text>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </LinearGradient>

            {categories.length === 0 && !loading ? (
                <View style={styles.setupContainer}>
                    <FontAwesomeIcon icon={faListCheck} size={60} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                    <Text style={[styles.setupTitle, { color: theme.colors.text }]}>Setup Required</Text>
                    <Text style={[styles.setupDesc, { color: theme.colors.placeholder }]}>
                        Please define grading categories (Homework, Exams, etc.) to calculate weighted grades.
                    </Text>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => setIsCategoryModalVisible(true)}
                    >
                        <Text style={styles.actionBtnText}>DEFINE CATEGORIES</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={grades}
                    renderItem={renderStudentItem}
                    keyExtractor={item => item.student.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                    }
                />
            )}

            <GradingCategoriesModal
                visible={isCategoryModalVisible}
                onClose={() => setIsCategoryModalVisible(false)}
                classId={classId}
                onRefresh={loadData}
            />

            <StudentGradeDetailModal
                visible={isStudentModalVisible}
                onClose={() => setIsStudentModalVisible(false)}
                student={selectedStudentData?.student}
                marks={selectedStudentData?.marks || []}
                categories={categories}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backButton: {},
    headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
    headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    setupButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    catScroll: { marginTop: 20 },
    catBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    catBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    listContent: { padding: 20 },
    studentCard: { padding: 16, borderRadius: 24, marginBottom: 16, borderWidth: 1 },
    studentInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarPlaceholder: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
    studentDetails: { flex: 1, marginLeft: 16 },
    studentName: { fontSize: 16, fontWeight: '800' },
    studentEmail: { fontSize: 12, marginTop: 2 },
    gradeBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    gradeText: { fontSize: 16, fontWeight: '900' },
    setupContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
    setupTitle: { fontSize: 22, fontWeight: '900' },
    setupDesc: { textAlign: 'center', lineHeight: 22, fontSize: 15 },
    actionBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 10 },
    actionBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 1 }
});

export default React.memo(GradebookScreen);
