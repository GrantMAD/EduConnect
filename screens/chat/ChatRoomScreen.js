import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPaperPlane, faPaperclip, faImage } from '@fortawesome/free-solid-svg-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function ChatRoomScreen({ route, navigation }) {
    const { channelId, name } = route.params;
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
        const isMyMessage = item.sender_id === item.sender?.id; // Logic might need adjustment based on auth user availability in this scope, but for now assuming sender_id check against context user is better done if we pass user to this component or use hook.
        // Actually, we need the current user ID to know if it's "my" message.
        // Let's assume we can get it from supabase.auth or context.
        // For now, let's just style based on sender_id.

        // We need to know who the current user is.
        // Let's use a quick hook or prop if possible, but for now let's just render.
        // Ideally we should pass `user` from `useChat` or `useAuth`.

        return (
            <View style={[
                styles.messageContainer,
                // We need to differentiate left/right. 
                // Since we don't have `user` here easily without importing supabase or context, let's import supabase to check current user.
                // Or better, update ChatContext to export `user`.
            ]}>
                <MessageBubble message={item} theme={theme} />
            </View>
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
                <Text style={[styles.chatHeaderTitle, { color: theme.colors.text }]}>{name}</Text>
            </View>

            <FlatList
                ref={flatListRef}
                data={channelMessages}
                keyExtractor={item => item.id}
                renderItem={({ item }) => <MessageBubble message={item} theme={theme} />}
                contentContainerStyle={styles.listContent}
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
import { supabase } from '../../lib/supabase';

const MessageBubble = ({ message, theme }) => {
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
            <Text style={[styles.timestamp, { color: theme.colors.textSecondary, alignSelf: isMyMessage ? 'flex-end' : 'flex-start' }]}>
                {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
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
        alignItems: 'center',
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
        borderTopWidth: 1,
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
        marginHorizontal: 4,
    },
});
