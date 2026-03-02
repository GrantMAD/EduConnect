import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faUser, faUsers, faChalkboard, faComments, faImage, faFile, faChevronRight, faSearch } from '@fortawesome/free-solid-svg-icons';
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
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    
    // Format as date
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const ChatListScreen = ({ navigation }) => {
    const { channels, loading, fetchChannels, user } = useChat();
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = React.useState('All');
    const [searchQuery, setSearchQuery] = React.useState('');

    useFocusEffect(
        useCallback(() => {
            fetchChannels();
        }, [fetchChannels])
    );

    const filteredChannels = useMemo(() => {
        // First deduplicate
        const map = new Map();
        channels.forEach(c => map.set(c.id, c));
        let list = Array.from(map.values());

        // Tab Filter
        if (activeTab === 'Unread') list = list.filter(c => c.hasUnread);
        if (activeTab === 'Direct') list = list.filter(c => c.type === 'direct');
        if (activeTab === 'Groups') list = list.filter(c => c.type === 'group' || c.type === 'class');

        // Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(c => {
                const name = c.type === 'direct' 
                    ? c.channel_members?.find(m => m.user_id !== user?.id)?.users?.full_name?.toLowerCase() 
                    : c.name?.toLowerCase();
                const lastMsg = c.last_message?.[0]?.content?.toLowerCase();
                return name?.includes(query) || lastMsg?.includes(query);
            });
        }

        return list;
    }, [channels, activeTab, searchQuery, user?.id]);

    const getChannelDisplayInfo = useCallback((channel) => {
        if (channel.type === 'direct' && user) {
            const otherMember = channel.channel_members?.find(m => m.user_id !== user.id);
            if (otherMember?.users) {
                // Check if user has been active in the last 5 minutes
                const isOnline = otherMember.last_read_at && 
                               (new Date() - new Date(otherMember.last_read_at) < 5 * 60 * 1000);

                return {
                    name: otherMember.users.full_name,
                    avatar: getAvatarUrl(otherMember.users.avatar_url, otherMember.users.email, otherMember.users.id),
                    icon: faUser, 
                    equippedItem: otherMember.users.equipped_item,
                    isOnline
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
            equippedItem: null,
            isOnline: false
        };
    }, [user]);

    const renderItem = useCallback(({ item, index }) => {
        const lastMessage = item.last_message?.[0];
        const timeString = lastMessage
            ? formatTimeAgo(lastMessage.created_at)
            : formatTimeAgo(item.created_at);

        const { name, avatar, icon, equippedItem, isOnline } = getChannelDisplayInfo(item);

        const renderLastMessageContent = () => {
            if (!lastMessage) return <Text style={[styles.lastMessage, { color: theme.colors.placeholder }]}>No messages yet</Text>;

            const prefix = lastMessage.sender_id === user?.id ? 'You: ' : '';

            if (lastMessage.attachments && lastMessage.attachments.length > 0) {
                const attachment = lastMessage.attachments[0];
                const isImage = attachment.type === 'image';
                return (
                    <View style={styles.attachmentPreview}>
                        <Text style={[styles.lastMessage, { color: theme.colors.placeholder, marginRight: 4 }]}>{prefix}</Text>
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
                    style={[styles.lastMessage, { color: item.hasUnread ? theme.colors.text : theme.colors.placeholder, fontWeight: item.hasUnread ? '700' : '500' }]}
                    numberOfLines={1}
                >
                    {prefix}{lastMessage.content}
                </Text>
            );
        };

        return (
            <TouchableOpacity
                style={[
                    styles.channelCard,
                    {
                        backgroundColor: item.hasUnread ? theme.colors.primary + '08' : theme.colors.card,
                        borderColor: item.hasUnread ? theme.colors.primary + '20' : theme.colors.cardBorder,
                        borderLeftWidth: item.hasUnread ? 4 : 1,
                        borderLeftColor: item.hasUnread ? theme.colors.primary : theme.colors.cardBorder
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
                    <AnimatedAvatarBorder
                        avatarSource={avatar}
                        size={56}
                        borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : {}}
                        isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                        isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                    />
                    {isOnline && <View style={[styles.onlineIndicator, { borderColor: theme.colors.card }]} />}
                    {item.hasUnread && (
                        <View style={[styles.unreadBadge, { borderColor: theme.colors.card }]}>
                            <View style={styles.unreadBadgeInner} />
                        </View>
                    )}
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.channelName, { color: theme.colors.text }]} numberOfLines={1}>{name}</Text>
                        <Text style={[styles.timeText, { color: theme.colors.placeholder }]}>{timeString}</Text>
                    </View>
                    <View style={styles.footerRow}>
                        {renderLastMessageContent()}
                        <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.cardBorder} style={{ marginLeft: 8 }} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    }, [theme, navigation, getChannelDisplayInfo, user?.id]);

    const navigateToNewChat = useCallback(() => navigation.navigate('NewChat'), [navigation]);

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <FlatList
                horizontal
                data={['All', 'Unread', 'Direct', 'Groups']}
                keyExtractor={item => item}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => {
                    const isActive = activeTab === item;
                    return (
                        <TouchableOpacity
                            onPress={() => setActiveTab(item)}
                            style={[
                                styles.tabButton,
                                { backgroundColor: isActive ? theme.colors.primary : theme.colors.card },
                                isActive && styles.tabButtonActive
                            ]}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: isActive ? '#fff' : theme.colors.placeholder }
                            ]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    );
                }}
                contentContainerStyle={styles.tabListContent}
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#4f46e5', '#7c3aed', '#6366f1']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <View style={styles.heroLabelContainer}>
                            <FontAwesomeIcon icon={faComments} size={10} color="#e0e7ff" />
                            <Text style={styles.heroLabel}>COMMUNICATION HUB</Text>
                        </View>
                        <Text style={styles.heroTitle}>Messages</Text>
                        <Text style={styles.heroDescription}>
                            Connect with your school community instantly.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.heroButton}
                        onPress={navigateToNewChat}
                    >
                        <View style={styles.heroButtonIcon}>
                            <FontAwesomeIcon icon={faPlus} size={12} color="#fff" />
                        </View>
                        <Text style={styles.heroButtonText}>New</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={[styles.searchWrapper, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} />
                    <TextInput
                        placeholder="Search conversations..."
                        placeholderTextColor={theme.colors.placeholder}
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {renderTabs()}

            <FlatList
                data={loading ? [1, 2, 3, 4, 5] : filteredChannels}
                keyExtractor={item => typeof item === 'number' ? item.toString() : item.id}
                renderItem={loading ? () => <ChatListItemSkeleton /> : renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: 20 + insets.bottom }]}
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.cardBackground }]}>
                                <FontAwesomeIcon icon={faComments} size={30} color={theme.colors.placeholder} />
                            </View>
                            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No messages yet</Text>
                            <Text style={[styles.emptySubtext, { color: theme.colors.placeholder }]}>
                                {searchQuery ? "No chats match your search query." : "Start a conversation with your classmates!"}
                            </Text>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heroContainer: {
        padding: 24,
        paddingBottom: 32,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
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
    heroLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        marginBottom: 8,
        gap: 6,
    },
    heroLabel: {
        color: '#e0e7ff',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    heroDescription: {
        color: '#e0e7ff',
        fontSize: 15,
        fontWeight: '500',
        opacity: 0.9,
    },
    heroButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    heroButtonIcon: {
        backgroundColor: '#4f46e5',
        width: 22,
        height: 22,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    heroButtonText: {
        color: '#4f46e5',
        fontWeight: '900',
        fontSize: 14,
        textTransform: 'uppercase',
    },
    searchWrapper: {
        paddingHorizontal: 20,
        marginTop: 20,
        zIndex: 10,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        fontWeight: '600',
    },
    tabContainer: {
        marginTop: 16,
        marginBottom: 8,
    },
    tabListContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    tabButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabButtonActive: {
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '800',
    },
    listContent: {
        padding: 16,
    },
    channelCard: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#10b981',
        borderWidth: 2,
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    unreadBadgeInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4f46e5',
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
        fontWeight: '800',
        flex: 1,
        marginRight: 8,
    },
    timeText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    lastMessage: {
        fontSize: 13,
    },
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
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
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.6,
    }
});

export default React.memo(ChatListScreen);
