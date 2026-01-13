import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase'; // keeping for real-time subscription
import { useToast } from './ToastContext';
import { BADGES } from '../constants/Badges';

// Import services
import { 
  fetchUserGamification, 
  createUserGamification, 
  fetchStreaks, 
  createStreak, 
  fetchEquippedItems, 
  fetchUserInventoryWithItems,
  updateStreak,
  updateUserGamification,
  awardXpLedger,
  addToInventory,
  unequipItemsByCategory,
  updateEquipStatus
} from '../services/gamificationService';
import { getUserProfile } from '../services/userService';
import { useAuth } from './AuthContext';

const GamificationContext = createContext();

export const GamificationProvider = ({ children, session }) => {
    const { profile } = useAuth();
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
            let userData = await fetchUserGamification(session.user.id);

            if (!userData) {
                userData = await createUserGamification(session.user.id);
            }

            // Fetch streak data
            let streakData = await fetchStreaks(session.user.id);

            // If no streak record exists, create one
            if (!streakData) {
                try {
                    streakData = await createStreak(session.user.id);
                } catch (e) { console.warn(e); }
            }

            // Fetch equipped items (multiple slots)
            const equippedData = await fetchEquippedItems(session.user.id);

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
            const inventoryData = await fetchUserInventoryWithItems(session.user.id);

            const ownedStickerPacks = inventoryData
                ?.map(i => resolveItem(i))
                ?.filter(item => item?.category === 'sticker_pack') || [];

            const equippedBorder = resolveItem(equippedBorderItem);
            const equippedBanner = resolveItem(equippedBannerItem);
            const equippedNameColor = resolveItem(equippedNameColorItem);
            const equippedTitle = resolveItem(equippedTitleItem);
            const equippedBubbleStyle = resolveItem(equippedBubbleItem);

            // Fetch user role
            const userProfile = await getUserProfile(session.user.id);
            const userRole = userProfile?.role || 'student';

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

        let newStreakValue = streakData.current_streak;

        if (lastActivity === yesterdayStr) {
            // Continued streak
            newStreakValue += 1;
        } else {
            // Broken streak (unless it's the first time)
            newStreakValue = 1;
        }

        // Update DB
        try {
            await updateStreak(session.user.id, {
                current_streak: newStreakValue,
                longest_streak: Math.max(newStreakValue, streakData.longest_streak),
                last_activity_date: today
            });

            setGamificationState(prev => ({
                ...prev,
                streak: {
                    ...prev.streak,
                    current_streak: newStreakValue,
                    last_activity_date: today
                }
            }));

            if (newStreakValue > streakData.current_streak) {
                showToast(`🔥 Streak updated! ${newStreakValue} day(s)!`, 'success');
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (session?.user && profile) {
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

    const awardXP = useCallback(async (actionType, xpAmount, metadata = {}) => {
        if (!session?.user) return;

        try {
            // Calculate coins (e.g., 1 Coin per 10 XP)
            const coinsEarned = Math.floor(xpAmount / 10);

            await awardXpLedger({
                user_id: session.user.id,
                action_type: actionType,
                xp_amount: xpAmount,
                metadata: metadata,
            });

            if (coinsEarned > 0) {
                // Fetch latest coins to avoid stale state issues
                const currentStats = await fetchUserGamification(session.user.id);

                await updateUserGamification(session.user.id, { 
                    coins: (currentStats?.coins || 0) + coinsEarned 
                });
            }

            showToast(`+${xpAmount} XP${coinsEarned > 0 ? ` & +${coinsEarned} Coins` : ''}!`, 'success');
            fetchGamificationState();
        } catch (error) {
            console.error('[GamificationContext] Error awarding XP:', error);
            showToast('Failed to award XP', 'error');
        }
    }, [session?.user?.id, showToast, fetchGamificationState]);

    const purchaseItem = useCallback(async (item) => {
        if ((gamificationState.coins || 0) < item.cost) {
            showToast('Not enough coins!', 'error');
            return false;
        }

        try {
            // 1. Deduct coins
            await updateUserGamification(session.user.id, { 
                coins: (gamificationState.coins || 0) - item.cost 
            });

            // 2. Add to inventory
            await addToInventory(session.user.id, item.id);

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
    }, [session?.user?.id, gamificationState.coins, showToast, fetchGamificationState]);

    const equipItem = useCallback(async (item) => {
        if (!session?.user) return;
        const category = typeof item === 'object' ? (item.category || 'border') : 'border';
        const itemId = typeof item === 'object' ? item.id : item;

        try {
            // 1. Unequip items of the same category
            const equippedInv = await fetchEquippedItems(session.user.id);

            const itemsToUnequip = equippedInv?.filter(inv => {
                const invCat = inv.shop_items?.category || 'border';
                const targetCat = category === 'avatar_border' ? 'border' : category;
                const normalizedInvCat = invCat === 'avatar_border' ? 'border' : invCat;
                return normalizedInvCat === (targetCat === 'avatar_border' ? 'border' : targetCat);
            }).map(i => i.id) || [];

            if (itemsToUnequip.length > 0) {
                await unequipItemsByCategory(session.user.id, itemsToUnequip);
            }

            // 2. Equip the new item
            await updateEquipStatus(session.user.id, itemId, true);

            showToast('Item equipped!', 'success');
            fetchGamificationState(); // Refresh state to update UI
            return true;
        } catch (error) {
            console.error('Error equipping item:', error);
            showToast('Failed to equip item.', 'error');
            return false;
        }
    }, [session?.user?.id, showToast, fetchGamificationState]);

    const value = React.useMemo(() => ({
        ...gamificationState,
        awardXP,
        purchaseItem,
        equipItem,
        loading,
        refreshGamificationState: fetchGamificationState
    }), [gamificationState, awardXP, purchaseItem, equipItem, loading, fetchGamificationState]);

    return (
        <GamificationContext.Provider value={value}>
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