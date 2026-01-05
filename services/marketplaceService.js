import { supabase } from '../lib/supabase';

export const fetchMarketplaceItems = async (schoolId, filters = {}) => {
    let query = supabase
        .from('marketplace_items')
        .select('*, seller:users(full_name, avatar_url)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

    if (filters.category) {
        query = query.eq('category', filters.category);
    }

    if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const fetchSellerItems = async (sellerId) => {
    const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const createMarketplaceItem = async (itemData) => {
    const { data, error } = await supabase
        .from('marketplace_items')
        .insert([itemData])
        .select();
    
    if (error) throw error;
    return data[0];
};

export const updateMarketplaceItem = async (id, itemData) => {
    const { data, error } = await supabase
        .from('marketplace_items')
        .update(itemData)
        .eq('id', id)
        .select();
    
    if (error) throw error;
    return data[0];
};

export const deleteMarketplaceItem = async (id) => {
    const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    return true;
};

export const deleteMarketplaceItemsByUser = async (userId) => {
    const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('seller_id', userId);
    
    if (error) throw error;
    return true;
};

export const uploadMarketplaceImage = async (filePath, fileBody) => {
    const { data, error } = await supabase.storage
        .from('marketplace')
        .upload(filePath, fileBody);
    
    if (error) throw error;
    return data;
};

export const getMarketplaceImageUrl = (filePath) => {
    const { data } = supabase.storage
        .from('marketplace')
        .getPublicUrl(filePath);
    return data.publicUrl;
};
