import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBookOpen, faChevronRight, faClock } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

const formatDate = (dateString, options = { month: 'short', day: 'numeric' }) => {
    try {
        return new Date(dateString).toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString;
    }
};

const formatTime = (dateString) => {
    try {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (e) {
        return '';
    }
};

const UpcomingLessons = ({ lessons, navigation, role }) => {
    const { theme } = useTheme();

    if (!lessons || lessons.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>Learning Timeline</Text>
                <FontAwesomeIcon icon={faBookOpen} size={16} color={theme.colors.primary} />
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {lessons.map((lesson) => (
                    <TouchableOpacity
                        key={lesson.id}
                        style={[styles.lessonCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                        onPress={() => navigation.navigate('LessonPlans', {
                            classId: lesson.class_id,
                            className: lesson.class?.name,
                            role: role
                        })}
                    >
                        <View style={[styles.dateBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={[styles.dateText, { color: theme.colors.primary }]}>
                                {formatDate(lesson.scheduled_date)}
                            </Text>
                        </View>
                        <View style={styles.lessonInfo}>
                            <Text style={[styles.classTitle, { color: theme.colors.placeholder }]}>{lesson.class?.name}</Text>
                            <Text style={[styles.lessonTitle, { color: theme.colors.text }]} numberOfLines={1}>{lesson.title}</Text>
                            <View style={styles.timeRow}>
                                <FontAwesomeIcon icon={faClock} size={10} color={theme.colors.placeholder} />
                                <Text style={[styles.timeText, { color: theme.colors.placeholder }]}>
                                    {formatTime(lesson.scheduled_date)}
                                </Text>
                            </View>
                        </View>
                        <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.cardBorder} />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
    title: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    scrollContent: { paddingRight: 20 },
    lessonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 12,
        width: 260
    },
    dateBadge: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    dateText: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
    lessonInfo: { flex: 1, marginLeft: 12 },
    classTitle: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    lessonTitle: { fontSize: 14, fontWeight: '800', marginVertical: 2 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: { fontSize: 11, fontWeight: '600' }
});

export default UpcomingLessons;
