import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children, session }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState({}); // Track loading per channel
  const [userProfile, setUserProfile] = useState(null); // Store user profile
  const { showToast } = useToast();
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
          const { data, error } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .single();

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
      const { data, error } = await supabase
        .from('user_inventory')
        .select('user_id, item_id, shop_items(*)')
        .in('user_id', validUserIds)
        .eq('is_equipped', true)

      if (error) return {}

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
      return {}
    }
  }, []);

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('channels')
        .select(`
          *,
          channel_members!inner (
            user_id,
            last_read_at,
            users (
              id,
              full_name,
              avatar_url
            )
          ),
          last_message: messages (
            content,
            created_at,
            sender_id,
            attachments
          )
        `)
        .order('created_at', { ascending: false, foreignTable: 'messages' })
        .limit(1, { foreignTable: 'messages' });

      if (error) throw error;

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
    try {
      if (start === 0) {
        setLoadingMessages(prev => ({ ...prev, [channelId]: true }));
      }

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender: users!sender_id (
            id,
            full_name,
            avatar_url
          ),
          message_reactions (
            id,
            emoji,
            user_id
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false }) // Newest first
        .range(start, start + limit - 1);

      if (error) throw error;

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
        const newMessages = start === 0 ? data : [...currentMessages, ...data];
        return {
          ...prev,
          [channelId]: newMessages
        };
      });

      return data.length;
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to load messages', 'error');
      return 0;
    } finally {
      if (start === 0) {
        setLoadingMessages(prev => ({ ...prev, [channelId]: false }));
      }
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

      const { error } = await supabase
        .from('messages')
        .update({ content: newContent, edited_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;
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

      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, content: '🗑️ This message was deleted' })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;
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

      const { error } = await supabase
        .from('messages')
        .update({ is_pinned: isPinned })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error pinning message:', error);
      showToast('Failed to pin message', 'error');
      throw error;
    }
  }, [showToast]);

  const searchMessages = useCallback(async (channelId, query) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender: users!sender_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('channel_id', channelId)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, []);

  const markAsRead = useCallback(async (channelId) => {
    try {
      if (!user) return;
      const now = new Date().toISOString();

      setChannels(prev => prev.map(c => {
        if (c.id === channelId) return { ...c, hasUnread: false };
        return c;
      }));

      setUnreadCount(prev => {
        const channel = channelsRef.current.find(c => c.id === channelId);
        if (channel && channel.hasUnread) return Math.max(0, prev - 1);
        return prev;
      });

      const { error } = await supabase
        .from('channel_members')
        .update({ last_read_at: now })
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (error) throw error;
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

      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });

      if (error) throw error;
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

      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) throw error;
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

          const { data: senderData } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();

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
          avatar_url: user.user_metadata?.avatar_url,
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

      const { data, error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content,
          attachments,
          reply_to_message_id: replyToMessageId
        })
        .select()
        .single();

      if (error) throw error;

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

      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name,
          type,
          class_id: classId,
          school_id: user.user_metadata?.school_id,
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      const members = [user.id, ...memberIds].map(uid => ({
        channel_id: channel.id,
        user_id: uid,
        role: uid === user.id ? 'admin' : 'member'
      }));

      const { error: membersError } = await supabase
        .from('channel_members')
        .insert(members);

      if (membersError) throw membersError;

      fetchChannels();
      return channel;
    } catch (error) {
      console.error('Error creating channel:', error);
      showToast('Failed to create channel', 'error');
      throw error;
    }
  }, [user, fetchChannels, showToast]);

  const uploadAttachment = useCallback(async (uri, fileName, type) => {
    try {
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type });

      const fileExt = fileName.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, formData);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

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

  const value = React.useMemo(() => ({
    channels,
    messages,
    loading,
    loadingMessages,
    user,
    unreadCount,
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
    channels, messages, loading, loadingMessages, user, unreadCount,
    fetchChannels, fetchMessages, fetchOlderMessages, editMessage,
    deleteMessage, pinMessage, searchMessages, addReaction,
    removeReaction, sendTypingEvent, subscribeToChannel,
    unsubscribeFromChannel, sendMessage, createChannel,
    uploadAttachment, markAsRead
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};