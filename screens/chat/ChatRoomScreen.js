import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator, Modal } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faPaperclip, faImage, faArrowLeft, faUser, faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES } from '../../constants/GamificationStyles';
import { supabase } from '../../lib/supabase';
import ParticipantsModal from '../../components/ParticipantsModal';

const defaultUserImage = require('../../assets/user.png');

export default function ChatRoomScreen({ route, navigation }) {
    const { channelId, name, avatar, equippedItem } = route.params;
    const { messages, user, fetchMessages, subscribeToChannel, unsubscribeFromChannel, sendMessage, uploadAttachment, markAsRead } = useChat();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const [recipientLastReadAt, setRecipientLastReadAt] = useState(null);

    // Participants Modal State
    const [menuVisible, setMenuVisible] = useState(false);
    const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    const [channelType, setChannelType] = useState(null);
    const [processingAction, setProcessingAction] = useState(false);

    const flatListRef = useRef();

    const channelMessages = messages[channelId] || [];

    useEffect(() => {
        navigation.setOptions({ title: name });
        fetchMessages(channelId);
        subscribeToChannel(channelId);
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
                // For now, we disable read receipts for group chats to avoid confusion
                // or we could implement logic to show "Read by X"
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


    const handleSend = async () => {
        if (!inputText.trim()) return;

        const content = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            await sendMessage(channelId, content);
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
            }
        } catch (error) {
            console.error(error);
            setSending(false);
        }
    };

    const renderMessage = ({ item }) => {
        return (
            <MessageBubble
                message={item}
                theme={theme}
                currentUser={user}
                recipientAvatar={avatar}
                recipientEquippedItem={equippedItem}
                recipientLastReadAt={recipientLastReadAt}
            />
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
                        <Text style={[styles.chatHeaderTitle, { color: theme.colors.text }]} numberOfLines={1}>{name}</Text>
                    </View>

                    {/* Menu Button */}
                    <TouchableOpacity
                        style={{ padding: 10 }}
                        onPress={() => setMenuVisible(!menuVisible)}
                    >
                        <FontAwesomeIcon icon={faEllipsisV} size={20} color={theme.colors.text} />
                    </TouchableOpacity>
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

            <FlatList
                ref={flatListRef}
                data={channelMessages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.listContent}
                style={{ backgroundColor: '#F5F5F5' }}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                <TouchableOpacity onPress={handleAttachment} style={styles.attachButton}>
                    <FontAwesomeIcon icon={faImage} size={20} color={theme.colors.primary} />
                </TouchableOpacity>

                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.text }]}
                    placeholder="Type a message..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
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
                        <FontAwesomeIcon icon={faPaperPlane} size={16} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            <ParticipantsModal
                visible={participantsModalVisible}
                onClose={() => setParticipantsModalVisible(false)}
                participants={participants}
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

// Helper component for message bubble
const MessageBubble = ({ message, theme, currentUser, recipientAvatar, recipientEquippedItem, recipientLastReadAt }) => {
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

    // Determine background color
    const isDark = theme.dark || (theme.colors.surface && theme.colors.surface.toLowerCase() < '#888888');

    const bubbleColor = isMyMessage
        ? theme.colors.primary
        : getUserColor(message.sender_id, isDark);

    // Determine text color based on background
    const textColor = isMyMessage
        ? '#fff'
        : (isDark ? '#fff' : '#000');

    return (
        <View style={[
            styles.bubbleContainer,
            isMyMessage ? styles.myMessageContainer : styles.theirMessageContainer
        ]}>
            {!isMyMessage && (
                <Text style={[styles.senderName, { color: theme.colors.textSecondary }]}>
                    {message.sender?.full_name || 'Unknown'}
                </Text>
            )}

            <View style={[
                styles.bubble,
                { backgroundColor: bubbleColor }
            ]}>
                {message.attachments && message.attachments.length > 0 && (
                    <Image
                        source={{ uri: message.attachments[0].url }}
                        style={styles.attachmentImage}
                        resizeMode="cover"
                    />
                )}
                {message.content ? (
                    <Text style={[
                        styles.messageText,
                        { color: textColor }
                    ]}>
                        {message.content}
                    </Text>
                ) : null}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: isMyMessage ? 'flex-end' : 'flex-start', marginTop: 4 }}>
                <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isMyMessage && (
                    <View style={{ marginLeft: 6 }}>
                        <Text style={{
                            fontSize: 10,
                            color: isRead ? '#007AFF' : theme.colors.textSecondary,
                            fontWeight: isRead ? 'bold' : 'normal'
                        }}>
                            {isRead ? 'Read' : 'Unread'}
                        </Text>
                    </View>
                )}
            </View>
        </View>
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
});
