import { supabase } from '../lib/supabase';

export const fetchChannels = async (userId) => {
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
    return data || [];
};

export const fetchMessages = async (channelId, from, to) => {
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
        .order('created_at', { ascending: false })
        .range(from, to);
    
    if (error) throw error;
    return data || [];
};

export const createChannel = async (channelData) => {
    const { data, error } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const addChannelMembers = async (members) => {
    const { data, error } = await supabase
        .from('channel_members')
        .insert(members)
        .select();
    
    if (error) throw error;
    return data || [];
};

export const sendMessage = async (messageData) => {
    const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const updateMessage = async (messageId, updateData) => {
    const { data, error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', messageId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const markChannelAsRead = async (channelId, userId) => {
    const now = new Date().toISOString();
    const { error } = await supabase
        .from('channel_members')
        .update({ last_read_at: now })
        .eq('channel_id', channelId)
        .eq('user_id', userId);
    
    if (error) throw error;
    return true;
};

export const addMessageReaction = async (reactionData) => {
    const { data, error } = await supabase
        .from('message_reactions')
        .insert(reactionData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const removeMessageReaction = async (messageId, userId, emoji) => {
    const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
    
    if (error) throw error;
    return true;
};

export const removeAllUserReactionsFromMessage = async (messageId, userId) => {
    const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId);
    
    if (error) throw error;
    return true;
};

export const uploadChatAttachment = async (filePath, fileBody) => {
    const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, fileBody);
    
    if (error) throw error;
    return data;
};

export const getChatAttachmentUrl = (filePath) => {
    const { data } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);
    return data?.publicUrl;
};

export const searchChannelMessages = async (channelId, query) => {
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
    if (error) throw error;
    return data || [];
};

export const fetchRecipientReadStatus = async (channelId, userId) => {
    const { data, error } = await supabase
        .from('channel_members')
        .select('last_read_at')
        .eq('channel_id', channelId)
        .neq('user_id', userId);
    
    if (error) throw error;
    return data;
};

export const fetchChannelById = async (channelId) => {
    const { data, error } = await supabase
        .from('channels')
        .select('type')
        .eq('id', channelId)
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const subscribeToMemberStatus = (channelId, userId, onUpdate) => {
    return supabase
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
                if (payload.new.user_id !== userId) {
                    onUpdate(payload.new.last_read_at);
                }
            }
        )
        .subscribe();
};

export const unsubscribeFromMemberStatus = (channel) => {
    if (channel) {
        supabase.removeChannel(channel);
    }
};
