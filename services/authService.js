import { supabase } from '../lib/supabase';

export const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
};

export const signUp = async (email, password, options = {}) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options,
    });
    if (error) throw error;
    return data;
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
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
