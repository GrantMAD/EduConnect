import { supabase } from '../lib/supabase';

export const fetchNotifications = async (userId) => {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const markAsRead = async (notificationId) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    
    if (error) throw error;
    return true;
};

export const markAllAsRead = async (userId) => {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
    
    if (error) throw error;
    return true;
};

export const deleteNotification = async (notificationId) => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    
    if (error) throw error;
    return true;
};

export const sendNotification = async (notificationData) => {
    const { error } = await supabase
        .from('notifications')
        .insert([notificationData]);
    
    if (error) throw error;
    return true;
};

export const sendBatchNotifications = async (notifications) => {
    const { error } = await supabase
        .from('notifications')
        .insert(notifications);
    
    if (error) throw error;
    return true;
};

export const fetchClubJoinRequests = async (userId) => {

    const { data, error } = await supabase

        .from('notifications')

        .select('*, sender:users!related_user_id(id, full_name, email, avatar_url)')

        .eq('type', 'club_join_request')

        .eq('user_id', userId)

        .is('is_read', false);

    

    if (error) throw error;

    return data || [];

};


export const clearAllNotifications = async (userId) => {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
    
    if (error) throw error;
    return true;
};





