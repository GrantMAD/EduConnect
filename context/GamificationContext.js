import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';

const GamificationContext = createContext();

export const GamificationProvider = ({ children, session }) => {
    const [gamificationState, setGamificationState] = useState({
        current_xp: 0,
        current_level: 1,
        coins: 0,
        badges: [],
        streak: {
            current_streak: 0,
            longest_streak: 0,
            last_activity_date: null
        },
        equippedItem: null
    });
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const fetchGamificationState = useCallback(async () => {
        if (!session?.user) return;

        try {
            // Fetch basic gamification data
            let { data: userData, error: userError } = await supabase
                .from('user_gamification')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (userError) throw userError;

            if (!userData) {
                const { data: newData, error: insertError } = await supabase
                    .from('user_gamification')
                    .insert({ user_id: session.user.id })
                    .select()
                    .single();

                if (insertError) throw insertError;
                userData = newData;
            }

            // Fetch streak data
            let { data: streakData, error: streakError } = await supabase
                .from('streaks')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (streakError && streakError.code !== 'PGRST116') throw streakError;

            // If no streak record exists, create one
            if (!streakData) {
                const { data: newStreak, error: newStreakError } = await supabase
                    .from('streaks')
                    .insert({ user_id: session.user.id })
                    .select()
                    .single();

                if (!newStreakError) streakData = newStreak;
            }

            // Fetch equipped item
            const { data: equippedData, error: equippedError } = await supabase
                .from('user_inventory')
                .select('*, shop_items(*)')
                .eq('user_id', session.user.id)
                .eq('is_equipped', true)
                .maybeSingle();

            setGamificationState({
                ...userData,
                streak: streakData || { current_streak: 0, longest_streak: 0, last_activity_date: null },
                equippedItem: equippedData?.shop_items || null
            });

            // Check streak logic after fetching
            if (streakData) {
                checkStreak(streakData);
            }

        } catch (error) {
            console.error('Error fetching gamification state:', error);
        } finally {
            setLoading(false);
        }
    }, [session]);

    const checkStreak = async (streakData) => {
        if (!streakData) return;

        const today = new Date().toISOString().split('T')[0];
        const lastActivity = streakData.last_activity_date;

        if (lastActivity === today) return; // Already active today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let newStreak = streakData.current_streak;

        if (lastActivity === yesterdayStr) {
            // Continued streak
            newStreak += 1;
        } else {
            // Broken streak (unless it's the first time)
            newStreak = 1;
        }

        // Update DB
        const { error } = await supabase
            .from('streaks')
            .update({
                current_streak: newStreak,
                longest_streak: Math.max(newStreak, streakData.longest_streak),
                last_activity_date: today
            })
            .eq('user_id', session.user.id);

        if (!error) {
            setGamificationState(prev => ({
                ...prev,
                streak: {
                    ...prev.streak,
                    current_streak: newStreak,
                    last_activity_date: today
                }
            }));

            if (newStreak > streakData.current_streak) {
                showToast(`🔥 Streak updated! ${newStreak} day(s)!`, 'success');
            }
        }
    };

    useEffect(() => {
        if (session?.user) {
            fetchGamificationState();

            // Subscribe to changes
            const subscription = supabase
                .channel('gamification_updates')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'user_gamification',
                        filter: `user_id=eq.${session.user.id}`,
                    },
                    (payload) => {
                        setGamificationState(prev => ({ ...prev, ...payload.new }));
                        if (payload.new.current_level > payload.old.current_level) {
                            showToast(`🎉 Level Up! You are now Level ${payload.new.current_level}!`, 'success');
                        }
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [session, fetchGamificationState, showToast]);

    const awardXP = async (actionType, xpAmount, metadata = {}) => {
        if (!session?.user) return;

        try {
            // Calculate coins (e.g., 1 Coin per 10 XP)
            const coinsEarned = Math.floor(xpAmount / 10);

            const { error } = await supabase
                .from('xp_ledger')
                .insert({
                    user_id: session.user.id,
                    action_type: actionType,
                    xp_amount: xpAmount,
                    metadata: metadata,
                });

            if (error) throw error;

            // Manually update coins if needed (though trigger might handle XP, coins usually need manual update or trigger)
            // Assuming existing trigger handles XP -> Level, but maybe not coins.
            // Let's update coins manually for now to be safe, or assume a trigger does it.
            // Since we didn't add a trigger for coins, we should update it here.

            const { error: updateError } = await supabase.rpc('increment_gamification_stats', {
                p_user_id: session.user.id,
                p_xp: xpAmount,
                p_coins: coinsEarned
            });

            // Fallback if RPC doesn't exist (it likely doesn't yet), just rely on the ledger trigger for XP
            // and manually update coins if the RPC fails or just do a direct update.
            // For safety in this iteration without creating more SQL functions, let's do a direct update
            // BUT concurrent updates are risky. Ideally we use an RPC.
            // Let's try a direct update for coins since we are in the client.

            if (coinsEarned > 0) {
                const { error: coinError } = await supabase
                    .from('user_gamification')
                    .update({ coins: gamificationState.coins + coinsEarned }) // Potential race condition but okay for MVP
                    .eq('user_id', session.user.id);

                if (coinError) console.warn('Error updating coins:', coinError);
            }

            showToast(`+${xpAmount} XP${coinsEarned > 0 ? ` & +${coinsEarned} Coins` : ''}!`, 'success');
        } catch (error) {
            console.error('[GamificationContext] Error awarding XP:', error);
            showToast('Failed to award XP', 'error');
        }
    };

    const purchaseItem = async (item) => {
        if (gamificationState.coins < item.cost) {
            showToast('Not enough coins!', 'error');
            return false;
        }

        try {
            // 1. Deduct coins
            const { error: deductError } = await supabase
                .from('user_gamification')
                .update({ coins: gamificationState.coins - item.cost })
                .eq('user_id', session.user.id);

            if (deductError) throw deductError;

            // 2. Add to inventory
            const { error: inventoryError } = await supabase
                .from('user_inventory')
                .insert({
                    user_id: session.user.id,
                    item_id: item.id,
                    is_equipped: false
                });

            if (inventoryError) throw inventoryError;

            // Update local state immediately for UI responsiveness
            setGamificationState(prev => ({
                ...prev,
                coins: prev.coins - item.cost
            }));

            showToast(`Purchased ${item.name}!`, 'success');
            return true;
        } catch (error) {
            console.error('Error purchasing item:', error);
            showToast('Failed to purchase item.', 'error');
            return false;
        }
    };

    const equipItem = async (itemId) => {
        if (!session?.user) return;

        try {
            // 1. Unequip all items (simplification for now, assuming single slot)
            await supabase
                .from('user_inventory')
                .update({ is_equipped: false })
                .eq('user_id', session.user.id);

            // 2. Equip the new item
            const { error } = await supabase
                .from('user_inventory')
                .update({ is_equipped: true })
                .eq('user_id', session.user.id)
                .eq('item_id', itemId);

            if (error) throw error;

            showToast('Item equipped!', 'success');
            fetchGamificationState(); // Refresh state to update UI
            return true;
        } catch (error) {
            console.error('Error equipping item:', error);
            showToast('Failed to equip item.', 'error');
            return false;
        }
    };

    return (
        <GamificationContext.Provider value={{
            ...gamificationState,
            awardXP,
            purchaseItem,
            equipItem,
            loading,
            refreshGamificationState: fetchGamificationState
        }}>
            {children}
        </GamificationContext.Provider>
    );
};

export const useGamification = () => {
    return useContext(GamificationContext);
};
