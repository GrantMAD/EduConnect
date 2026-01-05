import { supabase } from '../lib/supabase';

export const fetchUserGamification = async (userId) => {
    const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const createUserGamification = async (userId, initialData = {}) => {
    const { data, error } = await supabase
        .from('user_gamification')
        .insert([{ user_id: userId, ...initialData }])
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const updateUserGamification = async (userId, updateData) => {
    const { data, error } = await supabase
        .from('user_gamification')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const fetchUserStreak = async (userId) => {
    const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const fetchShopItems = async () => {
    const { data, error } = await supabase
        .from('shop_items')
        .select('*');
    
    if (error) throw error;
    return data || [];
};

export const fetchUserInventory = async (userId) => {
    const { data, error } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
};

export const purchaseItem = async (userId, itemId, cost) => {
    // This should ideally be a RPC/Transaction, but following the pattern:
    // 1. Deduct coins
    // 2. Add to inventory
    // (Actual logic in context uses supabase calls directly)
    // Here we'll just expose the primitives
    const { error: deductError } = await supabase.rpc('deduct_coins', { 
        target_user_id: userId, 
        amount: cost 
    });
    if (deductError) throw deductError;

    const { data, error: inventoryError } = await supabase
        .from('user_inventory')
        .insert([{ user_id: userId, item_id: itemId }])
        .select();
    
    if (inventoryError) throw inventoryError;
    return data[0];
};

export const fetchStreaks = async (userId) => {
    const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const createStreak = async (userId) => {
    const { data, error } = await supabase
        .from('streaks')
        .insert({ user_id: userId })
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const updateStreak = async (userId, streakData) => {
    const { data, error } = await supabase
        .from('streaks')
        .update(streakData)
        .eq('user_id', userId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const fetchEquippedItems = async (userId) => {
    const { data, error } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', userId)
        .eq('is_equipped', true);
    
    if (error) throw error;
    return data || [];
};

export const fetchUserInventoryWithItems = async (userId) => {
    const { data, error } = await supabase
        .from('user_inventory')
        .select('*, shop_items(*)')
        .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
};

export const awardXpLedger = async (xpData) => {
    const { data, error } = await supabase
        .from('xp_ledger')
        .insert(xpData)
        .select()
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const updateEquipStatus = async (userId, itemId, isEquipped) => {
    const { error } = await supabase
        .from('user_inventory')
        .update({ is_equipped: isEquipped })
        .eq('user_id', userId)
        .eq('item_id', itemId);
    
    if (error) throw error;
    return true;
};

export const unequipItemsByCategory = async (userId, itemIds) => {
    const { error } = await supabase
        .from('user_inventory')
        .update({ is_equipped: false })
        .in('id', itemIds);
    
    if (error) throw error;
    return true;
};

export const addToInventory = async (userId, itemId) => {
    const { data, error } = await supabase
        .from('user_inventory')
        .insert({
            user_id: userId,
            item_id: itemId,
            is_equipped: false
        })
        .select()
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const fetchSchoolGamification = async (userIds) => {
    if (!userIds || userIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from('user_gamification')
        .select('user_id, current_xp, current_level')
        .in('user_id', userIds)
        .order('current_xp', { ascending: false })
        .limit(50);
    
    if (error) throw error;
    return data || [];
};

export const fetchUsersEquippedItems = async (userIds) => {
    if (!userIds || userIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from('user_inventory')
        .select('user_id, shop_items(*)')
        .in('user_id', userIds)
        .eq('is_equipped', true);
    
    if (error) throw error;
    return data || [];
};

