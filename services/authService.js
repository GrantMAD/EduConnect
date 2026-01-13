import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PLATFORM = 'mobile';

const getClientId = async () => {
    let clientId = await AsyncStorage.getItem('edulink_client_id');
    if (!clientId) {
        clientId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        await AsyncStorage.setItem('edulink_client_id', clientId);
    }
    return clientId;
};

export const registerPlatformSession = async (userId) => {
    const clientId = await getClientId();
    const { error } = await supabase
        .from('user_platform_sessions')
        .upsert({
            user_id: userId,
            platform: PLATFORM,
            client_id: clientId,
            updated_at: new Date().toISOString()
        });
    if (error) console.error('Error registering platform session:', error);
};

export const checkPlatformSession = async (userId) => {
    const clientId = await getClientId();
    const { data, error } = await supabase
        .from('user_platform_sessions')
        .select('client_id')
        .eq('user_id', userId)
        .eq('platform', PLATFORM)
        .maybeSingle();

    if (error) return true; // Assume okay if check fails
    return data?.client_id === clientId;
};

export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    if (data?.user) {
        await registerPlatformSession(data.user.id);
    }
    return data;
};

export const signUp = async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options,
    });
    if (error) throw error;
    if (data?.user && data?.session) {
        await registerPlatformSession(data.user.id);
    }
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
};

export const resetPassword = async (email, redirectTo) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
    });
    if (error) throw error;
};

export const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });
    if (error) throw error;
};

export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
};

export const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
};

export const onAuthStateChange = (callback) => {
    return supabase.auth.onAuthStateChange(callback);
};
