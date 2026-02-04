import { supabase } from '../lib/supabase';

export const fetchUserGamification = async (userId) => {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const createUserGamification = async (userId, initialData = {}) => {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('user_gamification')
        .upsert({ user_id: userId, ...initialData }, { onConflict: 'user_id', ignoreDuplicates: true })
        .select()
        .maybeSingle();
    
    if (error) throw error;
    
    // If upsert returned null (due to ignoreDuplicates), fetch existing
    if (!data) {
        return fetchUserGamification(userId);
    }
    
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
    
    if (error) throw error;
    return data;
};

export const createStreak = async (userId) => {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('streaks')
        .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true })
        .select()
        .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
        return fetchStreaks(userId);
    }
    
    return data;
};

export const updateStreak = async (userId, streakData) => {
    const { data, error } = await supabase
        .from('streaks')
        .update(streakData)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
    
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

// --- Enhanced Leaderboard Helper ---
const getStartDate = (timeRange) => {
    const now = new Date()
    if (timeRange === 'weekly') {
        const day = now.getDay()
        const diff = now.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        const monday = new Date(now.setDate(diff))
        monday.setHours(0, 0, 0, 0)
        return monday.toISOString()
    } else if (timeRange === 'monthly') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        return firstDay.toISOString()
    }
    return null
}

export const fetchEnhancedLeaderboard = async ({ schoolId, timeRange = 'all', metric = 'xp', filterType = 'school', filterValue = null }) => {
    // 1. Determine eligible user IDs based on Filter (School vs Class)
    let eligibleUserIds = []

    if (filterType === 'class' && filterValue) {
        const { data: classMembers, error: classError } = await supabase
            .from('class_members')
            .select('user_id')
            .eq('class_id', filterValue)
        
        if (classError) throw classError
        if (!classMembers || classMembers.length === 0) return []
        eligibleUserIds = classMembers.map(m => m.user_id)
    } else {
        // Default: All users in the school
        const { data: schoolUsers, error: schoolError } = await supabase
            .from('users')
            .select('id')
            .eq('school_id', schoolId)
        
        if (schoolError) throw schoolError
        if (!schoolUsers || schoolUsers.length === 0) return []
        eligibleUserIds = schoolUsers.map(u => u.id)
    }

    if (eligibleUserIds.length === 0) return []

    // 2. Fetch Scores based on Metric and TimeRange
    let leaderboardData = []

    if (metric === 'streak') {
        // Fetch Streaks
        const { data: streaks, error: streaksError } = await supabase
            .from('streaks')
            .select('user_id, current_streak')
            .in('user_id', eligibleUserIds)
            .order('current_streak', { ascending: false })
            .limit(50)

        if (streaksError) throw streaksError
        leaderboardData = streaks?.map(s => ({ user_id: s.user_id, score: s.current_streak })) || []

    } else if (metric === 'polls') {
        // Polls Voted
        let query = supabase
            .from('poll_votes')
            .select('user_id')
            .in('user_id', eligibleUserIds)

        if (timeRange !== 'all') {
            const startDate = getStartDate(timeRange)
            if (startDate) query = query.gte('created_at', startDate)
        }

        const { data: votes, error: votesError } = await query
        if (votesError) throw votesError

        // Aggregate
        const totals = {}
        votes?.forEach(v => totals[v.user_id] = (totals[v.user_id] || 0) + 1)
        
        leaderboardData = Object.entries(totals)
            .map(([user_id, score]) => ({ user_id, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 50)

    } else if (metric === 'tasks') {
        // Tasks Completed (Homework + Assignments)
        let query = supabase
            .from('student_completions')
            .select('student_id')
            .in('student_id', eligibleUserIds)

        if (timeRange !== 'all') {
            const startDate = getStartDate(timeRange)
            if (startDate) query = query.gte('created_at', startDate) 
        }

        const { data: completions, error: compError } = await query
        if (compError) throw compError

        const totals = {}
        completions?.forEach(c => totals[c.student_id] = (totals[c.student_id] || 0) + 1)

        leaderboardData = Object.entries(totals)
            .map(([user_id, score]) => ({ user_id, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 50)

    } else if (metric === 'resources') {
        // Resources Shared
        let query = supabase
            .from('resources')
            .select('uploaded_by')
            .in('uploaded_by', eligibleUserIds)
            //.eq('is_personal', false) 

        if (timeRange !== 'all') {
            const startDate = getStartDate(timeRange)
            if (startDate) query = query.gte('created_at', startDate)
        }

        const { data: resources, error: resError } = await query
        if (resError) throw resError

        const totals = {}
        resources?.forEach(r => totals[r.uploaded_by] = (totals[r.uploaded_by] || 0) + 1)

        leaderboardData = Object.entries(totals)
            .map(([user_id, score]) => ({ user_id, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 50)

    } else {
        // Metric is XP
        if (timeRange === 'all') {
            const { data: scores, error: scoresError } = await supabase
                .from('user_gamification')
                .select('user_id, current_xp')
                .in('user_id', eligibleUserIds)
                .order('current_xp', { ascending: false })
                .limit(50)

            if (scoresError) throw scoresError
            leaderboardData = scores?.map(s => ({ user_id: s.user_id, score: s.current_xp })) || []
        } else {
            // Weekly or Monthly XP from Ledger
            const startDate = getStartDate(timeRange)
            
            const { data: ledger, error: ledgerError } = await supabase
                .from('xp_ledger')
                .select('user_id, xp_amount')
                .in('user_id', eligibleUserIds)
                .gte('created_at', startDate)

            if (ledgerError) throw ledgerError

            // Aggregate in JS
            const totals = {}
            ledger?.forEach(entry => {
                totals[entry.user_id] = (totals[entry.user_id] || 0) + entry.xp_amount
            })

            leaderboardData = Object.entries(totals)
                .map(([user_id, score]) => ({ user_id, score }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 50)
        }
    }

    if (leaderboardData.length === 0) return []

    // 3. Fetch User Details & Inventory for the top scorers
    const topScorerIds = leaderboardData.map(s => s.user_id)
    
    const { data: userDetails, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, role, email, created_at, number') 
        .in('id', topScorerIds)

    if (usersError) throw usersError

    // Also need levels if displaying them, fetched from user_gamification if not already fetched
    const { data: levelData, error: levelError } = await supabase
        .from('user_gamification')
        .select('user_id, current_level')
        .in('user_id', topScorerIds)

    if (levelError) throw levelError

    const { data: inventoryData, error: inventoryError } = await supabase
        .from('user_inventory')
        .select('user_id, shop_items(*)')
        .in('user_id', topScorerIds)
        .eq('is_equipped', true)

    if (inventoryError) throw inventoryError

    // 4. Merge Data
    return leaderboardData.map((item, index) => {
        const user = userDetails.find(u => u.id === item.user_id)
        const levelInfo = levelData?.find(l => l.user_id === item.user_id)
        
        const userEquipped = inventoryData?.filter(i => i.user_id === item.user_id).map(i => {
            return Array.isArray(i.shop_items) ? i.shop_items[0] : i.shop_items;
        }) || []

        const equippedBorder = userEquipped.find(i => i?.category === 'avatar_border' || i?.category === 'border' || !i?.category)
        const equippedNameColor = userEquipped.find(i => i?.category === 'name_color')
        const equippedTitle = userEquipped.find(i => i?.category === 'title')

        return {
            user_id: item.user_id,
            current_xp: item.score, // Naming it current_xp for compatibility with UI, though it might be 'score'
            display_score: item.score,
            current_level: levelInfo?.current_level || 1,
            user: user || { full_name: 'Unknown User', avatar_url: null, email: '' },
            equippedBorder,
            equippedNameColor,
            equippedTitle,
            rank: index + 1
        }
    })
}
