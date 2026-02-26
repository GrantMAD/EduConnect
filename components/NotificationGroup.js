import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import NotificationItem from './NotificationItem';

const NotificationGroup = ({
    group,
    theme,
    onMainPress,
    onAcceptPress,
    onDeclinePress,
    onMarkReadPress,
    onDeletePress,
    onMarkGroupAsRead,
    onDeleteGroup
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { type, items } = group;
    const unreadCount = items.filter(item => !item.is_read).length;

    const typeInfo = {
        new_homework: { icon: 'clipboard-list', color: '#FF9500', label: 'Homework' },
        new_assignment: { icon: 'file-signature', color: '#AF52DE', label: 'Assignment' },
        new_poll: { icon: 'poll', color: '#5856D6', label: 'Poll' },
        new_class_announcement: { icon: 'bullhorn', color: '#34C759', label: 'Class Update' },
        homework_submission: { icon: 'tasks', color: '#34C759', label: 'Submission' },
    };

    const info = typeInfo[type] || { icon: 'bell', color: theme.colors.primary, label: 'Notifications' };
    const firstItem = items[0];

    const getGroupTitle = () => {
        const count = items.length;
        switch (type) {
            case 'new_homework': return `${count} New Homework Tasks`;
            case 'new_assignment': return `${count} New Assignments`;
            case 'new_poll': return `${count} New Polls Available`;
            case 'new_class_announcement': return `${count} New Class Updates`;
            case 'homework_submission': return `${count} New Submissions`;
            default: return `${count} Notifications`;
        }
    };

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <TouchableOpacity
                style={[styles.header, unreadCount > 0 && { backgroundColor: `${info.color}05` }]}
                onPress={toggleExpand}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: unreadCount > 0 ? `${info.color}15` : theme.colors.background }]}>
                    <FontAwesome5 name={info.icon} size={18} color={unreadCount > 0 ? info.color : theme.colors.placeholder} />
                </View>

                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        {unreadCount > 0 && (
                            <View style={[styles.badge, { backgroundColor: info.color }]}>
                                <Text style={styles.badgeText}>{unreadCount} NEW</Text>
                            </View>
                        )}
                        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                            {getGroupTitle()}
                        </Text>
                    </View>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {firstItem.title}: {firstItem.message}
                    </Text>
                </View>

                <View style={styles.actions}>
                    {unreadCount > 0 && (
                        <TouchableOpacity onPress={onMarkGroupAsRead} style={styles.actionBtn}>
                            <FontAwesome5 name="check-double" size={14} color={theme.colors.success} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={onDeleteGroup} style={styles.actionBtn}>
                        <FontAwesome5 name="trash-alt" size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                    <View style={styles.chevron}>
                        <FontAwesome5 name={isExpanded ? 'chevron-up' : 'chevron-down'} size={12} color={theme.colors.placeholder} />
                    </View>
                </View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={[styles.expandedContent, { backgroundColor: theme.colors.background + '50' }]}>
                    {items.map(item => (
                        <NotificationItem
                            key={item.id}
                            item={item}
                            theme={theme}
                            onMainPress={onMainPress}
                            onAcceptPress={onAcceptPress}
                            onDeclinePress={onDeclinePress}
                            onMarkReadPress={onMarkReadPress}
                            onDeletePress={onDeletePress}
                            isNested={true}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginRight: 6,
    },
    badgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    actionBtn: {
        padding: 8,
    },
    chevron: {
        marginLeft: 4,
        width: 24,
        alignItems: 'center',
    },
    expandedContent: {
        padding: 12,
        paddingTop: 0,
    }
});

export default NotificationGroup;
