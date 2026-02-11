import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faBook, faCalendarAlt, faCheckCircle, faClock, faPlus, faEdit, faFilter, faLayerGroup, faInfoCircle, faTrash } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import { fetchLessonPlans, fetchLessonTopics, deleteLessonPlan } from '../../services/lessonService';
import LessonPlanModal from '../../components/LessonPlanModal';
import TopicManagerModal from '../../components/TopicManagerModal';
import { Alert } from 'react-native';

const formatDate = (dateString, options = { weekday: 'short', month: 'short', day: 'numeric' }) => {
    try {
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString;
    }
};

const LessonPlansScreen = ({ route, navigation }) => {
    const { classId, className, role } = route.params;
    const { theme } = useTheme();
    const { showToast } = useToast();
    const isTeacher = role === 'teacher' || role === 'admin';

    const [lessons, setLessons] = useState([]);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const [lessonsData, topicsData] = await Promise.all([
                fetchLessonPlans(classId, role),
                fetchLessonTopics(classId)
            ]);
            setLessons(lessonsData);
            setTopics(topicsData);
        } catch (error) {
            console.error(error);
            showToast('Failed to load lessons', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [classId, role, showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#10b981';
            case 'published': return '#3b82f6';
            default: return '#94a3b8';
        }
    };

    const handleDeletePlan = async (id) => {
        Alert.alert('Delete Lesson', 'Are you sure you want to delete this lesson plan?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteLessonPlan(id);
                        showToast('Lesson plan deleted', 'success');
                        loadData();
                    } catch {
                        showToast('Failed to delete lesson plan', 'error');
                    }
                },
            },
        ]);
    };

    const renderLessonItem = ({ item, index }) => (
        <View style={styles.lessonTimelineItem}>
            <View style={styles.timelineSidebar}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(item.status) }]} />
                {index < lessons.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.colors.cardBorder }]} />}
            </View>
            <TouchableOpacity
                style={[styles.lessonCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                activeOpacity={0.7}
                onPress={() => {
                    if (isTeacher) {
                        setSelectedPlan(item);
                        setIsPlanModalOpen(true);
                    }
                }}
            >
                <View style={styles.lessonHeader}>
                    <Text style={[styles.lessonDate, { color: theme.colors.placeholder }]}>
                        {formatDate(item.scheduled_date)}
                    </Text>
                    <View style={styles.headerRight}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status?.toUpperCase()}</Text>
                        </View>
                        {isTeacher && (
                            <TouchableOpacity onPress={() => handleDeletePlan(item.id)} style={styles.deleteBtn}>
                                <FontAwesomeIcon icon={faTrash} size={12} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <Text style={[styles.lessonTitle, { color: theme.colors.text }]}>{item.title}</Text>
                {item.topic && (
                    <View style={styles.topicBadge}>
                        <FontAwesomeIcon icon={faLayerGroup} size={10} color={theme.colors.placeholder} />
                        <Text style={[styles.topicText, { color: theme.colors.placeholder }]}>{item.topic.name}</Text>
                    </View>
                )}
                {item.objectives && item.objectives.length > 0 && (
                    <Text style={[styles.lessonObjectives, { color: theme.colors.text }]} numberOfLines={2}>
                        {Array.isArray(item.objectives) ? item.objectives[0] : item.objectives}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#4f46e5', '#818cf8']}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesomeIcon icon={faChevronLeft} size={20} color="#fff" />
                    </TouchableOpacity>
                    {isTeacher && (
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={() => setIsTopicModalOpen(true)} style={styles.iconAction}>
                                <FontAwesomeIcon icon={faEdit} size={16} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setSelectedPlan(null); setIsPlanModalOpen(true); }} style={styles.iconAction}>
                                <FontAwesomeIcon icon={faPlus} size={16} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Curriculum</Text>
                    <Text style={styles.headerSubtitle}>{className}</Text>
                </View>
            </LinearGradient>

            {isTeacher && (
                <View style={styles.helperCardContainer}>
                    <View style={[styles.helperCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '20' }]}>
                        <FontAwesomeIcon icon={faInfoCircle} size={16} color={theme.colors.primary} />
                        <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
                            To get started, create your <Text style={{ fontWeight: '900', color: theme.colors.primary }}>Curriculum Topics</Text> first by clicking the edit icon above. Once units are defined, you can plan individual lessons.
                        </Text>
                    </View>
                </View>
            )}

            <FlatList
                data={lessons}
                renderItem={renderLessonItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={faCalendarAlt} size={50} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No lessons found for this class.</Text>
                            {isTeacher && (
                                <TouchableOpacity 
                                    onPress={() => { setSelectedPlan(null); setIsPlanModalOpen(true); }}
                                    style={[styles.emptyAddBtn, { backgroundColor: theme.colors.primary }]}
                                >
                                    <Text style={styles.emptyAddBtnText}>PLAN FIRST LESSON</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            />

            <LessonPlanModal
                isOpen={isPlanModalOpen}
                onClose={() => {
                    setIsPlanModalOpen(false);
                    setSelectedPlan(null);
                }}
                classId={classId}
                topics={topics}
                plan={selectedPlan}
                onRefresh={loadData}
            />

            <TopicManagerModal
                isOpen={isTopicModalOpen}
                onClose={() => setIsTopicModalOpen(false)}
                classId={classId}
                onRefresh={loadData}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    headerActions: { flexDirection: 'row', gap: 12 },
    iconAction: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    backButton: { marginBottom: 16 },
    headerTitleContainer: {},
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
    headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    listContent: { padding: 20 },
    helperCardContainer: { paddingHorizontal: 20, paddingTop: 20 },
    helperCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
    helperText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },
    lessonTimelineItem: { flexDirection: 'row', marginBottom: 20 },
    timelineSidebar: { alignItems: 'center', width: 20, marginRight: 15 },
    timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
    timelineLine: { width: 2, flex: 1, marginTop: -2 },
    lessonCard: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1 },
    lessonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deleteBtn: { padding: 4 },
    lessonDate: { fontSize: 12, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    lessonTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    topicBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.03)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    topicText: { fontSize: 12, fontWeight: '600' },
    lessonObjectives: { fontSize: 14, opacity: 0.7, lineHeight: 20 },
    emptyContainer: { padding: 40, alignItems: 'center', gap: 16 },
    emptyText: { textAlign: 'center', fontSize: 16, fontWeight: '600' },
    emptyAddBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
    emptyAddBtnText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});

export default LessonPlansScreen;
