import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faPoll, faBookOpen, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { SkeletonPiece } from './skeletons/DashboardScreenSkeleton';
import { useSchool } from '../context/SchoolContext';

// Import services
import { getRecentActivities } from '../services/dashboardService';

const RecentActivity = React.memo(() => {
    const { theme } = useTheme();
    const { schoolId } = useSchool();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (schoolId) {
            fetchActivity();
        }
    }, [schoolId]);

    const fetchActivity = async () => {
        try {
            const data = await getRecentActivities(schoolId);

            const allActivities = [];

            if (data.announcements) {
                data.announcements.forEach(item => {
                    allActivities.push({
                        id: item.id,
                        type: 'announcement',
                        text: `New announcement: ${item.title}`,
                        timestamp: new Date(item.created_at).getTime(),
                        time: new Date(item.created_at).toLocaleDateString(),
                        icon: faBullhorn,
                        color: '#6366f1' // indigo-500
                    });
                });
            }

            if (data.polls) {
                data.polls.forEach(item => {
                    allActivities.push({
                        id: item.id,
                        type: 'poll',
                        text: `New poll: ${item.question}`,
                        timestamp: new Date(item.created_at).getTime(),
                        time: new Date(item.created_at).toLocaleDateString(),
                        icon: faPoll,
                        color: '#f97316' // orange-500
                    });
                });
            }

            if (data.homework) {
                data.homework.forEach(item => {
                    allActivities.push({
                        id: item.id,
                        type: 'homework',
                        text: `New homework: ${item.subject || item.description?.substring(0, 30)}`,
                        timestamp: new Date(item.created_at).getTime(),
                        time: new Date(item.created_at).toLocaleDateString(),
                        icon: faBookOpen,
                        color: '#3b82f6' // blue-500
                    });
                });
            }

            if (data.assignments) {
                data.assignments.forEach(item => {
                    allActivities.push({
                        id: item.id,
                        type: 'assignment',
                        text: `New assignment: ${item.title || item.description?.substring(0, 30)}`,
                        timestamp: new Date(item.created_at).getTime(),
                        time: new Date(item.created_at).toLocaleDateString(),
                        icon: faClipboardList,
                        color: '#a855f7' // purple-500
                    });
                });
            }

            // Sort by most recent first and take top 4
            allActivities.sort((a, b) => b.timestamp - a.timestamp);
            setActivities(allActivities.slice(0, 4));

        } catch (error) {
            console.error('Error fetching activity:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <Text style={[styles.title, { color: theme.colors.text, marginBottom: 16 }]}>Recent Activity</Text>
                {[1, 2, 3, 4].map(i => (
                    <View key={i} style={{ marginBottom: 20, flexDirection: 'row' }}>
                        <SkeletonPiece style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <SkeletonPiece style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 6 }} />
                            <SkeletonPiece style={{ width: 60, height: 10, borderRadius: 4 }} />
                        </View>
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Recent Activity</Text>
            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Stay updated with the latest events.</Text>

            {activities.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No recent activity.</Text>
            ) : (
                <View>
                    {activities.map((activity, index) => (
                        <View key={`${activity.type}-${activity.id}`} style={styles.itemContainer}>
                            <View style={styles.timelineCol}>
                                <View style={[styles.dot, { backgroundColor: activity.color }]} />
                                {index !== activities.length - 1 && (
                                    <View style={[styles.line, { backgroundColor: theme.colors.cardBorder }]} />
                                )}
                            </View>
                            <View style={styles.contentCol}>
                                <View style={styles.activityHeader}>
                                    <Text style={[styles.activityText, { color: theme.colors.text }]} numberOfLines={2}>
                                        {activity.text}
                                    </Text>
                                    <Text style={[styles.timeText, { color: theme.colors.placeholder }]}>{activity.time}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        padding: 24,
        borderRadius: 24,
    },
    title: {
        fontSize: 17,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        minHeight: 60,
    },
    timelineCol: {
        width: 24,
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        zIndex: 1,
        marginTop: 4,
    },
    line: {
        flex: 1,
        width: 2,
        marginTop: 4,
        marginBottom: 4,
    },
    contentCol: {
        flex: 1,
        paddingLeft: 12,
        paddingBottom: 20,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    activityText: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
        paddingRight: 8,
        lineHeight: 18,
    },
    timeText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    }
});

export default RecentActivity;
