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

const UpcomingTasks = ({ loading, upcomingTasks, navigation }) => {
    const { theme } = useTheme();

    const renderUpcomingTasks = () => {
        if (loading) {
            return [1, 2].map((i) => (
                <View key={i} style={[styles.taskItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                    <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
                </View>
            ));
        }

        if (upcomingTasks.length === 0) return (
            <View style={[styles.emptyWidget, { backgroundColor: theme.colors.card }]}>
                <FontAwesomeIcon icon={faClipboardList} size={24} color={theme.colors.placeholder} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>All caught up! No tasks due soon.</Text>
            </View>
        );

        return upcomingTasks.map((task) => {
            const dueDate = new Date(task.due_date);
            const isToday = new Date().toDateString() === dueDate.toDateString();

            return (
                <TouchableOpacity
                    key={`${task.type}-${task.id}`}
                    style={[styles.taskItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                    onPress={() => navigation.navigate(task.type === 'homework' ? 'Homework' : 'Assignments')}
                >
                    <View style={styles.taskIconContainer}>
                        <View style={[styles.taskTypeIcon, { backgroundColor: task.type === 'homework' ? '#007AFF20' : '#5856D620' }]}>
                            <FontAwesomeIcon icon={faClipboardList} size={16} color={task.type === 'homework' ? '#007AFF' : '#5856D6'} />
                        </View>
                    </View>
                    <View style={styles.taskInfo}>
                        <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={1}>{task.title || task.subject}</Text>
                        <Text style={[styles.taskSubject, { color: theme.colors.placeholder }]}>{task.subject || task.type}</Text>
                    </View>
                    <View style={styles.taskDueContainer}>
                        <Text style={[styles.taskDueDate, { color: isToday ? '#FF9500' : theme.colors.placeholder }]}>
                            {isToday ? 'Today' : dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        });
    };

    return (
        <View style={styles.section}>
            <WalkthroughTarget id="dashboard-tasks">
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Due Soon</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Homework')}>
                        <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.miniDescription, { color: theme.colors.placeholder }]}>Upcoming tasks.</Text>
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
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    miniDescription: {
        fontSize: 11,
        marginBottom: 12,
        marginTop: -8,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    taskIconContainer: {
        marginRight: 8,
    },
    taskTypeIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskInfo: {
        flex: 1,
        marginLeft: 8,
    },
    taskTitle: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    taskSubject: {
        fontSize: 10,
    },
    taskDueContainer: {
        alignItems: 'flex-end',
    },
    taskDueDate: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyWidget: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    emptyText: {
        fontSize: 10,
        marginTop: 8,
        textAlign: 'center',
    },
});

export default UpcomingTasks;
