import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faUser, faUsers, faChalkboard, faComments, faImage, faFile } from '@fortawesome/free-solid-svg-icons';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES } from '../../constants/GamificationStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatListItemSkeleton } from '../../components/skeletons/ChatListScreenSkeleton';

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
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            fetchChannels();
        }, [])
    );

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

        const renderLastMessageContent = () => {
            if (!lastMessage) return <Text style={[styles.lastMessage, { color: theme.colors.textSecondary }]}>No messages yet</Text>;

            if (lastMessage.attachments && lastMessage.attachments.length > 0) {
                const attachment = lastMessage.attachments[0];
                const isImage = attachment.type === 'image';
                return (
                    <View style={styles.attachmentPreview}>
                        <FontAwesomeIcon 
                            icon={isImage ? faImage : faFile} 
                            size={14} 
                            color={theme.colors.primary} 
                            style={{ marginRight: 4 }}
                        />
                        <Text
                            style={[styles.lastMessage, { color: theme.colors.textSecondary, flex: 1 }]}
                            numberOfLines={1}
                        >
                            {lastMessage.content || attachment.name}
                        </Text>
                    </View>
                );
            }

            return (
                <Text
                    style={[styles.lastMessage, { color: theme.colors.textSecondary }]}
                    numberOfLines={1}
                >
                    {lastMessage.content}
                </Text>
            );
        };

        return (
            <TouchableOpacity
                style={[
                    styles.channelCard,
                    {
                        backgroundColor: item.hasUnread ? theme.colors.primary + '15' : theme.colors.surface,
                        elevation: item.hasUnread ? 0 : 3,
                        shadowOpacity: item.hasUnread ? 0 : 0.15,
                    }
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
                    {renderLastMessageContent()}
                </View>
            </TouchableOpacity>
        );
    };
    const uniqueChannels = useMemo(() => {
        const map = new Map();
        channels.forEach(c => map.set(c.id, c));
        return Array.from(map.values());
    }, [channels]);



    return (
        <View style={[styles.container, { backgroundColor: theme.dark ? theme.colors.background : '#F5F5F5' }]}>
            <FlatList
                data={loading ? [1, 2, 3, 4, 5] : uniqueChannels}
                keyExtractor={item => typeof item === 'number' ? item.toString() : item.id}
                renderItem={loading ? () => <ChatListItemSkeleton /> : renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: 80 + insets.bottom }]}
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
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No chats yet. Start a conversation!</Text>
                        </View>
                    )
                }
                removeClippedSubviews={true}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={5}
            />

            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: 20 + insets.bottom }]}
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
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
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
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
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
