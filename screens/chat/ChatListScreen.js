import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faUser, faUsers, faChalkboard, faComments } from '@fortawesome/free-solid-svg-icons';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES } from '../../constants/GamificationStyles';

const defaultUserImage = require('../../assets/user.png');


const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

export default function ChatListScreen({ navigation }) {
    const { channels, loading, fetchChannels, user } = useChat();
    const { theme } = useTheme();

    useEffect(() => {
        fetchChannels();
    }, []);
    const getChannelDisplayInfo = (channel) => {
        if (channel.type === 'direct' && user) {
            const otherMember = channel.channel_members?.find(m => m.user_id !== user.id);
            if (otherMember?.users) {
                return {
                    name: otherMember.users.full_name,
                    avatar: otherMember.users.avatar_url,
                    icon: faUser, // Fallback icon if avatar is missing
                    equippedItem: otherMember.users.equipped_item
                };
            }
        }

        // Default for other types or if other member not found
        let icon = faUser;
        if (channel.type === 'class') icon = faChalkboard;
        if (channel.type === 'group') icon = faUsers;

        return {
            name: channel.name,
            avatar: null,
            icon: icon,
            equippedItem: null
        };
    };

    const renderItem = ({ item }) => {
        const lastMessage = item.last_message?.[0];
        const timeString = lastMessage
            ? formatTimeAgo(lastMessage.created_at)
            : formatTimeAgo(item.created_at);

        const { name, avatar, icon, equippedItem } = getChannelDisplayInfo(item);

        return (
            <TouchableOpacity
                style={[
                    styles.channelCard,
                    { backgroundColor: item.hasUnread ? theme.colors.primary + '15' : theme.colors.surface }
                ]}
                onPress={() => navigation.navigate('ChatRoom', {
                    channelId: item.id,
                    name: name,
                    avatar: avatar,
                    equippedItem: equippedItem
                })}
            >
                <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20', overflow: 'visible' }]}>
                    {avatar || equippedItem ? (
                        <AnimatedAvatarBorder
                            avatarSource={avatar ? { uri: avatar } : defaultUserImage}
                            size={50}
                            borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : {}}
                            isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                            isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                        />
                    ) : (
                        <FontAwesomeIcon icon={icon} size={24} color={theme.colors.primary} />
                    )}
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.channelName, { color: theme.colors.text }]}>{name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {item.hasUnread && (
                                <View style={{ backgroundColor: '#FF6B6B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 6 }}>
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>NEW</Text>
                                </View>
                            )}
                            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>{timeString}</Text>
                        </View>
                    </View>
                    <Text
                        style={[styles.lastMessage, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                    >
                        {lastMessage ? lastMessage.content : 'No messages yet'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading && channels.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <FlatList
                data={channels}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={{ marginBottom: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                            <FontAwesomeIcon icon={faComments} size={24} color={theme.colors.primary} style={{ marginRight: 10 }} />
                            <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.colors.text }}>
                                Messages
                            </Text>
                        </View>
                        <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>
                            View and manage your conversations
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No chats yet. Start a conversation!</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('NewChat')}
            >
                <FontAwesomeIcon icon={faPlus} size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    channelCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        alignItems: 'center',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    channelName: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    timeText: {
        fontSize: 12,
    },
    lastMessage: {
        fontSize: 14,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
});
