import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faUser, faUsers, faChalkboard, faComments, faImage, faFile, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES } from '../../constants/GamificationStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatListItemSkeleton } from '../../components/skeletons/ChatListScreenSkeleton';
import LinearGradient from 'react-native-linear-gradient';
import { getAvatarUrl } from '../../lib/utils';

const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
};

const ChatListScreen = ({ navigation }) => {
    const { channels, loading, fetchChannels, user } = useChat();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    useFocusEffect(
        useCallback(() => {
            fetchChannels();
        }, [fetchChannels])
    );

    const getChannelDisplayInfo = useCallback((channel) => {
        if (channel.type === 'direct' && user) {
            const otherMember = channel.channel_members?.find(m => m.user_id !== user.id);
            if (otherMember?.users) {
                return {
                    name: otherMember.users.full_name,
                    avatar: getAvatarUrl(otherMember.users.avatar_url, otherMember.users.email, otherMember.users.id),
                    icon: faUser, 
                    equippedItem: otherMember.users.equipped_item
                };
            }
        }

        let icon = faUser;
        if (channel.type === 'class') icon = faChalkboard;
        if (channel.type === 'group') icon = faUsers;

        return {
            name: channel.name,
            avatar: getAvatarUrl(null, null, channel.id),
            icon: icon,
            equippedItem: null
        };
    }, [user]);

    const renderItem = useCallback(({ item }) => {
        const lastMessage = item.last_message?.[0];
        const timeString = lastMessage
            ? formatTimeAgo(lastMessage.created_at)
            : formatTimeAgo(item.created_at);

        const { name, avatar, icon, equippedItem } = getChannelDisplayInfo(item);

        const renderLastMessageContent = () => {
            if (!lastMessage) return <Text style={[styles.lastMessage, { color: theme.colors.placeholder }]}>No messages yet</Text>;

            if (lastMessage.attachments && lastMessage.attachments.length > 0) {
                const attachment = lastMessage.attachments[0];
                const isImage = attachment.type === 'image';
                return (
                    <View style={styles.attachmentPreview}>
                        <FontAwesomeIcon 
                            icon={isImage ? faImage : faFile} 
                            size={12} 
                            color={theme.colors.primary} 
                            style={{ marginRight: 4 }}
                        />
                        <Text
                            style={[styles.lastMessage, { color: theme.colors.placeholder, flex: 1 }]}
                            numberOfLines={1}
                        >
                            {lastMessage.content || (isImage ? 'Image' : 'File')}
                        </Text>
                    </View>
                );
            }

            return (
                <Text
                    style={[styles.lastMessage, { color: theme.colors.placeholder }]}
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
                        backgroundColor: item.hasUnread ? theme.colors.primary + '08' : theme.colors.card,
                        borderColor: theme.colors.cardBorder,
                        borderWidth: 1
                    }
                ]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ChatRoom', {
                    channelId: item.id,
                    name: name,
                    avatar: avatar,
                    equippedItem: equippedItem
                })}
            >
                <View style={styles.avatarContainer}>
                    {avatar || equippedItem ? (
                        <AnimatedAvatarBorder
                            avatarSource={avatar}
                            size={54}
                            borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : {}}
                            isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                            isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                        />
                    ) : (
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                            <FontAwesomeIcon icon={icon} size={22} color={theme.colors.primary} />
                        </View>
                    )}
                    {item.hasUnread && <View style={styles.unreadBadge} />}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.channelName, { color: theme.colors.text }]} numberOfLines={1}>{name}</Text>
                        <Text style={[styles.timeText, { color: theme.colors.placeholder }]}>{timeString}</Text>
                    </View>
                    <View style={styles.footerRow}>
                        {renderLastMessageContent()}
                        {item.hasUnread && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                            </View>
                        )}
                        <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.cardBorder} style={{ marginLeft: 8 }} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [theme, navigation, getChannelDisplayInfo]);

    const uniqueChannels = useMemo(() => {
        const map = new Map();
        channels.forEach(c => map.set(c.id, c));
        return Array.from(map.values());
    }, [channels]);

    const navigateToNewChat = useCallback(() => navigation.navigate('NewChat'), [navigation]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroContainer}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>Messages</Text>
                        <Text style={styles.heroDescription}>
                            Connect with your school community.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.heroButton}
                        onPress={navigateToNewChat}
                    >
                        <FontAwesomeIcon icon={faPlus} size={14} color="#4f46e5" />
                        <Text style={styles.heroButtonText}>New</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <FlatList
                data={loading ? [1, 2, 3, 4, 5] : uniqueChannels}
                keyExtractor={item => typeof item === 'number' ? item.toString() : item.id}
                renderItem={loading ? () => <ChatListItemSkeleton /> : renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: 80 + insets.bottom }]}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.cardBackground }]}>
                                <FontAwesomeIcon icon={faComments} size={30} color={theme.colors.placeholder} />
                            </View>
                            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No messages yet</Text>
                            <Text style={[styles.emptySubtext, { color: theme.colors.placeholder }]}>Start a conversation with your classmates!</Text>
                        </View>
                    )
                }
                removeClippedSubviews={true}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={5}
            />
        </View>
    );
}

export default React.memo(ChatListScreen);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heroContainer: {
        padding: 20,
        marginBottom: 0,
        elevation: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 6,
    },
    heroDescription: {
        color: '#e0e7ff',
        fontSize: 14,
    },
    heroButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    heroButtonText: {
        color: '#4f46e5',
        fontWeight: 'bold',
        marginLeft: 6,
        fontSize: 14,
    },
    listContent: {
        padding: 16,
    },
    channelCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    iconBox: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#4f46e5',
        borderWidth: 2,
        borderColor: '#fff',
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
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 13,
        flex: 1,
    },
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    newBadge: {
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    newBadgeText: {
        color: '#4f46e5',
        fontSize: 9,
        fontWeight: '900',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
    }
});