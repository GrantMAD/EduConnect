import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
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

  const fetchChannels = async () => {
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
            sender_id
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
        const { data: inventoryData } = await supabase
          .from('user_inventory')
          .select('user_id, shop_items(image_url)')
          .in('user_id', Array.from(userIds))
          .eq('is_equipped', true);

        if (inventoryData) {
          const inventoryMap = {};
          inventoryData.forEach(item => {
            // Handle potential array or object response for shop_items
            const shopItem = Array.isArray(item.shop_items) ? item.shop_items[0] : item.shop_items;
            inventoryMap[item.user_id] = shopItem;
          });

          // Inject into the data structure
          data.forEach(channel => {
            channel.channel_members?.forEach(member => {
              if (member.users) {
                member.users.equipped_item = inventoryMap[member.user_id];
              }
            });
          });
        }
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
  };

  const fetchMessages = async (channelId, start = 0, limit = 20) => {
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

      // Manually fetch reply_to_message data for messages that have reply_to_message_id
      const messagesWithReplies = data.filter(msg => msg.reply_to_message_id);

      if (messagesWithReplies.length > 0) {
        const replyIds = messagesWithReplies.map(msg => msg.reply_to_message_id);

        const { data: replyMessages } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            sender:users!sender_id (
              full_name
            )
          `)
          .in('id', replyIds);

        if (replyMessages) {
          // Create a map of reply messages
          const replyMap = {};
          replyMessages.forEach(reply => {
            replyMap[reply.id] = reply;
          });

          // Attach reply_to_message to the correct messages
          data.forEach(msg => {
            if (msg.reply_to_message_id && replyMap[msg.reply_to_message_id]) {
              msg.reply_to_message = replyMap[msg.reply_to_message_id];
            }
          });
        }
      }

      // Fetch equipped items for all senders
      const senderIds = [...new Set(data.map(msg => msg.sender_id))];

      if (senderIds.length > 0) {
        const { data: inventoryData } = await supabase
          .from('user_inventory')
          .select('user_id, shop_items(image_url)')
          .in('user_id', senderIds)
          .eq('is_equipped', true);

        if (inventoryData) {
          const inventoryMap = {};
          inventoryData.forEach(item => {
            const shopItem = Array.isArray(item.shop_items) ? item.shop_items[0] : item.shop_items;
            inventoryMap[item.user_id] = shopItem;
          });

          // Inject equipped_item into sender objects
          data.forEach(msg => {
            if (msg.sender) {
              msg.sender.equipped_item = inventoryMap[msg.sender_id];
            }
          });
        }
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
  };

  const fetchOlderMessages = async (channelId) => {
    const currentMessages = messages[channelId] || [];
    const start = currentMessages.length;
    return await fetchMessages(channelId, start);
  };

  const editMessage = async (messageId, newContent) => {
    try {
      // Optimistic update - update UI immediately
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                content: newContent,
                edited_at: new Date().toISOString()
              };
            }
            return msg;
          });
        });
        return updatedMessages;
      });

      // Perform the actual database update
      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error editing message:', error);
      showToast('Failed to edit message', 'error');
      throw error;
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      // Optimistic update - update UI immediately
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                is_deleted: true,
                content: '🗑️ This message was deleted'
              };
            }
            return msg;
          });
        });
        return updatedMessages;
      });

      // Perform the actual database update
      const { error } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          content: '🗑️ This message was deleted'
        })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting message:', error);
      showToast('Failed to delete message', 'error');
      throw error;
    }
  };

  const pinMessage = async (messageId, isPinned) => {
    try {
      // Optimistic update - update UI immediately
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                is_pinned: isPinned
              };
            }
            return msg;
          });
        });
        return updatedMessages;
      });

      // Perform the actual database update
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
  };

  const searchMessages = async (channelId, query) => {
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
  };

  const markAsRead = async (channelId) => {
    try {
      if (!user) return;

      const now = new Date().toISOString();

      // Optimistic update
      setChannels(prev => prev.map(c => {
        if (c.id === channelId) {
          return { ...c, hasUnread: false };
        }
        return c;
      }));

      // Recalculate unread count
      setUnreadCount(prev => {
        const channel = channels.find(c => c.id === channelId);
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
  };

  // Reactions are stored in the 'message_reactions' table in Supabase.
  // Each row links a message_id, user_id, and an emoji.
  const addReaction = async (messageId, emoji) => {
    try {
      // Optimistic update
      setMessages(prev => {
        const updatedMessages = {};
        Object.keys(prev).forEach(channelId => {
          updatedMessages[channelId] = prev[channelId].map(msg => {
            if (msg.id === messageId) {
              const currentReactions = msg.message_reactions || [];

              // Filter out ANY existing reaction by this user to enforce single reaction
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

      // Remove any existing reaction by this user on this message first
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);

      // Then insert the new one
      const { error } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error adding reaction:', error);
      showToast('Failed to add reaction', 'error');
      // Revert optimistic update (optional, but good practice - for now we'll rely on the subscription to fix it eventually or a refresh)
    }
  };

  const removeReaction = async (messageId, emoji) => {
    try {
      // Optimistic update
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
  };

  const sendTypingEvent = async (channelId) => {
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
  };

  const subscribeToChannel = (channelId, onTyping) => {
    if (subscriptions.current[channelId]) return;

    const sub = supabase
      .channel(`chat:${channelId}`)
      // Listen for new messages
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('📨 Realtime message received for channel', channelId, payload.new);

          const newMsg = payload.new;

          // Fetch sender info
          const { data: senderData } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();

          // Fetch reply message if applicable
          let replyData = null;
          if (newMsg.reply_to_message_id) {
            const { data: rData } = await supabase
              .from('messages')
              .select('id, content, sender:users!sender_id(full_name)')
              .eq('id', newMsg.reply_to_message_id)
              .single();
            replyData = rData;
          }

          const message = {
            ...newMsg,
            sender: senderData || { id: newMsg.sender_id, full_name: 'Unknown' },
            message_reactions: [],
            reply_to_message: replyData
          };

          // Prepend to messages state
          setMessages(prev => {
            const current = prev[channelId] || [];
            if (current.some(m => m.id === message.id)) return prev; // prevent duplicates
            return { ...prev, [channelId]: [message, ...current] };
          });

          // Optionally update channel's last_message
          setChannels(prev => {
            const idx = prev.findIndex(c => c.id === channelId);
            if (idx === -1) return prev;

            const updatedChannel = {
              ...prev[idx],
              last_message: [{
                content: message.content || (message.attachments?.length ? 'Sent an attachment' : ''),
                created_at: message.created_at,
                sender_id: message.sender_id
              }]
            };

            const newChannels = [...prev];
            newChannels.splice(idx, 1);
            newChannels.unshift(updatedChannel);
            return newChannels;
          });
        }
      )
      // Listen for typing events
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (onTyping) onTyping(payload.payload);
      })
      .subscribe((status, err) => {
        console.log(`🔌 Subscription status for channel ${channelId}:`, status);
        if (err) console.error('❌ Subscription error:', err);
      });

    subscriptions.current[channelId] = sub;
  };

  const unsubscribeFromChannel = (channelId) => {
    if (subscriptions.current[channelId]) {
      supabase.removeChannel(subscriptions.current[channelId]);
      delete subscriptions.current[channelId];
    }
  };

  const sendMessage = async (channelId, content, attachments = [], replyToMessageId = null) => {
    // Generate a temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;

    try {
      if (!user) throw new Error('Not authenticated');

      // 1. Optimistic Update
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
          full_name: user.user_metadata?.full_name || 'Me',
          avatar_url: user.user_metadata?.avatar_url
        },
        message_reactions: [],
        // We'll try to find the reply message from local state if possible
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
            content: content || (attachments.length > 0 ? 'Sent an attachment' : ''),
            created_at: new Date().toISOString(),
            sender_id: user.id
          }]
        };

        const newChannels = [...prev];
        newChannels.splice(channelIndex, 1);
        newChannels.unshift(updatedChannel);
        return newChannels;
      });

      // 2. Perform Insert
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



      // 4. Update Optimistic Message with Real Data
      setMessages(prev => {
        const current = prev[channelId] || [];
        // Check if the real message was already added by subscription
        const exists = current.some(m => m.id === data.id);

        if (exists) {
          // If it exists, just remove the temp one
          return {
            ...prev,
            [channelId]: current.filter(m => m.id !== tempId)
          };
        } else {
          // Otherwise, update the temp one to be the real one
          // We need to preserve the sender/reply objects we constructed if the response doesn't have them populated yet
          // But actually, the subscription might fetch them. 
          // Let's just merge the real data into the optimistic one, keeping the structure.
          return {
            ...prev,
            [channelId]: current.map(m => m.id === tempId ? { ...m, ...data, id: data.id } : m)
          };
        }
      });

    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
      // Remove the optimistic message on error
      setMessages(prev => ({
        ...prev,
        [channelId]: (prev[channelId] || []).filter(m => m.id !== tempId)
      }));
      throw error;
    }
  };

  const createChannel = async (name, type, memberIds = [], classId = null) => {
    try {
      if (!user) throw new Error('Not authenticated');

      // 1. Create Channel
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          name,
          type,
          class_id: classId,
          school_id: user.user_metadata?.school_id, // Assuming metadata has school_id, or fetch it
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // 2. Add Members (Creator + selected members)
      const members = [user.id, ...memberIds].map(uid => ({
        channel_id: channel.id,
        user_id: uid,
        role: uid === user.id ? 'admin' : 'member'
      }));

      const { error: membersError } = await supabase
        .from('channel_members')
        .insert(members);

      if (membersError) throw membersError;

      // Refresh channels list
      fetchChannels();
      return channel;
    } catch (error) {
      console.error('Error creating channel:', error);
      showToast('Failed to create channel', 'error');
      throw error;
    }
  };

  const uploadAttachment = async (uri, fileName, type) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type,
      });

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
  }

  return (
    <ChatContext.Provider value={{
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
    }}>
      {children}
    </ChatContext.Provider>
  );
};
