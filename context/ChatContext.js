import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children, session }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const subscriptions = useRef({});

  const user = session?.user;

  // Fetch channels on mount
  useEffect(() => {
    if (user) {
      fetchChannels();
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

      setUnreadCount(count);
      setChannels(sortedChannels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      showToast('Failed to load chats', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender: users (id, full_name, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(prev => ({
        ...prev,
        [channelId]: data
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToast('Failed to load messages', 'error');
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

  const subscribeToChannel = (channelId) => {
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
          // Fetch sender details for the new message
          const { data: senderData, error } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            sender: senderData || { id: payload.new.sender_id, full_name: 'Unknown' } // Fallback
          };

          setMessages(prev => ({
            ...prev,
            [channelId]: [...(prev[channelId] || []), newMessage]
          }));
        }
      )
      .subscribe();

    subscriptions.current[channelId] = sub;
  };

  const unsubscribeFromChannel = (channelId) => {
    if (subscriptions.current[channelId]) {
      supabase.removeChannel(subscriptions.current[channelId]);
      delete subscriptions.current[channelId];
    }
  };

  const sendMessage = async (channelId, content, attachments = []) => {
    try {
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content,
          attachments
        });

      if (error) throw error;
      // Realtime subscription will handle updating the UI
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
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
      user,
      unreadCount,
      fetchChannels,
      fetchMessages,
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
