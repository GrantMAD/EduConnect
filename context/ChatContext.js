import React, { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase'; // keeping for real-time subscription
import { AppState } from 'react-native';
import { useToastActions } from './ToastContext';

// Import services
import { getUserProfile } from '../services/userService';
import { 
  fetchChannels as fetchChannelsService, 
  fetchMessages as fetchMessagesService,
  updateMessage,
  markChannelAsRead,
  addMessageReaction,
  removeMessageReaction,
  removeAllUserReactionsFromMessage,
  createChannel as createChannelService,
  addChannelMembers,
  sendMessage as sendMessageService,
  uploadChatAttachment,
  getChatAttachmentUrl,
  searchChannelMessages
} from '../services/chatService';
import { fetchUsersEquippedItems } from '../services/gamificationService';

const ChatStateContext = createContext();
const ChatActionsContext = createContext();

export const useChat = () => {
  const state = useContext(ChatStateContext);
  const actions = useContext(ChatActionsContext);
  if (!state || !actions) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return { ...state, ...actions };
};

export const useChatState = () => {
  const context = useContext(ChatStateContext);
  if (!context) {
    throw new Error('useChatState must be used within a ChatProvider');
  }
  return context;
};

export const useChatActions = () => {
  const context = useContext(ChatActionsContext);
  if (!context) {
    throw new Error('useChatActions must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children, session }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState({}); // Track loading per channel
  const [userProfile, setUserProfile] = useState(null); // Store user profile
  const { showToast } = useToastActions();
  const subscriptions = useRef({});

  const user = session?.user;
  const channelsRef = useRef([]);

  // Keep ref in sync with channels state
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const data = await getUserProfile(user.id);
          if (data) {
            setUserProfile(data);
          }
        } catch (e) {
          console.error('Error fetching user profile:', e);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  // Fetch channels on mount and when app becomes active
  useEffect(() => {
    if (user) {
      fetchChannels();

      // Listen for app state changes
      const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          // Refresh channels when app becomes active
          fetchChannels();
        }
      });

      // Global real-time subscription for new messages in any channel
      const globalMessageSubscription = supabase
        .channel('global-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async (payload) => {
            const newMessage = payload.new;

            // Use ref to access current channels without causing re-renders
            const userChannel = channelsRef.current.find(c => c.id === newMessage.channel_id);

            if (userChannel && newMessage.sender_id !== user.id) {
              // Refresh channels to update unread count
              fetchChannels();
            }
          }
        )
        .subscribe();

      return () => {
        appStateSubscription.remove();
        supabase.removeChannel(globalMessageSubscription);
      };
    } else {
      setChannels([]);
      setMessages({});
    }
  }, [user]);

  const fetchEquippedItemsMap = useCallback(async (userIds) => {
    const validUserIds = userIds?.filter(id => id != null) || []
    if (validUserIds.length === 0) return {}

    try {
      const data = await fetchUsersEquippedItems(validUserIds);

      const resultMap = data.reduce((acc, curr) => {
        if (!acc[curr.user_id]) acc[curr.user_id] = {}

        const itemData = Array.isArray(curr.shop_items) ? curr.shop_items[0] : curr.shop_items
        if (itemData) {
          const cat = itemData.category
          if (cat === 'avatar_border' || cat === 'border' || !cat) {
            acc[curr.user_id].border = itemData
          } else if (cat === 'name_color') {
            acc[curr.user_id].nameColor = itemData
          } else if (cat === 'title') {
            acc[curr.user_id].title = itemData
          } else if (cat === 'bubble_style') {
            acc[curr.user_id].bubbleStyle = itemData
          }
        }
        return acc
      }, {})

      return resultMap
    } catch (error) {
      console.error('Error fetching equipped items map:', error);
      return {}
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await fetchChannelsService(user.id);

      // Manually fetch equipped items for all users in these channels
      const userIds = new Set();
      data.forEach(channel => {
        channel.channel_members?.forEach(member => {
          if (member.user_id) userIds.add(member.user_id);
        });
      });

      if (userIds.size > 0) {
        const equippedItemsMap = await fetchEquippedItemsMap(Array.from(userIds));

        // Inject into the data structure
        data.forEach(channel => {
          channel.channel_members?.forEach(member => {
            if (member.users) {
              member.users.equippedItems = equippedItemsMap[member.user_id] || {};
              // Backward compatibility for generic 'equipped_item' (border)
              member.users.equipped_item = member.users.equippedItems.border;
            }
          });
        });
      }

      // Calculate unread count
      let count = 0;
      const sortedChannels = data.sort((a, b) => {
        const timeA = a.last_message?.[0]?.created_at || a.created_at;
        const timeB = b.last_message?.[0]?.created_at || b.created_at;
        return new Date(timeB) - new Date(timeA);
      });

      sortedChannels.forEach(channel => {
        // Find the current user's membership record
        const myMember = channel.channel_members.find(m => m.user_id === user.id);
        const lastMessage = channel.last_message?.[0];
        const lastMsgTime = lastMessage?.created_at;
        const lastMsgSenderId = lastMessage?.sender_id;

        // Reset hasUnread to false by default
        channel.hasUnread = false;

        // Don't mark as unread if the current user sent the last message
        if (lastMsgTime && myMember && lastMsgSenderId !== user.id) {
          // If there's a last_read_at, compare it with the last message time
          if (myMember.last_read_at) {
            if (new Date(lastMsgTime) > new Date(myMember.last_read_at)) {
              count++;
              channel.hasUnread = true;
            }
          } else {
            // If no last_read_at exists, treat as unread
            count++;
            channel.hasUnread = true;
          }
        }
      });

      // Deduplicate channels to prevent key errors
      const uniqueChannelsMap = new Map();
      sortedChannels.forEach(c => uniqueChannelsMap.set(c.id, c));
      const uniqueChannels = Array.from(uniqueChannelsMap.values());

      setUnreadCount(count);
      setChannels(uniqueChannels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      showToast('Failed to load chats', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchEquippedItemsMap, showToast]);

  const fetchMessages = useCallback(async (channelId, start = 0, limit = 20) => {
    // Prevent multiple simultaneous loads for the same channel
    if (loadingMessages[channelId] && start === 0) return 0;

    try {
      if (start === 0) {
        setLoadingMessages(prev => ({ ...prev, [channelId]: true }));
      }

      const data = await fetchMessagesService(channelId, start, start + limit - 1);

      // Fetch equipped items for all senders
      const senderIds = [...new Set(data.map(msg => msg.sender_id))];

      if (senderIds.length > 0) {
        const equippedItemsMap = await fetchEquippedItemsMap(senderIds);

        // Inject equippedItems into sender objects
        data.forEach(msg => {
          if (msg.sender) {
            msg.sender.equippedItems = equippedItemsMap[msg.sender_id] || {};
            msg.sender.equipped_item = msg.sender.equippedItems.border;
          }
        });
      }

      setMessages(prev => {
        const currentMessages = prev[channelId] || [];
        // If start is 0, replace entirely. Otherwise append.
        const newMessages = start === 0 ? (data || []) : [...currentMessages, ...data];
        return {
          ...prev,
          [channelId]: newMessages
        };
      });

      return (data || []).length;
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to load messages', 'error');
      return 0;
    } finally {
      setLoadingMessages(prev => ({ ...prev, [channelId]: false }));
    }
  }, [fetchEquippedItemsMap, showToast]);

  const fetchOlderMessages = useCallback(async (channelId) => {
    const currentMessages = messages[channelId] || [];
    const start = currentMessages.length;
    return await fetchMessages(channelId, start);
  }, [messages, fetchMessages]);

  const editMessage = useCallback(async (messageId, newContent) => {
    try {
      // Optimistic update
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              return { ...msg, content: newContent, edited_at: new Date().toISOString() };
            }
            return msg;
          });
        });
        return updatedMessages;
      });

      await updateMessage(messageId, { content: newContent, edited_at: new Date().toISOString() });
    } catch (error) {
      console.error('Error editing message:', error);
      showToast('Failed to edit message', 'error');
      throw error;
    }
  }, [user?.id, showToast]);

  const deleteMessage = useCallback(async (messageId) => {
    try {
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              return { ...msg, is_deleted: true, content: '🗑️ This message was deleted' };
            }
            return msg;
          });
        });
        return updatedMessages;
      });

      await updateMessage(messageId, { is_deleted: true, content: '🗑️ This message was deleted' });
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('Failed to delete message', 'error');
      throw error;
    }
  }, [user?.id, showToast]);

  const pinMessage = useCallback(async (messageId, isPinned) => {
    try {
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              return { ...msg, is_pinned: isPinned };
            }
            return msg;
          });
        });
        return updatedMessages;
      });

      await updateMessage(messageId, { is_pinned: isPinned });
    } catch (error) {
      console.error('Error pinning message:', error);
      showToast('Failed to pin message', 'error');
      throw error;
    }
  }, [showToast]);

  const searchMessages = useCallback(async (channelId, query) => {
    try {
      const data = await searchChannelMessages(channelId, query);
      return data;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, []);

  const markAsRead = useCallback(async (channelId) => {
    try {
      if (!user) return;

      setChannels(prev => prev.map(c => {
        if (c.id === channelId) return { ...c, hasUnread: false };
        return c;
      }));

      setUnreadCount(prev => {
        const channel = channelsRef.current.find(c => c.id === channelId);
        if (channel && channel.hasUnread) return Math.max(0, prev - 1);
        return prev;
      });

      await markChannelAsRead(channelId, user.id);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user?.id]);

  const addReaction = useCallback(async (messageId, emoji) => {
    try {
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              const currentReactions = msg.message_reactions || [];
              const otherReactions = currentReactions.filter(r => r.user_id !== user.id);
              return {
                ...msg,
                message_reactions: [...otherReactions, { id: `temp-${Date.now()}`, message_id: messageId, user_id: user.id, emoji }]
              };
            }
            return msg;
          });
        });
        return updatedMessages;
      });

      await removeAllUserReactionsFromMessage(messageId, user.id);
      await addMessageReaction({ message_id: messageId, user_id: user.id, emoji });
    } catch (error) {
      console.error('Error adding reaction:', error);
      showToast('Failed to add reaction', 'error');
    }
  }, [user?.id, showToast]);

  const removeReaction = useCallback(async (messageId, emoji) => {
    try {
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              const currentReactions = msg.message_reactions || [];
              return {
                ...msg,
                message_reactions: currentReactions.filter(r => !(r.user_id === user.id && r.emoji === emoji))
              };
            }
            return msg;
          });
        });
        return updatedMessages;
      });

      await removeMessageReaction(messageId, user.id, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
      showToast('Failed to remove reaction', 'error');
    }
  }, [user?.id, showToast]);

  const sendTypingEvent = useCallback(async (channelId) => {
    try {
      if (subscriptions.current[channelId]) {
        await subscriptions.current[channelId].send({
          type: 'broadcast',
          event: 'typing',
          payload: {
            userId: user.id,
            fullName: userProfile?.full_name || user.user_metadata?.full_name || 'Someone'
          }
        });
      }
    } catch (error) {
      console.error('Error sending typing event:', error);
    }
  }, [user?.id, userProfile]);

  const subscribeToChannel = useCallback((channelId, onTyping) => {
    if (subscriptions.current[channelId]) return;

    const sub = supabase
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMsg = payload.new;

          const senderData = await getUserProfile(newMsg.sender_id);

          const equippedItemsMap = await fetchEquippedItemsMap([newMsg.sender_id]);

          const message = {
            ...newMsg,
            sender: senderData ? {
              ...senderData,
              equippedItems: equippedItemsMap[newMsg.sender_id] || {},
              equipped_item: equippedItemsMap[newMsg.sender_id]?.border
            } : { id: newMsg.sender_id, full_name: 'Unknown' },
            message_reactions: []
          };

          setMessages(prev => {
            const current = prev[channelId] || [];
            if (current.some(m => m.id === message.id)) return prev;
            return { ...prev, [channelId]: [message, ...current] };
          });

          setChannels(prev => {
            const idx = prev.findIndex(c => c.id === channelId);
            if (idx === -1) return prev;

            const updatedChannel = {
              ...prev[idx],
              last_message: [{
                content: message.content,
                created_at: message.created_at,
                sender_id: message.sender_id,
                attachments: message.attachments
              }]
            };

            const newChannels = [...prev];
            newChannels.splice(idx, 1);
            newChannels.unshift(updatedChannel);
            return newChannels;
          });
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (onTyping) onTyping(payload.payload);
      })
      .subscribe();

    subscriptions.current[channelId] = sub;
  }, [fetchEquippedItemsMap]);

  const unsubscribeFromChannel = useCallback((channelId) => {
    if (subscriptions.current[channelId]) {
      supabase.removeChannel(subscriptions.current[channelId]);
      delete subscriptions.current[channelId];
    }
  }, []);

  const sendMessage = useCallback(async (channelId, content, attachments = [], replyToMessageId = null) => {
    const tempId = `temp-${Date.now()}`;

    try {
      if (!user) throw new Error('Not authenticated');

      const equippedItemsMap = await fetchEquippedItemsMap([user.id]);
      const myEquipped = equippedItemsMap[user.id] || {};

      const optimisticMessage = {
        id: tempId,
        channel_id: channelId,
        sender_id: user.id,
        content,
        created_at: new Date().toISOString(),
        attachments,
        reply_to_message_id: replyToMessageId,
        sender: {
          id: user.id,
          full_name: userProfile?.full_name || 'Me',
          avatar_url: userProfile?.avatar_url || user.user_metadata?.avatar_url,
          equippedItems: myEquipped
        },
        message_reactions: [],
        reply_to_message: replyToMessageId ? (messages[channelId]?.find(m => m.id === replyToMessageId) || null) : null
      };

      setMessages(prev => ({
        ...prev,
        [channelId]: [optimisticMessage, ...(prev[channelId] || [])]
      }));

      setChannels(prev => {
        const channelIndex = prev.findIndex(c => c.id === channelId);
        if (channelIndex === -1) return prev;

        const updatedChannel = {
          ...prev[channelIndex],
          last_message: [{
            content: content,
            created_at: new Date().toISOString(),
            sender_id: user.id,
            attachments: attachments
          }]
        };

        const newChannels = [...prev];
        newChannels.splice(channelIndex, 1);
        newChannels.unshift(updatedChannel);
        return newChannels;
      });

      const data = await sendMessageService({
        channel_id: channelId,
        sender_id: user.id,
        content,
        attachments,
        reply_to_message_id: replyToMessageId
      });

      setMessages(prev => {
        const current = prev[channelId] || [];
        const exists = current.some(m => m.id === data.id);

        if (exists) {
          return { ...prev, [channelId]: current.filter(m => m.id !== tempId) };
        } else {
          return {
            ...prev,
            [channelId]: current.map(m => m.id === tempId ? { ...m, ...data, id: data.id } : m)
          };
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
      setMessages(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || []).filter(m => m.id !== tempId)
      }));
      throw error;
    }
  }, [user, userProfile, messages, fetchEquippedItemsMap, showToast]);

  const createChannel = useCallback(async (name, type, memberIds = [], classId = null) => {
    try {
      if (!user) throw new Error('Not authenticated');

      // Check if it's a direct message and if a channel already exists
      if (type === 'direct' && memberIds.length === 1) {
        const otherUserId = memberIds[0];
        
        // Find if we already have a direct channel with this user
        const existingChannel = channels.find(c => 
          c.type === 'direct' && 
          c.channel_members.some(m => m.user_id === otherUserId) &&
          c.channel_members.some(m => m.user_id === user.id)
        );

        if (existingChannel) {
          return existingChannel;
        }
      }

      let currentSchoolId = userProfile?.school_id || user.user_metadata?.school_id;

      // Fallback: if no school_id, try to fetch profile again
      if (!currentSchoolId) {
        const freshProfile = await getUserProfile(user.id);
        if (freshProfile?.school_id) {
          currentSchoolId = freshProfile.school_id;
          setUserProfile(freshProfile);
        }
      }

      if (!currentSchoolId) {
        throw new Error('User has no school association');
      }

      const channel = await createChannelService({
        name,
        type,
        class_id: classId,
        school_id: currentSchoolId,
        created_by: user.id
      });

      // 1. First, always add the current user
      await addChannelMembers([{
        channel_id: channel.id,
        user_id: user.id
      }]);

      // 2. Then add any other members if specified
      if (memberIds && memberIds.length > 0) {
        const otherMembers = memberIds.map(uid => ({
          channel_id: channel.id,
          user_id: uid
        }));
        await addChannelMembers(otherMembers);
      }

      fetchChannels();
      return channel;
    } catch (error) {
      console.error('Error creating channel details:', {
        message: error.message,
        code: error.code,
        userId: user?.id,
        schoolId: userProfile?.school_id || user?.user_metadata?.school_id
      });
      showToast('Failed to create channel', 'error');
      throw error;
    }
  }, [user, userProfile, fetchChannels, showToast]);

  const uploadAttachment = useCallback(async (uri, fileName, type) => {
    try {
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type });

      const fileExt = fileName.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      await uploadChatAttachment(filePath, formData);

      const publicUrl = getChatAttachmentUrl(filePath);

      return {
        url: publicUrl,
        type: type.startsWith('image/') ? 'image' : 'file',
        name: fileName
      };

    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload file', 'error');
      throw error;
    }
  }, [user?.id, showToast]);

  const stateValue = React.useMemo(() => ({
    channels,
    messages,
    loading,
    loadingMessages,
    user,
    unreadCount,
  }), [channels, messages, loading, loadingMessages, user, unreadCount]);

  const actionsValue = React.useMemo(() => ({
    fetchChannels,
    fetchMessages,
    fetchOlderMessages,
    editMessage,
    deleteMessage,
    pinMessage,
    searchMessages,
    addReaction,
    removeReaction,
    sendTypingEvent,
    subscribeToChannel,
    unsubscribeFromChannel,
    sendMessage,
    createChannel,
    uploadAttachment,
    markAsRead
  }), [
    fetchChannels, fetchMessages, fetchOlderMessages, editMessage,
    deleteMessage, pinMessage, searchMessages, addReaction,
    removeReaction, sendTypingEvent, subscribeToChannel,
    unsubscribeFromChannel, sendMessage, createChannel,
    uploadAttachment, markAsRead
  ]);

  return (
    <ChatStateContext.Provider value={stateValue}>
      <ChatActionsContext.Provider value={actionsValue}>
        {children}
      </ChatActionsContext.Provider>
    </ChatStateContext.Provider>
  );
};