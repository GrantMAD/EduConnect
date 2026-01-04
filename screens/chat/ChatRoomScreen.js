import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Modal, Dimensions, ScrollView } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useGamification } from '../../context/GamificationContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faPaperclip, faImage, faArrowLeft, faUser, faEllipsisV, faArrowDown, faSearch, faThumbtack, faTimes, faPen, faBan, faReply, faSmile, faPlus, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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

const MessageBubble = React.memo(({ message, theme, currentUser, recipientLastReadAt, allStickers, onReaction }) => {
    if (message.is_system_message) return null;

    const isMe = currentUser?.id === message.sender_id;
    const isSticker = !message.attachments?.length && allStickers.includes(message.content);

    const equipped = message.sender?.equippedItems || {};
    const nameStyle = equipped.nameColor ? NAME_COLOR_STYLES[equipped.nameColor.image_url] : null;
    const titleStyle = equipped.title ? TITLE_STYLES[equipped.title.image_url] : null;
    const bubbleStyle = equipped.bubbleStyle ? BUBBLE_STYLES[equipped.bubbleStyle.image_url] : null;

    const reactions = message.message_reactions || [];
    const reactionCounts = reactions.reduce((acc, curr) => {
        acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
        return acc;
    }, {});
    const myReactions = new Set(reactions.filter(r => r.user_id === currentUser.id).map(r => r.emoji));

    const isPending = message.id.toString().startsWith('temp-');
    let statusText = null;
    let statusColor = theme.colors.placeholder;

    if (isMe) {
        if (isPending) {
            statusText = "Sending...";
        } else if (recipientLastReadAt && message.created_at <= recipientLastReadAt) {
            statusText = "Read";
            statusColor = theme.colors.primary;
        } else {
            statusText = "Unread";
        }
    }

    const renderAttachment = () => {
        if (!message.attachments?.length) return null;
        const attachment = message.attachments[0];
        const isImage = attachment.type === 'image' || (attachment.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name));

        if (isImage) {
            return <Image source={{ uri: attachment.url }} style={styles.attachmentImage} />;
        }

        return (
            <TouchableOpacity style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.05)',
                padding: 12,
                borderRadius: 12,
                marginBottom: 8
            }}>
                <View style={{ width: 36, height: 36, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                    <FontAwesomeIcon icon={faPaperclip} size={16} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: isMe ? '#fff' : theme.colors.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
                        {attachment.name || 'Attachment'}
                    </Text>
                    <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : theme.colors.placeholder, fontSize: 10, fontWeight: '600' }}>
                        DOWNLOAD
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderBubbleContent = () => {
        if (isSticker) {
            return <Text style={{ fontSize: 64, paddingVertical: 10 }}>{message.content}</Text>;
        }

        const bubbleBody = (
            <View style={[
                styles.bubble,
                { backgroundColor: isMe ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: isMe ? 0 : 1 },
                bubbleStyle && { backgroundColor: bubbleStyle.backgroundColor, borderColor: bubbleStyle.borderColor, borderWidth: bubbleStyle.borderWidth, borderRadius: bubbleStyle.borderRadius }
            ]}>
                {renderAttachment()}
                {message.content ? (
                    <Text style={[{ color: isMe ? '#fff' : theme.colors.text, fontSize: 15, lineHeight: 20 }, bubbleStyle && { color: bubbleStyle.textColor }]}>
                        {message.content}
                    </Text>
                ) : null}
            </View>
        );

        if (bubbleStyle?.gradient) {
            return (
                <LinearGradient
                    colors={bubbleStyle.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.bubble, { borderRadius: bubbleStyle.borderRadius || 18 }]}
                >
                    {renderAttachment()}
                    {message.content ? <Text style={{ color: bubbleStyle.textColor || '#fff', fontSize: 15, lineHeight: 20 }}>{message.content}</Text> : null}
                </LinearGradient>
            );
        }

        return bubbleBody;
    };

    return (
        <View style={[styles.bubbleContainer, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }, { marginBottom: Object.keys(reactionCounts).length > 0 ? 24 : 16 }]}>
            {!isMe && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 }}>
                    <Text style={[styles.senderName, { color: theme.colors.placeholder }, nameStyle?.style]}>{message.sender?.full_name || 'Unknown'}</Text>
                    {titleStyle && (
                        <View style={[styles.titleTag, { backgroundColor: titleStyle.colors.bg }]}>
                            <Text style={[styles.titleTagText, { color: titleStyle.colors.text }]}>{titleStyle.label}</Text>
                        </View>
                    )}
                </View>
            )}

            <View>
                {renderBubbleContent()}

                {Object.keys(reactionCounts).length > 0 && (
                    <View style={styles.reactionsRow}>
                        {Object.entries(reactionCounts).map(([emoji, count]) => {
                            const iReacted = myReactions.has(emoji);
                            return (
                                <TouchableOpacity
                                    key={emoji}
                                    onPress={() => onReaction(emoji)}
                                    style={[styles.reactionBadge, {
                                        backgroundColor: iReacted ? theme.colors.primary : theme.colors.surface,
                                        borderColor: theme.colors.cardBorder,
                                    }]}
                                >
                                    <Text style={{ fontSize: 10, color: iReacted ? '#fff' : theme.colors.text }}>
                                        {emoji} {count > 1 ? count : ''}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>

            <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                alignSelf: 'flex-end', 
                gap: 6, 
                marginTop: Object.keys(reactionCounts).length > 0 ? 12 : 4 
            }}>
                {isMe && statusText && (
                    <Text style={{ fontSize: 9, fontWeight: '800', color: statusColor, textTransform: 'uppercase' }}>
                        {statusText}
                    </Text>
                )}
                <Text style={[styles.timestamp, { color: theme.colors.placeholder, marginTop: 0 }]}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );
});

const ChatRoomScreen = ({ route, navigation }) => {
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
    const [attachment, setAttachment] = useState(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

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

    const allStickersList = useMemo(() => Object.values(STICKER_PACKS).flatMap(pack => pack.stickers), []);
    const availableStickers = useMemo(() => ownedStickerPacks?.flatMap(pack => STICKER_PACKS[pack.image_url]?.stickers || []) || [], [ownedStickerPacks]);

    const channelMessages = isSearching ? searchResults : (messages[channelId] || []);

    const uniqueMessages = useMemo(() => {
        const map = new Map();
        channelMessages.forEach(m => map.set(m.id, m));
        return Array.from(map.values());
    }, [channelMessages]);

    const pinnedMessages = useMemo(() => uniqueMessages.filter(m => m.is_pinned), [uniqueMessages]);

    const fetchRecipientLastReadAt = useCallback(async () => {
        const { data } = await supabase.from('channel_members').select('last_read_at').eq('channel_id', channelId).neq('user_id', user.id);
        if (data && data.length === 1) setRecipientLastReadAt(data[0].last_read_at);
    }, [channelId, user.id]);

    const fetchChannelType = useCallback(async () => {
        const { data } = await supabase.from('channels').select('type').eq('id', channelId).maybeSingle();
        setChannelType(data?.type ?? null);
    }, [channelId]);

    useEffect(() => {
        navigation.setOptions({ title: name });
        fetchMessages(channelId, 0);
        markAsRead(channelId);

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

        const memberSub = supabase
            .channel(`member-status:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'channel_members',
                    filter: `channel_id=eq.${channelId}`,
                },
                (payload) => {
                    if (payload.new.user_id !== user.id) {
                        setRecipientLastReadAt(payload.new.last_read_at);
                    }
                }
            )
            .subscribe();

        return () => {
            unsubscribeFromChannel(channelId);
            supabase.removeChannel(memberSub);
        };
    }, [channelId, fetchChannelType, fetchRecipientLastReadAt, fetchMessages, markAsRead, name, navigation, subscribeToChannel, unsubscribeFromChannel, user.id]);

    const handlePickImage = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                setAttachment({
                    uri: result.assets[0].uri,
                    type: 'image',
                    name: result.assets[0].fileName || 'image.jpg'
                });
                setShowAttachMenu(false);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    }, []);

    const handlePickDocument = useCallback(async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.assets && result.assets.length > 0) {
                setAttachment({
                    uri: result.assets[0].uri,
                    type: 'file',
                    name: result.assets[0].name,
                    mimeType: result.assets[0].mimeType
                });
                setShowAttachMenu(false);
            }
        } catch (error) {
            console.error('Error picking document:', error);
        }
    }, []);

    const handleSend = useCallback(async () => {
        if (!inputText.trim() && !attachment) return;

        const content = inputText.trim() || (attachment ? (attachment.type === 'image' ? 'Sent an image' : 'Sent a file') : '');

        if (editingMessage && !attachment) {
            await editMessage(editingMessage.id, content);
            setEditingMessage(null);
            setInputText('');
            return;
        }

        setInputText('');
        setReplyingTo(null);
        setSending(true);

        try {
            let attachments = [];
            if (attachment) {
                const uploaded = await uploadAttachment(attachment.uri, attachment.name, attachment.mimeType || (attachment.type === 'image' ? 'image/jpeg' : 'application/octet-stream'));
                attachments.push(uploaded);
            }

            await sendMessage(channelId, content, attachments, replyingTo?.id);
            setAttachment(null);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch (error) {
            console.error(error);
            showToast('Failed to send message', 'error');
        } finally {
            setSending(false);
        }
    }, [inputText, attachment, editingMessage, editMessage, sendMessage, channelId, replyingTo, uploadAttachment, showToast]);

    const handleSendSticker = useCallback(async (sticker) => {
        setShowStickerPicker(false);
        setSending(true);
        try {
            await sendMessage(channelId, sticker, []);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } finally {
            setSending(false);
        }
    }, [channelId, sendMessage]);

    const handleLongPressMessage = useCallback((message) => {
        setSelectedMessage(message);
        setActionModalVisible(true);
    }, []);

    const handleReaction = useCallback((messageId, emoji) => {
        const message = uniqueMessages.find(m => m.id === messageId);
        const hasReacted = message?.message_reactions?.some(r => r.user_id === user.id && r.emoji === emoji);
        if (hasReacted) removeReaction(messageId, emoji);
        else addReaction(messageId, emoji);
    }, [uniqueMessages, user.id, removeReaction, addReaction]);

    const renderMessage = useCallback(({ item, index }) => {
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
                        onReaction={(emoji) => handleReaction(item.id, emoji)}
                    />
                </TouchableOpacity>
            </View>
        );
    }, [channelMessages, theme, user, recipientLastReadAt, allStickersList, handleLongPressMessage, handleReaction]);

    const handleActionModalReaction = useCallback((emoji) => {
        if (selectedMessage) {
            handleReaction(selectedMessage.id, emoji);
        }
    }, [selectedMessage, handleReaction]);

    const handleActionModalEdit = useCallback((msg) => {
        setEditingMessage(msg);
        setInputText(msg.content);
    }, []);

    const handleActionModalDelete = useCallback((msg) => deleteMessage(msg.id), [deleteMessage]);
    const handleActionModalPin = useCallback((msg) => pinMessage(msg.id, !msg.is_pinned), [pinMessage]);
    const handleActionModalReply = useCallback((msg) => setReplyingTo(msg), []);

    const toggleSearching = useCallback(() => setIsSearching(prev => !prev), []);
    const toggleAttachMenu = useCallback(() => setShowAttachMenu(prev => !prev), []);
    const closeStickerPicker = useCallback(() => setShowStickerPicker(false), []);
    const openStickerPicker = useCallback(() => { setShowStickerPicker(true); setShowAttachMenu(false); }, []);
    const clearAttachment = useCallback(() => setAttachment(null), []);

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.chatHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.cardBorder, borderBottomWidth: 1, zIndex: 10, paddingTop: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 8 }}>
                            <FontAwesomeIcon icon={faChevronLeft} size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                        <AnimatedAvatarBorder
                            avatarSource={avatar ? { uri: avatar } : defaultUserImage}
                            size={36}
                            borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : {}}
                            isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                            isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                        />
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={[styles.chatHeaderTitle, { color: theme.colors.text }]} numberOfLines={1}>{name}</Text>
                            {Object.keys(typingUsers).length > 0 && (
                                <Text style={{ fontSize: 10, color: theme.colors.typingIndicator, fontWeight: 'bold' }}>typing...</Text>
                            )}
                        </View>
                    </View>
                    <TouchableOpacity style={{ padding: 8 }} onPress={toggleSearching}>
                        <FontAwesomeIcon icon={isSearching ? faTimes : faSearch} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>
            </View>

            {loadingMessages && uniqueMessages.length === 0 ? (
                <ChatMessagesSkeleton />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={uniqueMessages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={[styles.listContent, { paddingBottom: 20 }]}
                    inverted
                    onEndReached={() => hasMoreMessages && fetchOlderMessages(channelId)}
                    onEndReachedThreshold={0.5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                />
            )}

            {showStickerPicker && (
                <View style={[styles.stickerPicker, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.cardBorder, borderTopWidth: 1 }]}>
                    <View style={styles.stickerPickerHeader}>
                        <Text style={[styles.stickerPickerTitle, { color: theme.colors.placeholder }]}>YOUR STICKERS</Text>
                        <TouchableOpacity onPress={closeStickerPicker}>
                            <FontAwesomeIcon icon={faTimes} size={16} color={theme.colors.placeholder} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.stickerGrid}>
                            {availableStickers.map((sticker, i) => (
                                <TouchableOpacity key={i} onPress={() => handleSendSticker(sticker)} style={styles.stickerItem}>
                                    <Text style={{ fontSize: 36 }}>{sticker}</Text>
                                </TouchableOpacity>
                            ))}
                            {availableStickers.length === 0 && (
                                <Text style={{ color: theme.colors.placeholder, fontStyle: 'italic', fontSize: 12 }}>Visit the shop to unlock stickers!</Text>
                            )}
                        </View>
                    </ScrollView>
                </View>
            )}

            {attachment && (
                <View style={[styles.attachmentPreview, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {attachment.type === 'image' ? (
                            <Image source={{ uri: attachment.uri }} style={{ width: 50, height: 50, borderRadius: 12, marginRight: 12 }} />
                        ) : (
                            <View style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                <FontAwesomeIcon icon={faPaperclip} size={20} color={theme.colors.primary} />
                            </View>
                        )}
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{attachment.name}</Text>
                            <Text style={{ color: theme.colors.placeholder, fontSize: 11, marginTop: 2, fontWeight: '600' }}>
                                {attachment.type.toUpperCase()}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={clearAttachment}
                            style={{
                                width: 32, height: 32,
                                backgroundColor: theme.colors.background,
                                borderRadius: 16,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: theme.colors.cardBorder
                            }}
                        >
                            <FontAwesomeIcon icon={faTimes} size={12} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {showAttachMenu && (
                <>
                    <TouchableOpacity
                        style={styles.menuBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowAttachMenu(false)}
                    />
                    <View style={[styles.attachMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                        <TouchableOpacity onPress={handlePickImage} style={styles.attachMenuItem}>
                            <View style={[styles.attachIconBox, { backgroundColor: theme.colors.attachmentGallery }]}>
                                <FontAwesomeIcon icon={faImage} size={22} color="#fff" />
                            </View>
                            <Text style={[styles.attachLabel, { color: theme.colors.text }]}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handlePickDocument} style={styles.attachMenuItem}>
                            <View style={[styles.attachIconBox, { backgroundColor: theme.colors.attachmentFile }]}>
                                <FontAwesomeIcon icon={faPaperclip} size={22} color="#fff" />
                            </View>
                            <Text style={[styles.attachLabel, { color: theme.colors.text }]}>File</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={openStickerPicker} style={styles.attachMenuItem}>
                            <View style={[styles.attachIconBox, { backgroundColor: theme.colors.attachmentSticker }]}>
                                <Text style={{ fontSize: 22 }}>✨</Text>
                            </View>
                            <Text style={[styles.attachLabel, { color: theme.colors.text }]}>Stickers</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.cardBorder, borderTopWidth: 1, paddingBottom: Math.max(insets.bottom, 12), paddingTop: 12 }]}>
                <TouchableOpacity onPress={toggleAttachMenu} style={styles.attachButton}>
                    <View style={[styles.plusIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faPlus} size={18} color={theme.colors.primary} />
                    </View>
                </TouchableOpacity>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.colors.placeholder}
                    value={inputText}
                    onChangeText={(text) => { setInputText(text); sendTypingEvent(channelId); }}
                    multiline
                />
                <TouchableOpacity onPress={handleSend} style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}>
                    {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <FontAwesomeIcon icon={faPaperPlane} size={14} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            <MessageActionModal
                visible={actionModalVisible}
                onClose={() => setActionModalVisible(false)}
                message={selectedMessage}
                isMyMessage={selectedMessage?.sender_id === user?.id}
                onEdit={handleActionModalEdit}
                onDelete={handleActionModalDelete}
                onPin={handleActionModalPin}
                onReply={handleActionModalReply}
                onReaction={handleActionModalReaction}
                isAdmin={true}
            />
        </KeyboardAvoidingView>
    );
}

export default React.memo(ChatRoomScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    chatHeader: { paddingBottom: 12, elevation: 0 },
    chatHeaderTitle: { fontSize: 17, fontWeight: '800' },
    listContent: { padding: 16 },
    inputContainer: { flexDirection: 'row', paddingHorizontal: 16, alignItems: 'center' },
    input: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 12, maxHeight: 120, fontSize: 15, fontWeight: '500' },
    attachButton: { padding: 4 },
    plusIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    stickerPicker: { padding: 16, height: 140 },
    stickerPickerHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    stickerPickerTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    stickerGrid: { flexDirection: 'row', gap: 16 },
    stickerItem: { padding: 4 },
    bubbleContainer: { maxWidth: '85%' },
    bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, elevation: 0 },
    senderName: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    timestamp: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end', fontWeight: '600' },
    attachmentImage: { width: 220, height: 160, borderRadius: 14, marginBottom: 8 },
    titleTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    titleTagText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
    attachmentPreview: {
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 12,
        borderRadius: 16,
        elevation: 0,
    },
    menuBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 99,
    },
    attachMenu: {
        flexDirection: 'row',
        padding: 24,
        justifyContent: 'space-around',
        borderRadius: 24,
        marginHorizontal: 16,
        marginBottom: 90,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        elevation: 0,
    },
    attachMenuItem: {
        alignItems: 'center',
    },
    attachIconBox: {
        width: 52,
        height: 52,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    attachLabel: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    reactionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        position: 'absolute',
        bottom: -12,
        right: -4,
        zIndex: 10
    },
    reactionBadge: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 3,
        flexDirection: 'row',
        alignItems: 'center',
    }
});