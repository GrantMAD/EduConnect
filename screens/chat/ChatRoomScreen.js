import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faPaperclip, faImage, faArrowLeft, faUser } from '@fortawesome/free-solid-svg-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES } from '../../constants/GamificationStyles';
import { supabase } from '../../lib/supabase';

const defaultUserImage = require('../../assets/user.png');

export default function ChatRoomScreen({ route, navigation }) {
    const { channelId, name, avatar, equippedItem } = route.params;
    const { messages, user, fetchMessages, subscribeToChannel, unsubscribeFromChannel, sendMessage, uploadAttachment, markAsRead } = useChat();
    const { theme } = useTheme();
    const [inputText, setInputText] = useState('');
    const [sending, setSending] = useState(false);
    const flatListRef = useRef();

    const channelMessages = messages[channelId] || [];

    useEffect(() => {
        navigation.setOptions({ title: name });
        fetchMessages(channelId);
        subscribeToChannel(channelId);

        return () => {
            unsubscribeFromChannel(channelId);
        };
    }, [channelId]);

    // Mark as read when messages are loaded and there are messages from others
    useEffect(() => {
        if (channelMessages.length > 0 && user) {
            // Check if there are any messages from other users
            const hasMessagesFromOthers = channelMessages.some(msg => msg.sender_id !== user.id);
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
                recipientAvatar={avatar}
                recipientEquippedItem={equippedItem}
            />
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {/* Custom Header */}
            <View style={[styles.chatHeader, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
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
                    <Text style={[styles.chatHeaderTitle, { color: theme.colors.text }]}>{name}</Text>
                </View>
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
        </KeyboardAvoidingView>
    );
}

// Helper component for message bubble
const MessageBubble = ({ message, theme, recipientAvatar, recipientEquippedItem }) => {
    const [isMyMessage, setIsMyMessage] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user?.id === message.sender_id) {
                setIsMyMessage(true);
            }
        });
    }, []);

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
                isMyMessage ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surface }
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
                        isMyMessage ? { color: '#fff' } : { color: theme.colors.text }
                    ]}>
                        {message.content}
                    </Text>
                ) : null}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isMyMessage && (
                    <View style={{ marginLeft: 6 }}>
                        <AnimatedAvatarBorder
                            avatarSource={message.sender?.avatar_url ? { uri: message.sender.avatar_url } : defaultUserImage}
                            size={16}
                            borderStyle={message.sender?.equipped_item ? BORDER_STYLES[message.sender.equipped_item.image_url] : {}}
                            isRainbow={message.sender?.equipped_item && BORDER_STYLES[message.sender.equipped_item.image_url]?.rainbow}
                            isAnimated={false}
                        />
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
        marginTop: 4,
    },
});
