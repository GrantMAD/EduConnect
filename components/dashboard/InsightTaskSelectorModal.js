import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faChevronRight,
    faClipboardList,
    faBook,
    faIdCard,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

const TaskItem = ({ title, count, icon, onPress, color, theme }) => (
    <TouchableOpacity
        style={[styles.taskItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
            <FontAwesomeIcon icon={icon} size={18} color={color} />
        </View>
        <View style={styles.taskContent}>
            <Text style={[styles.taskTitle, { color: theme.colors.text }]}>{title}</Text>
            <Text style={[styles.taskCount, { color: theme.colors.placeholder }]}>{count} pending {count === 1 ? 'item' : 'items'}</Text>
        </View>
        <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.cardBorder} />
    </TouchableOpacity>
);

const InsightTaskSelectorModal = ({ isVisible, onClose, tasks, onSelect }) => {
    const { theme } = useTheme();

    if (!tasks) return null;

    const availableTasks = [
        { id: 'homework', title: 'Homework', count: tasks.homework, icon: faBook, color: '#4f46e5' },
        { id: 'assignment', title: 'Assignments', count: tasks.assignment, icon: faClipboardList, color: '#7c3aed' },
        { id: 'exams', title: 'Examinations', count: tasks.exams, icon: faIdCard, color: '#0d9488' }
    ].filter(t => t.count > 0);

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            backdropOpacity={0.5}
            style={styles.modal}
        >
            <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.swipeIndicator} />

                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Choose Task Type</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesomeIcon icon={faTimes} size={16} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>
                    You have multiple types of tasks due today. Which one would you like to view?
                </Text>

                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                    {availableTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            theme={theme}
                            {...task}
                            onPress={() => {
                                onSelect(task.id);
                                onClose();
                            }}
                        />
                    ))}
                </ScrollView>
            </View>
        </Modal>
    );
};

export default React.memo(InsightTaskSelectorModal);

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    container: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 12,
        maxHeight: '60%',
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    closeBtn: {
        padding: 8,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
    },
    list: {
        marginBottom: 24,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    taskCount: {
        fontSize: 12,
        fontWeight: '500',
    }
});
