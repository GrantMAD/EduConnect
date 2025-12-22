import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faPoll, faBookOpen, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { SkeletonPiece } from './skeletons/DashboardScreenSkeleton';

export default function RecentActivity() {
    const { theme } = useTheme();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchActivity();
    }, []);

    const fetchActivity = async () => {
        try {
            // Fetch everything in parallel
            const [announcements, polls, homework, assignments] = await Promise.all([
                supabase.from('announcements').select('id, title, created_at').order('created_at', { ascending: false }).limit(4),
                supabase.from('polls').select('id, question, created_at').order('created_at', { ascending: false }).limit(4),
                supabase.from('homework').select('id, subject, description, created_at').order('created_at', { ascending: false }).limit(4),
                supabase.from('assignments').select('id, title, description, created_at').order('created_at', { ascending: false }).limit(4)
            ]);

            const allActivities = [];

            if (announcements.data) {
                announcements.data.forEach(item => {
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

            if (polls.data) {
                polls.data.forEach(item => {
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

            if (homework.data) {
                homework.data.forEach(item => {
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

            if (assignments.data) {
                assignments.data.forEach(item => {
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
                     <View key={i} style={{marginBottom: 20, flexDirection: 'row'}}>
                        <SkeletonPiece style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
                        <View style={{flex: 1}}>
                            <SkeletonPiece style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 6 }} />
                            <SkeletonPiece style={{ width: 60, height: 10, borderRadius: 4 }} />
                        </View>
                     </View>
                 ))}
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Recent Activity</Text>
            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Stay updated with the latest events.</Text>

            {activities.length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No recent activity.</Text>
            ) : (
                <View>
                    {activities.map((activity, index) => (
                        <View key={`${activity.type}-${activity.id}`} style={styles.itemContainer}>
                            {index !== 0 && (
                                <View style={[styles.line, { backgroundColor: theme.colors.border, left: 15, top: -20 }]} />
                            )}
                            <View style={styles.row}>
                                <View style={styles.iconWrapper}>
                                    <FontAwesomeIcon icon={activity.icon} size={16} color={activity.color} />
                                </View>
                                <View style={styles.content}>
                                    <Text style={[styles.activityText, { color: theme.colors.placeholder }]} numberOfLines={2}>
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
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    },
    itemContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    line: {
        position: 'absolute',
        width: 1,
        height: 20,
        zIndex: -1,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconWrapper: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        backgroundColor: 'rgba(0,0,0,0.03)',
        borderRadius: 16,
    },
    content: {
        flex: 1,
        marginTop: 6,
    },
    activityText: {
        fontSize: 13,
        marginBottom: 2,
    },
    timeText: {
        fontSize: 11,
        textAlign: 'right',
    }
});
