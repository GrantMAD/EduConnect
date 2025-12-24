import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Modal, Dimensions, ScrollView } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useGamification } from '../../context/GamificationContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faPaperclip, faImage, faArrowLeft, faUser, faEllipsisV, faArrowDown, faSearch, faThumbtack, faTimes, faPen, faBan, faReply, faSmile } from '@fortawesome/free-solid-svg-icons';
import * as ImagePicker from 'expo-image-picker';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES, BUBBLE_STYLES, STICKER_PACKS, NAME_COLOR_STYLES, TITLE_STYLES } from '../../constants/GamificationStyles';
import { supabase } from '../../lib/supabase';
import ParticipantsModal from '../../components/ParticipantsModal';
import LinkPreview from '../../components/LinkPreview';
import MessageActionModal from '../../components/MessageActionModal';
import DateHeader from '../../components/DateHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatMessagesSkeleton from '../../components/skeletons/ChatMessagesSkeleton';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const defaultUserImage = require('../../assets/user.png');

export default function ChatRoomScreen({ route, navigation }) {
    const { channelId, name, avatar, equippedItem } = route.params;
    const { messages, user, loadingMessages, fetchMessages, fetchOlderMessages, editMessage, deleteMessage, pinMessage, searchMessages, addReaction, removeReaction, sendTypingEvent, subscribeToChannel, unsubscribeFromChannel, sendMessage, uploadAttachment, markAsRead } = useChat();
    const { ownedStickerPacks } = useGamification();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [recipientLastReadAt, setRecipientLastReadAt] = useState(null);
    const [showStickerPicker, setShowStickerPicker] = useState(false);

    const [menuVisible, setMenuVisible] = useState(false);
    const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [channelType, setChannelType] = useState(null);
    const [processingAction, setProcessingAction] = useState(false);

    const [loadingMore, setLoadingMore] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);

    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const [selectedMessage, setSelectedMessage] = useState(null);
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);

    const [typingUsers, setTypingUsers] = useState({});

    const flatListRef = useRef();

    // Sticker Detection
    const allStickersList = useMemo(() => Object.values(STICKER_PACKS).flatMap(pack => pack.stickers), []);
    const availableStickers = useMemo(() => ownedStickerPacks?.flatMap(pack => STICKER_PACKS[pack.image_url]?.stickers || []) || [], [ownedStickerPacks]);

    const channelMessages = isSearching ? searchResults : (messages[channelId] || []);

    const uniqueMessages = useMemo(() => {
        const map = new Map();
        channelMessages.forEach(m => map.set(m.id, m));
        return Array.from(map.values());
    }, [channelMessages]);

    const pinnedMessages = uniqueMessages.filter(m => m.is_pinned);

    useEffect(() => {
        navigation.setOptions({ title: name });
        fetchMessages(channelId, 0);

        subscribeToChannel(channelId, (payload) => {
            if (payload.userId !== user.id) {
                setTypingUsers(prev => {
                    if (prev[payload.userId]?.timeoutId) clearTimeout(prev[payload.userId].timeoutId);
                    const timeoutId = setTimeout(() => {
                        setTypingUsers(current => {
                            const newState = { ...current };
                            delete newState[payload.userId];
                            return newState;
                        });
                    }, 3000);
                    return { ...prev, [payload.userId]: { fullName: payload.fullName, timeoutId } };
                });
            }
        });

        fetchRecipientLastReadAt();
        fetchChannelType();

        return () => {
            unsubscribeFromChannel(channelId);
        };
    }, [channelId]);

    const fetchRecipientLastReadAt = async () => {
        const { data } = await supabase.from('channel_members').select('last_read_at').eq('channel_id', channelId).neq('user_id', user.id);
        if (data && data.length === 1) setRecipientLastReadAt(data[0].last_read_at);
    };

    const fetchChannelType = async () => {
        const { data } = await supabase.from('channels').select('type').eq('id', channelId).maybeSingle();
        setChannelType(data?.type ?? null);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const content = inputText.trim();
        if (editingMessage) {
            await editMessage(editingMessage.id, content);
            setEditingMessage(null);
            setInputText('');
            return;
        }
        setInputText('');
        setReplyingTo(null);
        setSending(true);
        try {
            await sendMessage(channelId, content, [], replyingTo?.id);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } finally {
            setSending(false);
        }
    };

    const handleSendSticker = async (sticker) => {
        setShowStickerPicker(false);
        setSending(true);
        try {
            await sendMessage(channelId, sticker, []);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } finally {
            setSending(false);
        }
    };

    const handleLongPressMessage = (message) => {
        setSelectedMessage(message);
        setActionModalVisible(true);
    };

    const renderMessage = ({ item, index }) => {
        const currentMessageDate = new Date(item.created_at).toDateString();
        const nextMessage = channelMessages[index + 1];
        const nextMessageDate = nextMessage ? new Date(nextMessage.created_at).toDateString() : null;
        const showDateHeader = currentMessageDate !== nextMessageDate;

        return (
            <View>
                {showDateHeader && <DateHeader date={currentMessageDate} />}
                <TouchableOpacity onLongPress={() => handleLongPressMessage(item)} activeOpacity={0.8}>
                    <MessageBubble
                        message={item}
                        theme={theme}
                        currentUser={user}
                        recipientLastReadAt={recipientLastReadAt}
                        allStickers={allStickersList}
                        onReaction={(emoji) => {
                            const hasReacted = item.message_reactions?.some(r => r.user_id === user.id && r.emoji === emoji);
                            if (hasReacted) removeReaction(item.id, emoji);
                            else addReaction(item.id, emoji);
                        }}
                    />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Header */}
            <View style={[styles.chatHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.cardBorder, zIndex: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10, marginRight: 5 }}>
                            <FontAwesomeIcon icon={faArrowLeft} size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <AnimatedAvatarBorder
                            avatarSource={avatar ? { uri: avatar } : defaultUserImage}
                            size={32}
                            borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : {}}
                            isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                            isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                        />
                        <Text style={[styles.chatHeaderTitle, { color: theme.colors.text, marginLeft: 10 }]} numberOfLines={1}>{name}</Text>
                    </View>
                    <TouchableOpacity style={{ padding: 10 }} onPress={() => setIsSearching(!isSearching)}>
                        <FontAwesomeIcon icon={isSearching ? faTimes : faSearch} size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={uniqueMessages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                inverted
                onEndReached={() => hasMoreMessages && fetchOlderMessages(channelId)}
            />

            {/* Sticker Picker */}
            {showStickerPicker && (
                <View style={[styles.stickerPicker, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={styles.stickerPickerHeader}>
                        <Text style={[styles.stickerPickerTitle, { color: theme.colors.textSecondary }]}>YOUR STICKERS</Text>
                        <TouchableOpacity onPress={() => setShowStickerPicker(false)}>
                            <FontAwesomeIcon icon={faTimes} size={16} color={theme.colors.placeholder} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.stickerGrid}>
                            {availableStickers.map((sticker, i) => (
                                <TouchableOpacity key={i} onPress={() => handleSendSticker(sticker)} style={styles.stickerItem}>
                                    <Text style={{ fontSize: 32 }}>{sticker}</Text>
                                </TouchableOpacity>
                            ))}
                            {availableStickers.length === 0 && (
                                <Text style={{ color: theme.colors.placeholder, fontStyle: 'italic' }}>No sticker packs unlocked.</Text>
                            )}
                        </View>
                    </ScrollView>
                </View>
            )}

            {/* Input */}
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
                <TouchableOpacity onPress={() => setShowStickerPicker(!showStickerPicker)} style={styles.attachButton}>
                    <Text style={{ fontSize: 20 }}>✨</Text>
                </TouchableOpacity>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                    placeholder="Type a message..."
                    value={inputText}
                    onChangeText={(text) => { setInputText(text); sendTypingEvent(channelId); }}
                    multiline
                />
                <TouchableOpacity onPress={handleSend} style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}>
                    <FontAwesomeIcon icon={faPaperPlane} size={16} color="#fff" />
                </TouchableOpacity>
            </View>

            <MessageActionModal
                visible={actionModalVisible}
                onClose={() => setActionModalVisible(false)}
                message={selectedMessage}
                isMyMessage={selectedMessage?.sender_id === user?.id}
                onEdit={(msg) => {
                    setEditingMessage(msg);
                    setInputText(msg.content);
                }}
                onDelete={(msg) => deleteMessage(msg.id)}
                onPin={(msg) => pinMessage(msg.id, !msg.is_pinned)}
                onReply={(msg) => setReplyingTo(msg)}
                onReaction={(emoji) => {
                    const hasReacted = selectedMessage?.message_reactions?.some(r => r.user_id === user.id && r.emoji === emoji);
                    if (hasReacted) removeReaction(selectedMessage.id, emoji);
                    else addReaction(selectedMessage.id, emoji);
                }}
                isAdmin={true}
            />
        </KeyboardAvoidingView>
    );
}

const MessageBubble = ({ message, theme, currentUser, recipientLastReadAt, allStickers, onReaction }) => {
    if (message.is_system_message) return null;

    const isMe = currentUser?.id === message.sender_id;
    const isSticker = !message.attachments?.length && allStickers.includes(message.content);
    
    const equipped = message.sender?.equippedItems || {};
    const nameStyle = equipped.nameColor ? NAME_COLOR_STYLES[equipped.nameColor.image_url] : null;
    const titleStyle = equipped.title ? TITLE_STYLES[equipped.title.image_url] : null;
    const bubbleStyle = equipped.bubbleStyle ? BUBBLE_STYLES[equipped.bubbleStyle.image_url] : null;

    const renderBubbleContent = () => {
        if (isSticker) {
            return <Text style={{ fontSize: 64, paddingVertical: 10 }}>{message.content}</Text>;
        }

        const bubbleBody = (
            <View style={[
                styles.bubble,
                { backgroundColor: isMe ? theme.colors.primary : theme.colors.surface },
                bubbleStyle && { backgroundColor: bubbleStyle.backgroundColor, borderColor: bubbleStyle.borderColor, borderWidth: bubbleStyle.borderWidth, borderRadius: bubbleStyle.borderRadius }
            ]}>
                {message.attachments?.length > 0 && (
                    <Image source={{ uri: message.attachments[0].url }} style={styles.attachmentImage} />
                )}
                <Text style={[{ color: isMe ? '#fff' : theme.colors.text, fontSize: 16 }, bubbleStyle && { color: bubbleStyle.textColor }]}>
                    {message.content}
                </Text>
            </View>
        );

        if (bubbleStyle?.gradient) {
            return (
                <LinearGradient 
                    colors={bubbleStyle.gradient} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 0}} 
                    style={[styles.bubble, bubbleStyle.borderRadius && { borderRadius: bubbleStyle.borderRadius }]}
                >
                    <Text style={{ color: bubbleStyle.textColor || '#fff', fontSize: 16 }}>{message.content}</Text>
                </LinearGradient>
            );
        }

        return bubbleBody;
    };

    return (
        <View style={[styles.bubbleContainer, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
            {!isMe && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    <Text style={[styles.senderName, nameStyle?.style]}>{message.sender?.full_name || 'Unknown'}</Text>
                    {titleStyle && (
                        <View style={[styles.titleTag, { backgroundColor: titleStyle.colors.bg }]}>
                            <Text style={[styles.titleTagText, { color: titleStyle.colors.text }]}>{titleStyle.label}</Text>
                        </View>
                    )}
                </View>
            )}
            {renderBubbleContent()}
            <Text style={styles.timestamp}>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    chatHeader: { paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1 },
    chatHeaderTitle: { fontSize: 18, fontWeight: 'bold' },
    listContent: { padding: 16 },
    inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'center' },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 10, maxHeight: 100 },
    attachButton: { padding: 5 },
    sendButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    stickerPicker: { padding: 15, borderTopWidth: 1, height: 120 },
    stickerPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    stickerPickerTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    stickerGrid: { flexDirection: 'row', gap: 15 },
    stickerItem: { padding: 5 },
    bubbleContainer: { marginBottom: 15, maxWidth: '85%' },
    bubble: { borderRadius: 18, padding: 12, elevation: 1 },
    senderName: { fontSize: 12, fontWeight: 'bold' },
    timestamp: { fontSize: 9, color: '#999', marginTop: 4, alignSelf: 'flex-end' },
    attachmentImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 8 },
    titleTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    titleTagText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }
});
