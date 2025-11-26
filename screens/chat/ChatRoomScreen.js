import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Modal } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faPaperclip, faImage, faArrowLeft, faUser, faEllipsisV, faArrowDown, faSearch, faThumbtack, faTimes, faPen, faBan, faReply } from '@fortawesome/free-solid-svg-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES } from '../../constants/GamificationStyles';
import { supabase } from '../../lib/supabase';
import ParticipantsModal from '../../components/ParticipantsModal';
import LinkPreview from '../../components/LinkPreview';
import MessageActionModal from '../../components/MessageActionModal';
import DateHeader from '../../components/DateHeader';

const defaultUserImage = require('../../assets/user.png');

export default function ChatRoomScreen({ route, navigation }) {
    const { channelId, name, avatar, equippedItem } = route.params;
    const { messages, user, fetchMessages, fetchOlderMessages, editMessage, deleteMessage, pinMessage, searchMessages, addReaction, removeReaction, sendTypingEvent, subscribeToChannel, unsubscribeFromChannel, sendMessage, uploadAttachment, markAsRead } = useChat();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [recipientLastReadAt, setRecipientLastReadAt] = useState(null);
    const [inputLinkPreview, setInputLinkPreview] = useState(null);

    // Participants Modal State
    const [menuVisible, setMenuVisible] = useState(false);
    const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [channelType, setChannelType] = useState(null);
    const [processingAction, setProcessingAction] = useState(false);

    // Pagination & Scroll State
    const [loadingMore, setLoadingMore] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);

    // Search State
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Message Actions State
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);

    // Typing State
    const [typingUsers, setTypingUsers] = useState({}); // { userId: { fullName, timeoutId } }

    const flatListRef = useRef();

    const channelMessages = isSearching ? searchResults : (messages[channelId] || []);
    const pinnedMessages = (messages[channelId] || []).filter(m => m.is_pinned);

    useEffect(() => {
        navigation.setOptions({ title: name });
        // Initial fetch - start from 0
        fetchMessages(channelId, 0);

        subscribeToChannel(channelId, (payload) => {
            // Handle typing event
            if (payload.userId !== user.id) {
                setTypingUsers(prev => {
                    // Clear existing timeout
                    if (prev[payload.userId]?.timeoutId) {
                        clearTimeout(prev[payload.userId].timeoutId);
                    }

                    // Set new timeout
                    const timeoutId = setTimeout(() => {
                        setTypingUsers(current => {
                            const newState = { ...current };
                            delete newState[payload.userId];
                            return newState;
                        });
                    }, 3000);

                    return {
                        ...prev,
                        [payload.userId]: {
                            fullName: payload.fullName,
                            timeoutId
                        }
                    };
                });
            }
        });

        fetchRecipientLastReadAt();
        fetchChannelType();

        // Subscribe to channel_members updates for read receipts
        const channelMembersSubscription = supabase
            .channel(`channel_members:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'channel_members',
                    filter: `channel_id=eq.${channelId}`,
                },
                (payload) => {
                    // Update recipient's last_read_at if it's not the current user
                    if (payload.new.user_id !== user.id) {
                        setRecipientLastReadAt(payload.new.last_read_at);
                    }
                }
            )
            .subscribe();

        return () => {
            unsubscribeFromChannel(channelId);
            supabase.removeChannel(channelMembersSubscription);
        };
    }, [channelId]);

    // Auto-search with debouncing
    useEffect(() => {
        if (!isSearching) return;

        const debounceTimer = setTimeout(async () => {
            if (searchQuery.trim()) {
                const results = await searchMessages(channelId, searchQuery);
                setSearchResults(results);
            } else {
                setSearchResults([]);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(debounceTimer);
    }, [searchQuery, isSearching]);

    // Detect URL in input text for preview
    useEffect(() => {
        const extractUrl = (text) => {
            if (!text) return null;
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const match = text.match(urlRegex);
            return match ? match[0] : null;
        };

        const foundUrl = extractUrl(inputText);
        if (foundUrl) {
            // Fetch preview data
            try {
                const domain = new URL(foundUrl).hostname;
                setInputLinkPreview({
                    url: foundUrl,
                    title: domain,
                    description: foundUrl
                });
            } catch (error) {
                setInputLinkPreview(null);
            }
        } else {
            setInputLinkPreview(null);
        }
    }, [inputText]);

    // Fetch recipient's last_read_at timestamp
    const fetchRecipientLastReadAt = async () => {
        try {
            const { data, error } = await supabase
                .from('channel_members')
                .select('last_read_at, user_id')
                .eq('channel_id', channelId)
                .neq('user_id', user.id);

            if (error) throw error;

            if (data && data.length === 1) {
                // Direct Message - Single recipient
                setRecipientLastReadAt(data[0].last_read_at);
            } else {
                // Group Chat - Multiple recipients
                setRecipientLastReadAt(null);
            }
        } catch (error) {
            console.error('Error fetching recipient last_read_at:', error);
        }
    };

    const fetchChannelType = async () => {
        try {
            const { data, error } = await supabase
                .from('channels')
                .select('type')
                .eq('id', channelId)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            setChannelType(data?.type ?? null);
        } catch (err) {
            console.error('Error fetching channel type:', err);
        }
    };

    const handleCloseChat = async () => {
        try {
            setMenuVisible(false);
            setProcessingAction(true);

            // Remove the current user's membership from the channel
            const { error: deleteMemberError } = await supabase
                .from('channel_members')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', user.id);

            if (deleteMemberError) throw deleteMemberError;

            // Check if any members remain in the channel
            const { data: remainingMembers, error: checkError } = await supabase
                .from('channel_members')
                .select('user_id')
                .eq('channel_id', channelId);

            if (checkError) throw checkError;

            // If no members are left, delete the channel itself
            if (!remainingMembers || remainingMembers.length === 0) {
                const { error: deleteChannelError } = await supabase
                    .from('channels')
                    .delete()
                    .eq('id', channelId);
                if (deleteChannelError) throw deleteChannelError;
            }

            // Return to the chat list screen
            navigation.navigate('ChatList');
            showToast('Chat closed successfully', 'success');
        } catch (error) {
            console.error('Error closing chat:', error);
            alert('Failed to close chat');
        } finally {
            setProcessingAction(false);
        }
    };

    const handleLeaveGroup = async () => {
        try {
            setMenuVisible(false);
            setProcessingAction(true);

            // 1️⃣  Get channel creator info
            const { data: channelData, error: channelError } = await supabase
                .from('channels')
                .select('created_by')
                .eq('id', channelId)
                .single();
            if (channelError) throw channelError;
            const isCreator = channelData.created_by === user.id;

            // 2️⃣  Get all members BEFORE deleting the current user
            const { data: membersBefore, error: membersBeforeError } = await supabase
                .from('channel_members')
                .select('user_id')
                .eq('channel_id', channelId);
            if (membersBeforeError) throw membersBeforeError;

            // 3️⃣  If the leaver is the creator, transfer ownership to the first other member
            if (isCreator) {
                const otherMembers = membersBefore.filter(m => m.user_id !== user.id);
                if (otherMembers.length > 0) {
                    const newOwnerId = otherMembers[0].user_id;

                    const {
                        error: updateError,
                    } = await supabase
                        .from('channels')
                        .update({ created_by: newOwnerId })
                        .eq('id', channelId)
                        .select('id, created_by')
                        .single();

                    if (updateError) throw updateError;
                }
            }

            // 4️⃣  Insert a system message announcing the departure
            const { data: authUser } = await supabase.auth.getUser();
            const { data: userProfile } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', authUser.user.id)
                .single();

            await supabase.from('messages').insert({
                channel_id: channelId,
                sender_id: user.id,
                content: `${userProfile?.full_name || 'User'} left the group`,
                is_system_message: true,
            });

            // 5️⃣  Delete the current user's membership
            const { error: deleteMemberError } = await supabase
                .from('channel_members')
                .delete()
                .eq('channel_id', channelId)
                .eq('user_id', user.id);
            if (deleteMemberError) throw deleteMemberError;

            // 6️⃣  If the channel is now empty, delete the channel
            if (!membersBefore || membersBefore.length <= 1) {
                const { error: deleteChannelError } = await supabase
                    .from('channels')
                    .delete()
                    .eq('id', channelId);
                if (deleteChannelError) throw deleteChannelError;
            }

            // 7️⃣  Navigate back to chat list
            navigation.navigate('ChatList');
            showToast('You have left the group', 'success');
        } catch (err) {
            console.error('Error leaving group:', err);
            alert('Failed to leave group');
        } finally {
            setProcessingAction(false);
        }
    };

    useEffect(() => {
        if (channelMessages.length > 0 && user) {
            const hasMessagesFromOthers = channelMessages.some(
                (msg) => msg.sender_id !== user.id
            );
            if (hasMessagesFromOthers) {
                markAsRead(channelId);
            }
        }
    }, [channelMessages.length, channelId, user]);

    const handleTyping = () => {
        sendTypingEvent(channelId);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const content = inputText.trim();

        if (editingMessage) {
            // Handle Edit
            try {
                await editMessage(editingMessage.id, content);
                setEditingMessage(null);
                setInputText('');
            } catch (error) {
                // Error handled in context
            }
            return;
        }

        setInputText('');
        setReplyingTo(null); // Clear reply
        setSending(true);

        try {
            await sendMessage(channelId, content, [], replyingTo?.id);
            // Scroll to bottom after sending (which is top in inverted list)
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } catch (error) {
            // Error handled in context
            setInputText(content); // Restore text on error
        } finally {
            setSending(false);
        }
    };

    const handleAttachment = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled) {
                setSending(true);
                const asset = result.assets[0];
                const upload = await uploadAttachment(asset.uri, asset.fileName || 'image.jpg', asset.mimeType || 'image/jpeg');
                await sendMessage(channelId, '', [upload]);
                setSending(false);
                flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }
        } catch (error) {
            console.error(error);
            setSending(false);
        }
    };

    const handleLongPressMessage = (message) => {
        setSelectedMessage(message);
        setActionModalVisible(true);
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        const results = await searchMessages(channelId, searchQuery);
        setSearchResults(results);
    };

    const renderMessage = ({ item, index }) => {
        // Date Header Logic
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
                        recipientAvatar={avatar}
                        recipientEquippedItem={equippedItem}
                        recipientLastReadAt={recipientLastReadAt}
                        onReaction={(emoji) => {
                            const hasReacted = item.message_reactions?.some(r => r.user_id === user.id && r.emoji === emoji);
                            if (hasReacted) {
                                removeReaction(item.id, emoji);
                            } else {
                                addReaction(item.id, emoji);
                            }
                        }}
                    />
                </TouchableOpacity>
            </View>
        );
    };

    const fetchParticipants = async () => {

        if (participants.length > 0) {
            setParticipantsModalVisible(true);
            setMenuVisible(false);
            return;
        }

        setLoadingParticipants(true);
        try {
            const { data, error } = await supabase
                .from('channel_members')
                .select(`
        user_id,
        role,
        users (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
                .eq('channel_id', channelId);

            if (error) throw error;


            const formattedParticipants = data.map(item => ({
                ...item.users,
                role: item.role,
            }));

            setParticipants(formattedParticipants);
            setParticipantsModalVisible(true);
        } catch (err) {
            console.error('Error fetching participants:', err);
        } finally {
            setLoadingParticipants(false);
            setMenuVisible(false);
        }
    };

    const handleLoadMore = async () => {
        if (loadingMore || !hasMoreMessages || isSearching) return;

        setLoadingMore(true);
        try {
            const count = await fetchOlderMessages(channelId);
            if (count === 0) {
                setHasMoreMessages(false);
            }
        } catch (error) {
            console.error("Error loading more messages:", error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleScroll = (event) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        // Show scroll-to-bottom button if scrolled up more than 300px
        setShowScrollBottom(offsetY > 300);
    };

    const scrollToBottom = () => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Custom Header */}
            <View style={[styles.chatHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.cardBorder, zIndex: 10 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10, marginRight: 5 }}>
                            <FontAwesomeIcon icon={faArrowLeft} size={20} color={theme.colors.text} />
                        </TouchableOpacity>

                        <View style={{ marginRight: 10, overflow: 'visible' }}>
                            {avatar || equippedItem ? (
                                <AnimatedAvatarBorder
                                    avatarSource={avatar ? { uri: avatar } : defaultUserImage}
                                    size={32}
                                    borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : {}}
                                    isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                                    isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                                />
                            ) : (
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
                                    <FontAwesomeIcon icon={faUser} size={16} color={theme.colors.primary} />
                                </View>
                            )}
                        </View>
                        {isSearching ? (
                            <TextInput
                                style={[styles.searchInput, { color: theme.colors.text, backgroundColor: theme.colors.background }]}
                                placeholder="Search..."
                                placeholderTextColor={theme.colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                onSubmitEditing={handleSearch}
                                autoFocus
                            />
                        ) : (
                            <Text style={[styles.chatHeaderTitle, { color: theme.colors.text }]} numberOfLines={1}>{name}</Text>
                        )}
                    </View>

                    {/* Header Actions */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            style={{ padding: 10 }}
                            onPress={() => {
                                if (isSearching) {
                                    setIsSearching(false);
                                    setSearchQuery('');
                                    setSearchResults([]);
                                } else {
                                    setIsSearching(true);
                                }
                            }}
                        >
                            <FontAwesomeIcon icon={isSearching ? faTimes : faSearch} size={20} color={theme.colors.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{ padding: 10 }}
                            onPress={() => setMenuVisible(!menuVisible)}
                        >
                            <FontAwesomeIcon icon={faEllipsisV} size={20} color={theme.colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Dropdown Menu */}
                {menuVisible && (
                    <View style={[styles.dropdownMenu, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        {channelType === 'group' && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={fetchParticipants}
                            >
                                <Text style={[styles.menuItemText, { color: theme.colors.text }]}>Participants</Text>
                            </TouchableOpacity>
                        )}
                        {channelType === 'direct' && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleCloseChat}
                            >
                                <Text style={[styles.menuItemText, { color: theme.colors.error }]}>Close Chat</Text>
                            </TouchableOpacity>
                        )}
                        {channelType === 'group' && (
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={handleLeaveGroup}
                            >
                                <Text style={[styles.menuItemText, { color: theme.colors.error }]}>Leave Group</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Pinned Messages Header */}
            {pinnedMessages.length > 0 && !isSearching && (
                <View style={[styles.pinnedContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                    <FontAwesomeIcon icon={faThumbtack} size={12} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.pinnedText, { color: theme.colors.text }]} numberOfLines={1}>
                        {pinnedMessages[0].content}
                    </Text>
                    {pinnedMessages.length > 1 && (
                        <Text style={[styles.pinnedCount, { color: theme.colors.textSecondary }]}>+{pinnedMessages.length - 1}</Text>
                    )}
                </View>
            )}

            <View style={{ flex: 1 }}>
                <FlatList
                    ref={flatListRef}
                    data={channelMessages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.listContent}
                    style={{ backgroundColor: '#F5F5F5' }}
                    inverted
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.2}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ paddingVertical: 20 }}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            </View>
                        ) : null
                    }
                />

                {/* Scroll to Bottom Button */}
                {showScrollBottom && (
                    <TouchableOpacity
                        style={[styles.scrollToBottomButton, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.shadow }]}
                        onPress={scrollToBottom}
                    >
                        <FontAwesomeIcon icon={faArrowDown} size={16} color={theme.colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Input Link Preview - Above the input container */}
            {inputLinkPreview && (
                <View style={{
                    backgroundColor: theme.colors.background,
                    padding: 10,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <LinkPreview previewData={inputLinkPreview} />
                        </View>
                        <TouchableOpacity
                            onPress={() => setInputLinkPreview(null)}
                            style={{
                                marginLeft: 10,
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: theme.colors.surfaceVariant || '#E0E0E0', // Fallback if surfaceVariant undefined
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <FontAwesomeIcon icon={faTimes} size={12} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                {editingMessage && (
                    <View style={styles.editingContainer}>
                        <Text style={[styles.editingText, { color: theme.colors.textSecondary }]}>Editing message...</Text>
                        <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
                            <FontAwesomeIcon icon={faTimes} size={14} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}

                {replyingTo && (
                    <View style={styles.replyContainer}>
                        <View style={[styles.replyCard, { backgroundColor: theme.colors.surface, borderLeftColor: theme.colors.primary }]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.editingText, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                                    Replying to {replyingTo.sender?.full_name || 'Unknown'}
                                </Text>
                                <Text style={[styles.editingText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                                    {replyingTo.content}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setReplyingTo(null)}
                                style={{
                                    marginLeft: 10,
                                    width: 24,
                                    height: 24,
                                    borderRadius: 12,
                                    backgroundColor: theme.colors.surfaceVariant || '#E0E0E0',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <FontAwesomeIcon icon={faTimes} size={12} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Typing Indicator */}
                {Object.keys(typingUsers).length > 0 && (
                    <View style={{ position: 'absolute', top: -20, left: 20 }}>
                        <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontStyle: 'italic' }}>
                            {Object.values(typingUsers).map(u => u.fullName).join(', ')} is typing...
                        </Text>
                    </View>
                )}

                <TouchableOpacity onPress={handleAttachment} style={styles.attachButton}>
                    <FontAwesomeIcon icon={faImage} size={20} color={theme.colors.primary} />
                </TouchableOpacity>

                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                    placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
                    placeholderTextColor={theme.colors.textSecondary}
                    value={inputText}
                    onChangeText={(text) => {
                        setInputText(text);
                        handleTyping();
                    }}
                    multiline
                />

                <TouchableOpacity
                    onPress={handleSend}
                    style={[styles.sendButton, { backgroundColor: theme.colors.primary, opacity: (!inputText.trim() && !sending) ? 0.5 : 1 }]}
                    disabled={!inputText.trim() && !sending}
                >
                    {sending ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <FontAwesomeIcon icon={editingMessage ? faPen : faPaperPlane} size={16} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            <ParticipantsModal
                visible={participantsModalVisible}
                onClose={() => setParticipantsModalVisible(false)}
                participants={participants}
            />

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
                    if (hasReacted) {
                        removeReaction(selectedMessage.id, emoji);
                    } else {
                        addReaction(selectedMessage.id, emoji);
                    }
                }}
                isAdmin={true} // In real app, check role
            />

            {/* Processing Overlay */}
            {processingAction && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={{ color: '#fff', marginTop: 10, fontWeight: 'bold' }}>Processing...</Text>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

// Helper function to generate a color based on user ID
const getUserColor = (userId, isDark) => {
    const lightColors = [
        '#E3F2FD', // Light Blue
        '#F3E5F5', // Light Purple
        '#E8F5E9', // Light Green
        '#FFF3E0', // Light Orange
        '#FFEBEE', // Light Red
        '#F5F5F5', // Light Gray
        '#E0F7FA', // Cyan
        '#FFF8E1', // Amber
    ];

    const darkColors = [
        '#1A237E', // Dark Blue
        '#4A148C', // Dark Purple
        '#1B5E20', // Dark Green
        '#E65100', // Dark Orange
        '#B71C1C', // Dark Red
        '#3E2723', // Dark Brown
        '#006064', // Dark Cyan
        '#FF6F00', // Dark Amber
    ];

    const colors = isDark ? darkColors : lightColors;

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

// Helper function to generate a text color for the username based on user ID
const getUserNameColor = (userId, isDark) => {
    const colorsForLightMode = [ // Darker colors for white background
        '#1565C0', // Blue
        '#6A1B9A', // Purple
        '#2E7D32', // Green
        '#EF6C00', // Orange
        '#C62828', // Red
        '#4E342E', // Brown
        '#00838F', // Cyan
        '#FF8F00', // Amber
    ];

    const colorsForDarkMode = [ // Lighter colors for dark background
        '#90CAF9', // Blue
        '#CE93D8', // Purple
        '#A5D6A7', // Green
        '#FFCC80', // Orange
        '#EF9A9A', // Red
        '#BCAAA4', // Brown
        '#80DEEA', // Cyan
        '#FFE082', // Amber
    ];

    const colors = isDark ? colorsForDarkMode : colorsForLightMode;

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

// Helper component for message bubble
const MessageBubble = ({ message, theme, currentUser, recipientAvatar, recipientEquippedItem, recipientLastReadAt, onReaction }) => {
    // Check if this is a system message
    if (message.is_system_message) {
        return (
            <View style={styles.systemMessageContainer}>
                <View style={[styles.systemMessageBadge, { backgroundColor: theme.colors.textSecondary + '20' }]}>
                    <Text style={[styles.systemMessageText, { color: theme.colors.textSecondary }]}>
                        {message.content}
                    </Text>
                </View>
            </View>
        );
    }

    // Determine if this is the current user's message synchronously
    const isMyMessage = currentUser?.id === message.sender_id;

    // Check if message has been read by recipient
    const isRead = recipientLastReadAt && new Date(message.created_at) <= new Date(recipientLastReadAt);

    // Check if message is pending (optimistic)
    const isPending = message.id.toString().startsWith('temp-');

    // Determine background color
    const isDark = theme.dark || (theme.colors.surface && theme.colors.surface.toLowerCase() < '#888888');

    const bubbleColor = isMyMessage
        ? theme.colors.primary
        : getUserColor(message.sender_id, isDark);

    // Determine text color based on background
    const textColor = isMyMessage
        ? '#fff'
        : (isDark ? '#fff' : '#000');

    // Group reactions
    const reactions = message.message_reactions || [];
    const groupedReactions = reactions.reduce((acc, r) => {
        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
        return acc;
    }, {});

    return (
        <View style={[
            styles.bubbleContainer,
            isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
        ]}>
            {!isMyMessage && (
                <Text style={[styles.senderName, { color: getUserNameColor(message.sender_id, isDark) }]}>
                    {message.sender?.full_name || 'Unknown'}
                </Text>
            )}

            <View style={[
                styles.bubble,
                {
                    backgroundColor: message.is_deleted ? 'rgba(0,0,0,0.05)' : bubbleColor,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    padding: message.is_deleted ? 8 : 12
                }
            ]}>
                {/* Reply Preview */}
                {message.reply_to_message && !message.is_deleted && message.reply_to_message.content && (
                    <View style={{
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        padding: 8,
                        borderRadius: 8,
                        marginBottom: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: isMyMessage ? '#fff' : theme.colors.primary,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <FontAwesomeIcon
                            icon={faReply}
                            size={12}
                            color={textColor}
                            style={{ marginRight: 6, opacity: 0.7 }}
                        />
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: textColor, opacity: 0.8 }}>
                                {message.reply_to_message.sender?.full_name}
                            </Text>
                            <Text style={{ fontSize: 12, color: textColor, opacity: 0.8 }} numberOfLines={1}>
                                {message.reply_to_message.content}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Pinned Indicator */}
                {message.is_pinned && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <FontAwesomeIcon icon={faThumbtack} size={10} color={isMyMessage ? '#fff' : theme.colors.textSecondary} />
                        <Text style={{ fontSize: 10, color: isMyMessage ? '#fff' : theme.colors.textSecondary, marginLeft: 4 }}>Pinned</Text>
                    </View>
                )}

                {message.attachments && message.attachments.length > 0 && !message.is_deleted && (
                    <Image
                        source={{ uri: message.attachments[0].url }}
                        style={styles.attachmentImage}
                        resizeMode="cover"
                    />
                )}

                {message.is_deleted ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesomeIcon icon={faBan} size={12} color={theme.colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.messageText, { color: theme.colors.primary, fontStyle: 'italic', fontSize: 14 }]}>
                            This message was deleted
                        </Text>
                    </View>
                ) : (
                    <>
                        {message.content ? (
                            <Text style={[
                                styles.messageText,
                                { color: textColor }
                            ]}>
                                {message.content}
                            </Text>
                        ) : null}

                        {/* Link Preview */}
                        {message.content && <LinkPreview key={message.id} text={message.content} />}
                    </>
                )}
            </View>

            {/* Reactions */}
            {
                !message.is_deleted && Object.keys(groupedReactions).length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, justifyContent: isMyMessage ? 'flex-end' : 'flex-start' }}>
                        {Object.entries(groupedReactions).map(([emoji, count]) => (
                            <TouchableOpacity
                                key={emoji}
                                onPress={() => onReaction && onReaction(emoji)}
                                style={{
                                    backgroundColor: theme.colors.surfaceVariant,
                                    borderRadius: 12,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    marginRight: 4,
                                    marginBottom: 4,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: theme.colors.border
                                }}
                            >
                                <Text style={{ fontSize: 12 }}>{emoji}</Text>
                                <Text style={{ fontSize: 10, marginLeft: 2, color: theme.colors.textSecondary }}>{count}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )
            }

            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: isMyMessage ? 'flex-end' : 'flex-start', marginTop: 4 }}>
                <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {message.edited_at && !message.is_deleted && (
                    <Text style={[styles.timestamp, { color: theme.colors.textSecondary, marginLeft: 5 }]}>
                        (Edited)
                    </Text>
                )}
                {isMyMessage && !message.is_deleted && (
                    <View style={{ marginLeft: 6 }}>
                        {isPending ? (
                            <FontAwesomeIcon icon={faPaperPlane} size={10} color={theme.colors.textSecondary} />
                        ) : (
                            <Text style={{
                                fontSize: 10,
                                color: isRead ? '#007AFF' : theme.colors.textSecondary,
                                fontWeight: isRead ? 'bold' : 'normal'
                            }}>
                                {isRead ? 'Read' : 'Unread'}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    chatHeader: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    chatHeaderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        alignItems: 'center',
        borderBottomWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginHorizontal: 10,
        maxHeight: 100,
    },
    attachButton: {
        padding: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bubbleContainer: {
        marginBottom: 12,
        maxWidth: '80%',
    },
    myMessageContainer: {
        alignSelf: 'flex-end',
    },
    theirMessageContainer: {
        alignSelf: 'flex-start',
    },
    senderName: {
        fontSize: 12,
        marginBottom: 4,
        marginLeft: 4,
        fontWeight: '600',
    },
    bubble: {
        borderRadius: 16,
        padding: 12,
        overflow: 'hidden',
    },
    messageText: {
        fontSize: 16,
    },
    attachmentImage: {
        width: 200,
        height: 150,
        borderRadius: 8,
        marginBottom: 5,
    },
    timestamp: {
        fontSize: 10,
    },
    dropdownMenu: {
        position: 'absolute',
        top: 50,
        right: 20,
        borderRadius: 8,
        padding: 5,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        minWidth: 150,
    },
    menuItem: {
        padding: 10,
    },
    menuItemText: {
        fontSize: 16,
    },
    systemMessageContainer: {
        alignItems: 'center',
        marginVertical: 8,
    },
    systemMessageBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    systemMessageText: {
        fontSize: 12,
        fontWeight: '500',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    scrollToBottomButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    searchInput: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
        marginRight: 10,
    },
    pinnedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    pinnedText: {
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    pinnedCount: {
        fontSize: 10,
        marginLeft: 5,
    },
    editingContainer: {
        position: 'absolute',
        top: -30,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 5,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    replyContainer: {
        position: 'absolute',
        top: -70,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    replyCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    editingText: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    reactionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        marginBottom: 5,
    },
    reactionButton: {
        padding: 5,
    },
});
