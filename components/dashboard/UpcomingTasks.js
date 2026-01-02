import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faClipboardList,
    faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonPiece } from '../skeletons/DashboardScreenSkeleton';
import WalkthroughTarget from '../WalkthroughTarget';

const UpcomingTasks = ({ loading, upcomingTasks, navigation, style }) => {
    const { theme } = useTheme();

    const renderUpcomingTasks = () => {
        if (loading) {
            return [1, 2].map((i) => (
                <View key={i} style={[styles.taskItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <SkeletonPiece style={{ width: '100%', height: 44, borderRadius: 12 }} />
                </View>
            ));
        }

        if (!upcomingTasks || upcomingTasks.length === 0) return (
            <View style={[styles.emptyWidget, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <FontAwesomeIcon icon={faClipboardList} size={24} color={theme.colors.placeholder} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>Task list is clear. You're all caught up!</Text>
            </View>
        );

        return upcomingTasks.map((task) => {
            const dueDate = new Date(task.due_date);
            const isToday = new Date().toDateString() === dueDate.toDateString();

            return (
                <TouchableOpacity
                    key={`${task.type}-${task.id}`}
                    style={[styles.taskItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                    onPress={() => navigation.navigate(task.type === 'homework' ? 'Homework' : 'Assignments')}
                    activeOpacity={0.7}
                >
                    <View style={styles.taskIconContainer}>
                        <View style={[styles.taskTypeIcon, { backgroundColor: task.type === 'homework' ? '#3b82f615' : '#4f46e515' }]}>
                            <FontAwesomeIcon icon={faClipboardList} size={14} color={task.type === 'homework' ? '#3b82f6' : '#4f46e5'} />
                        </View>
                    </View>
                    <View style={styles.taskInfo}>
                        <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={1}>{task.title || task.subject}</Text>
                        <Text style={[styles.taskSubject, { color: theme.colors.placeholder }]}>{task.subject?.toUpperCase() || task.type?.toUpperCase()}</Text>
                    </View>
                    <View style={styles.taskDueContainer}>
                        <View style={[styles.dueBadge, { backgroundColor: isToday ? '#ef444415' : theme.colors.background }]}>
                            <Text style={[styles.taskDueDate, { color: isToday ? '#ef4444' : theme.colors.placeholder }]}>
                                {isToday ? 'TODAY' : dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            );
        });
    };

    return (
        <View style={[styles.section, style]}>
            <WalkthroughTarget id="dashboard-tasks">
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pending Tasks</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Homework')} activeOpacity={0.7}>
                        <View style={[styles.viewAllBtn, { backgroundColor: theme.colors.primary + '10' }]}>
                            <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.primary} />
                        </View>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.miniDescription, { color: theme.colors.placeholder }]}>UPCOMING DEADLINES</Text>
                {renderUpcomingTasks()}
            </WalkthroughTarget>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 32,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    viewAllBtn: {
        width: 24,
        height: 24,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniDescription: {
        fontSize: 9,
        fontWeight: '900',
        marginBottom: 16,
        letterSpacing: 1,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    taskIconContainer: {
        marginRight: 12,
    },
    taskTypeIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskInfo: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    taskSubject: {
        fontSize: 9,
        fontWeight: '900',
        marginTop: 2,
        letterSpacing: 0.5,
    },
    taskDueContainer: {
        alignItems: 'flex-end',
    },
    dueBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    taskDueDate: {
        fontSize: 9,
        fontWeight: '900',
    },
    emptyWidget: {
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 12,
        textAlign: 'center',
    },
});

export default UpcomingTasks;
