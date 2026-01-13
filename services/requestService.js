import { supabase } from '../lib/supabase';

export const handleJoinRequest = async (requestId, approved) => {
    const { data, error } = await supabase.rpc('handle_join_request', {
        p_notification_id: requestId,
        p_accept: approved
    });
    
    if (error) throw error;
    return data;
};

export const fetchJoinRequestById = async (requestId) => {
    const { data, error } = await supabase
        .from('school_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();
    
    if (error) throw error;
    return data;
};

export const updateJoinRequest = async (requestId, status) => {
    const { data, error } = await supabase
        .from('school_join_requests')
        .update({ status })
        .eq('id', requestId)
        .select();
    
    if (error) throw error;
    return data[0];
};
