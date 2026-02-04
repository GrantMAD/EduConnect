import { supabase } from '../lib/supabase';

export const fetchMarketplaceItems = async (schoolId, filters = {}) => {
    let query = supabase
        .from('marketplace_items')
        .select('*, seller:users(id, full_name, avatar_url, role)')
        .eq('school_id', schoolId);

    // Filter by seller (My Listings)
    if (filters.sellerId && filters.activeTab === 'selling') {
        query = query.eq('seller_id', filters.sellerId);
    }

    if (filters.category && filters.category !== 'All') {
        query = query.eq('category', filters.category);
    }

    if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
    }

    // Sorting
    switch (filters.sortBy) {
        case 'newest': query = query.order('created_at', { ascending: false }); break;
        case 'price_asc': query = query.order('price', { ascending: true }); break;
        case 'price_desc': query = query.order('price', { ascending: false }); break;
        default: query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    
    let fetchedItems = data || [];

    // Client-side role filtering for tabs
    if (filters.activeTab === 'store') {
        return fetchedItems.filter(item => item.seller?.role === 'admin');
    } else if (filters.activeTab === 'browse') {
        return fetchedItems.filter(item => item.seller?.role !== 'admin');
    }

    return fetchedItems;
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
