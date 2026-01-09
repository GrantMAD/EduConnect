import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faBook, faCalendarAlt, faCheckCircle, faClock } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import { fetchLessonPlans, fetchLessonTopics } from '../../services/lessonService';

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
    const [lessons, setLessons] = useState([]);
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

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

    const renderLessonItem = ({ item, index }) => (
        <View style={styles.lessonTimelineItem}>
            <View style={styles.timelineSidebar}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(item.status) }]} />
                {index < lessons.length - 1 && <View style={[styles.timelineLine, { backgroundColor: theme.colors.cardBorder }]} />}
            </View>
            <TouchableOpacity
                style={[styles.lessonCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                activeOpacity={0.7}
            >
                <View style={styles.lessonHeader}>
                    <Text style={[styles.lessonDate, { color: theme.colors.placeholder }]}>
                        {formatDate(item.scheduled_date)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status?.toUpperCase()}</Text>
                    </View>
                </View>
                <Text style={[styles.lessonTitle, { color: theme.colors.text }]}>{item.title}</Text>
                {item.topic && (
                    <View style={styles.topicBadge}>
                        <FontAwesomeIcon icon={faBook} size={10} color={theme.colors.placeholder} />
                        <Text style={[styles.topicText, { color: theme.colors.placeholder }]}>{item.topic.name}</Text>
                    </View>
                )}
                {item.objectives && (
                    <Text style={[styles.lessonObjectives, { color: theme.colors.text }]} numberOfLines={2}>
                        {item.objectives}
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesomeIcon icon={faChevronLeft} size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Curriculum</Text>
                    <Text style={styles.headerSubtitle}>{className}</Text>
                </View>
            </LinearGradient>

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
                        </View>
                    )
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 30, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
    backButton: { marginBottom: 16 },
    headerTitleContainer: {},
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
    headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
    listContent: { padding: 20 },
    lessonTimelineItem: { flexDirection: 'row', marginBottom: 20 },
    timelineSidebar: { alignItems: 'center', width: 20, marginRight: 15 },
    timelineDot: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
    timelineLine: { width: 2, flex: 1, marginTop: -2 },
    lessonCard: { flex: 1, padding: 16, borderRadius: 20, borderWeight: 1, borderWidth: 1 },
    lessonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    lessonDate: { fontSize: 12, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    lessonTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    topicBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.03)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    topicText: { fontSize: 12, fontWeight: '600' },
    lessonObjectives: { fontSize: 14, opacity: 0.7, lineHeight: 20 },
    emptyContainer: { padding: 40, alignItems: 'center', gap: 16 },
    emptyText: { textAlign: 'center', fontSize: 16, fontWeight: '600' }
});

export default LessonPlansScreen;
