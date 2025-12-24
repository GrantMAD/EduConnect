import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';
import { BADGES } from '../constants/Badges';

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
        equippedItem: null,
        equippedBorder: null,
        equippedBanner: null,
        equippedNameColor: null,
        equippedTitle: null,
        equippedBubbleStyle: null,
        ownedStickerPacks: [],
        nextBadge: null
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

            // Fetch equipped items (multiple slots)
            const { data: equippedData, error: equippedError } = await supabase
                .from('user_inventory')
                .select('*, shop_items(*)')
                .eq('user_id', session.user.id)
                .eq('is_equipped', true);

            if (equippedError) throw equippedError;

            // Helper to resolve shop_items which might be an object or array
            const resolveItem = (invItem) => {
                if (!invItem?.shop_items) return null;
                return Array.isArray(invItem.shop_items) ? invItem.shop_items[0] : invItem.shop_items;
            };

            // Separate items by category
            const equippedBorderItem = equippedData?.find(i => {
                const item = resolveItem(i);
                const cat = item?.category;
                return cat === 'avatar_border' || cat === 'border' || !cat;
            });

            const equippedBannerItem = equippedData?.find(i => {
                const item = resolveItem(i);
                return item?.category === 'banner';
            });

            const equippedNameColorItem = equippedData?.find(i => {
                const item = resolveItem(i);
                return item?.category === 'name_color';
            });

            const equippedTitleItem = equippedData?.find(i => {
                const item = resolveItem(i);
                return item?.category === 'title';
            });

            const equippedBubbleItem = equippedData?.find(i => {
                const item = resolveItem(i);
                return item?.category === 'bubble_style';
            });

            // Fetch all owned items to identify sticker packs
            const { data: inventoryData } = await supabase
                .from('user_inventory')
                .select('*, shop_items(*)')
                .eq('user_id', session.user.id);

            const ownedStickerPacks = inventoryData
                ?.map(i => resolveItem(i))
                ?.filter(item => item?.category === 'sticker_pack') || [];

            const equippedBorder = resolveItem(equippedBorderItem);
            const equippedBanner = resolveItem(equippedBannerItem);
            const equippedNameColor = resolveItem(equippedNameColorItem);
            const equippedTitle = resolveItem(equippedTitleItem);
            const equippedBubbleStyle = resolveItem(equippedBubbleItem);

            // Fetch user role
            const { data: userRoleData } = await supabase
                .from('users')
                .select('role')
                .eq('id', session.user.id)
                .single();

            const userRole = userRoleData?.role || 'student';

            // Calculate Badges
            const roleBadges = BADGES[userRole] || BADGES['student'];
            const currentXP = userData.current_xp || 0;

            const earnedBadges = roleBadges.filter(badge => currentXP >= badge.min_xp);
            const nextBadge = roleBadges.find(badge => currentXP < badge.min_xp) || null;

            setGamificationState({
                ...userData,
                streak: streakData || { current_streak: 0, longest_streak: 0, last_activity_date: null },
                equippedItem: equippedBorder, // Backward compatibility alias
                equippedBorder,
                equippedBanner,
                equippedNameColor,
                equippedTitle,
                equippedBubbleStyle,
                ownedStickerPacks,
                badges: earnedBadges,
                nextBadge: nextBadge
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
                supabase.removeChannel(subscription);
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

            if (coinsEarned > 0) {
                // Fetch latest coins to avoid stale state issues
                const { data: currentStats } = await supabase
                    .from('user_gamification')
                    .select('coins')
                    .eq('user_id', session.user.id)
                    .single();

                const { error: coinError } = await supabase
                    .from('user_gamification')
                    .update({ coins: (currentStats?.coins || 0) + coinsEarned })
                    .eq('user_id', session.user.id);

                if (coinError) console.warn('Error updating coins:', coinError);
            }

            showToast(`+${xpAmount} XP${coinsEarned > 0 ? ` & +${coinsEarned} Coins` : ''}!`, 'success');
            fetchGamificationState();
        } catch (error) {
            console.error('[GamificationContext] Error awarding XP:', error);
            showToast('Failed to award XP', 'error');
        }
    };

    const purchaseItem = async (item) => {
        if ((gamificationState.coins || 0) < item.cost) {
            showToast('Not enough coins!', 'error');
            return false;
        }

        try {
            // 1. Deduct coins
            const { error: deductError } = await supabase
                .from('user_gamification')
                .update({ coins: (gamificationState.coins || 0) - item.cost })
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
                coins: (prev.coins || 0) - item.cost
            }));

            showToast(`Purchased ${item.name}!`, 'success');
            fetchGamificationState(); // Refresh to get latest inventory
            return true;
        } catch (error) {
            console.error('Error purchasing item:', error);
            showToast('Failed to purchase item.', 'error');
            return false;
        }
    };

    const equipItem = async (item) => {
        if (!session?.user) return;
        const category = typeof item === 'object' ? (item.category || 'border') : 'border';
        const itemId = typeof item === 'object' ? item.id : item;

        try {
            // 1. Unequip items of the same category
            const { data: equippedInv } = await supabase
                .from('user_inventory')
                .select('id, shop_items!inner(category)')
                .eq('user_id', session.user.id)
                .eq('is_equipped', true);

            const itemsToUnequip = equippedInv?.filter(inv => {
                const invCat = inv.shop_items?.category || 'border';
                const targetCat = category === 'avatar_border' ? 'border' : category;
                const normalizedInvCat = invCat === 'avatar_border' ? 'border' : invCat;
                return normalizedInvCat === (targetCat === 'avatar_border' ? 'border' : targetCat);
            }).map(i => i.id) || [];

            if (itemsToUnequip.length > 0) {
                await supabase
                    .from('user_inventory')
                    .update({ is_equipped: false })
                    .in('id', itemsToUnequip);
            }

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
    const context = useContext(GamificationContext);
    if (!context) {
        throw new Error('useGamification must be used within a GamificationProvider');
    }
    return context;
};