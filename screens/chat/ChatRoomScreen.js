import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Modal, Dimensions, ScrollView } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useGamification } from '../../context/GamificationContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faPaperclip, faImage, faArrowLeft, faUser, faEllipsisV, faArrowDown, faSearch, faThumbtack, faTimes, faPen, faBan, faReply, faSmile, faPlus } from '@fortawesome/free-solid-svg-icons';
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

    const handlePickImage = async () => {
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
    };

    const handlePickDocument = async () => {
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
    };

    const handleSend = async () => {
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

            {/* Attachment Preview */}
            {attachment && (
                <View style={[styles.attachmentPreview, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {attachment.type === 'image' ? (
                            <Image source={{ uri: attachment.uri }} style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }} />
                        ) : (
                            <View style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: theme.colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                                <FontAwesomeIcon icon={faPaperclip} size={24} color={theme.colors.primary} />
                            </View>
                        )}
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={{ color: theme.colors.text, fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{attachment.name}</Text>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                {attachment.type === 'image' ? 'Image' : 'Document'} • {(attachment.size / 1024).toFixed(1)} KB
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => setAttachment(null)} 
                            style={{ 
                                padding: 8, 
                                backgroundColor: theme.colors.background, 
                                borderRadius: 20,
                                elevation: 1
                            }}
                        >
                            <FontAwesomeIcon icon={faTimes} size={14} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Attach Menu with Backdrop */}
            {showAttachMenu && (
                <>
                    <TouchableOpacity 
                        style={styles.menuBackdrop} 
                        activeOpacity={1} 
                        onPress={() => setShowAttachMenu(false)}
                    />
                    <View style={[styles.attachMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <TouchableOpacity onPress={handlePickImage} style={styles.attachMenuItem}>
                            <View style={[styles.attachIconBox, { backgroundColor: '#4CAF50' }]}>
                                <FontAwesomeIcon icon={faImage} size={24} color="#fff" />
                            </View>
                            <Text style={[styles.attachLabel, { color: theme.colors.text }]}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handlePickDocument} style={styles.attachMenuItem}>
                            <View style={[styles.attachIconBox, { backgroundColor: '#2196F3' }]}>
                                <FontAwesomeIcon icon={faPaperclip} size={24} color="#fff" />
                            </View>
                            <Text style={[styles.attachLabel, { color: theme.colors.text }]}>File</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setShowStickerPicker(true); setShowAttachMenu(false); }} style={styles.attachMenuItem}>
                            <View style={[styles.attachIconBox, { backgroundColor: '#FF9800' }]}>
                                <Text style={{ fontSize: 24 }}>✨</Text>
                            </View>
                            <Text style={[styles.attachLabel, { color: theme.colors.text }]}>Stickers</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {/* Input */}
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
                <TouchableOpacity onPress={() => setShowAttachMenu(!showAttachMenu)} style={styles.attachButton}>
                    <FontAwesomeIcon icon={faPlus} size={20} color={theme.colors.primary} />
                </TouchableOpacity>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                    placeholder="Type a message..."
                    value={inputText}
                    onChangeText={(text) => { setInputText(text); sendTypingEvent(channelId); }}
                    multiline
                />
                <TouchableOpacity onPress={handleSend} style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}>
                    {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <FontAwesomeIcon icon={faPaperPlane} size={16} color="#fff" />
                    )}
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

    // Reactions Logic
    const reactions = message.message_reactions || [];
    const reactionCounts = reactions.reduce((acc, curr) => {
        acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
        return acc;
    }, {});
    const myReactions = new Set(reactions.filter(r => r.user_id === currentUser.id).map(r => r.emoji));

    const renderAttachment = () => {
        if (!message.attachments?.length) return null;
        const attachment = message.attachments[0];
        // Check if it's an image based on type or extension
        const isImage = attachment.type === 'image' || (attachment.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name));

        if (isImage) {
            return <Image source={{ uri: attachment.url }} style={styles.attachmentImage} />;
        }

        return (
            <TouchableOpacity style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: 'rgba(0,0,0,0.1)', 
                padding: 10, 
                borderRadius: 8, 
                marginBottom: 5 
            }}>
                <View style={{ width: 30, height: 30, backgroundColor: '#fff', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                    <FontAwesomeIcon icon={faPaperclip} size={14} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: isMe ? '#fff' : theme.colors.text, fontWeight: 'bold' }} numberOfLines={1}>
                        {attachment.name || 'Attachment'}
                    </Text>
                    <Text style={{ color: isMe ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary, fontSize: 10 }}>
                        Tap to view
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
                { backgroundColor: isMe ? theme.colors.primary : theme.colors.surface },
                bubbleStyle && { backgroundColor: bubbleStyle.backgroundColor, borderColor: bubbleStyle.borderColor, borderWidth: bubbleStyle.borderWidth, borderRadius: bubbleStyle.borderRadius }
            ]}>
                {renderAttachment()}
                {message.content ? (
                    <Text style={[{ color: isMe ? '#fff' : theme.colors.text, fontSize: 16 }, bubbleStyle && { color: bubbleStyle.textColor }]}>
                        {message.content}
                    </Text>
                ) : null}
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
                    {renderAttachment()}
                    {message.content ? <Text style={{ color: bubbleStyle.textColor || '#fff', fontSize: 16 }}>{message.content}</Text> : null}
                </LinearGradient>
            );
        }

        return bubbleBody;
    };

    return (
        <View style={[styles.bubbleContainer, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }, { marginBottom: Object.keys(reactionCounts).length > 0 ? 20 : 15 }]}>
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
            
            <View>
                {renderBubbleContent()}
                
                {/* Reactions Row - Half off, half on, right aligned */}
                {Object.keys(reactionCounts).length > 0 && (
                    <View style={{ 
                        flexDirection: 'row', 
                        flexWrap: 'wrap', 
                        gap: 4, 
                        position: 'absolute',
                        bottom: -12,
                        right: -6,
                        zIndex: 10
                    }}>
                        {Object.entries(reactionCounts).map(([emoji, count]) => {
                            const iReacted = myReactions.has(emoji);
                            return (
                                <TouchableOpacity 
                                    key={emoji} 
                                    onPress={() => onReaction(emoji)}
                                    style={{
                                        backgroundColor: iReacted ? theme.colors.primary : theme.colors.surface,
                                        borderColor: theme.colors.border,
                                        borderWidth: 1,
                                        borderRadius: 12,
                                        paddingHorizontal: 6,
                                        paddingVertical: 2,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        elevation: 2,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: 0.2,
                                        shadowRadius: 1,
                                    }}
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

            <Text style={[styles.timestamp, { marginTop: Object.keys(reactionCounts).length > 0 ? 12 : 4 }]}>
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
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
    titleTagText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
    attachmentPreview: {
        marginHorizontal: 10,
        marginBottom: 10,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    menuBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)', // Semi-transparent dimming
        zIndex: 99,
    },
    attachMenu: {
        flexDirection: 'row',
        padding: 20,
        justifyContent: 'space-around',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 80, // Sit above input
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    attachMenuItem: {
        alignItems: 'center',
    },
    attachIconBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        elevation: 2,
    },
    attachLabel: {
        fontSize: 12,
        fontWeight: '600',
    }
});
