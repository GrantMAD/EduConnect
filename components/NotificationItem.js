import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

const NotificationItem = React.memo(({ item, theme, onMainPress, onAcceptPress, onDeclinePress, onMarkReadPress, onDeletePress, isNested = false }) => {
    const isUnread = !item.is_read;

    const typeInfo = {
        new_general_announcement: { icon: 'bullhorn', color: '#007AFF', label: 'Announcement' },
        new_class_announcement: { icon: 'bullhorn', color: '#34C759', label: 'Class Update' },
        new_homework: { icon: 'clipboard-list', color: '#FF9500', label: 'Homework' },
        new_assignment: { icon: 'file-signature', color: '#AF52DE', label: 'Assignment' },
        new_poll: { icon: 'poll', color: '#5856D6', label: 'Poll' },
        new_ptm_booking: { icon: 'handshake', color: '#FF2D55', label: 'PTM' },
        ptm_cancellation: { icon: 'handshake-slash', color: '#FF3B30', label: 'PTM Cancel' },
        school_join_request: { icon: 'school', color: '#007AFF', label: 'Join Request' },
        parent_child_request: { icon: 'user-friends', color: '#5AC8FA', label: 'Association' },
        parent_welcome: { icon: 'user-plus', color: '#34C759', label: 'Welcome' },
        added_to_club: { icon: 'users', color: '#AF52DE', label: 'Club' },
    };

    const info = typeInfo[item.type] || { icon: 'bell', color: theme.colors.primary, label: 'Notification' };

    const isPressable = [
        'new_general_announcement',
        'new_class_announcement',
        'new_homework',
        'new_assignment',
        'new_poll',
        'new_ptm_booking',
        'ptm_cancellation',
        'added_to_club',
        'club_join_request',
        'club_join_accepted',
        'parent_child_request',
        'parent_welcome',
        'exam_schedule'
    ].includes(item.type);

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: theme.colors.cardBackground,
                    borderColor: theme.colors.cardBorder,
                    borderWidth: 1,
                    borderLeftColor: isUnread && !isNested ? info.color : theme.colors.cardBorder,
                    borderLeftWidth: !isNested ? 4 : 1
                },
                isNested && { marginBottom: 8, elevation: 0, padding: 12 }
            ]}
        >
            <TouchableOpacity
                style={[styles.cardMain, isNested && { padding: 0 }]}
                onPress={() => onMainPress(item)}
                disabled={!isPressable}
            >
                <View style={[styles.iconContainer, { backgroundColor: isUnread ? `${info.color}15` : theme.colors.background }, isNested && { width: 32, height: 32 }]}>
                    <FontAwesome5 name={info.icon} size={isNested ? 14 : 18} color={isUnread ? info.color : theme.colors.placeholder} />
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.typeHeader}>
                        <Text style={[styles.typeLabel, { color: isUnread ? info.color : theme.colors.placeholder }, isNested && { fontSize: 8 }]}>{info.label}</Text>
                        {isUnread && <View style={[styles.unreadDot, { backgroundColor: info.color }]} />}
                    </View>
                    <Text style={[styles.title, { color: theme.colors.text }, isUnread && { fontWeight: 'bold' }, isNested && { fontSize: 13 }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.message, { color: theme.colors.textSecondary }, isNested && { fontSize: 12 }]} numberOfLines={isNested ? 1 : 2}>{item.message}</Text>
                    <Text style={[styles.date, { color: theme.colors.placeholder }, isNested && { fontSize: 10 }]}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>

                    {(item.type === 'school_join_request' || item.type === 'parent_child_request') && isUnread && !isNested && (
                        <View style={styles.buttonsRow}>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                                onPress={() => onAcceptPress(item)}
                            >
                                <Text style={[styles.buttonText, { color: '#fff' }]}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, { backgroundColor: theme.colors.error }]}
                                onPress={() => onDeclinePress(item)}
                            >
                                <Text style={[styles.buttonText, { color: '#fff' }]}>Decline</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            <View style={styles.actionsContainer}>
                {isUnread && (
                    <TouchableOpacity onPress={() => onMarkReadPress(item.id)} style={styles.actionButton}>
                        <FontAwesome5 name="check-circle" size={isNested ? 14 : 16} color={theme.colors.success} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => onDeletePress(item.id)} style={styles.actionButton}>
                    <FontAwesome5 name="trash-alt" size={isNested ? 14 : 16} color={theme.colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default NotificationItem;

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        overflow: 'hidden',
        elevation: 0,
    },
    cardMain: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: { flex: 1 },
    typeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    typeLabel: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    unreadDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    title: { fontSize: 15, marginBottom: 4 },
    message: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
    date: { fontSize: 11, fontWeight: '600' },
    buttonsRow: { flexDirection: 'row', marginTop: 12 },
    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginRight: 10
    },
    buttonText: { fontWeight: '700', fontSize: 12 },
    actionsContainer: {
        width: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0,0,0,0.05)',
    },
    actionButton: {
        padding: 8,
    },
});
