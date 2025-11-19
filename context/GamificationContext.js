import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastContext';

const GamificationContext = createContext();

export const GamificationProvider = ({ children, session }) => {
    const [gamificationState, setGamificationState] = useState({
        current_xp: 0,
        current_level: 1,
        badges: [],
    });
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const fetchGamificationState = useCallback(async () => {
        if (!session?.user) return;

        try {
            let { data, error } = await supabase
                .from('user_gamification')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                // Initialize if not exists (though trigger/SQL should handle this, good fallback)
                const { data: newData, error: insertError } = await supabase
                    .from('user_gamification')
                    .insert({ user_id: session.user.id })
                    .select()
                    .single();

                if (insertError) throw insertError;
                data = newData;
            }

            setGamificationState(data);
        } catch (error) {
            console.error('Error fetching gamification state:', error);
        } finally {
            setLoading(false);
        }
    }, [session]);

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
                        setGamificationState(payload.new);
                        // Optional: Show a "Level Up!" toast if level changed
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
            const { error } = await supabase
                .from('xp_ledger')
                .insert({
                    user_id: session.user.id,
                    action_type: actionType,
                    xp_amount: xpAmount,
                    metadata: metadata,
                });

            if (error) throw error;

            // Show toast notification
            showToast(`+${xpAmount} XP!`, 'success');
        } catch (error) {
            console.error('[GamificationContext] Error awarding XP:', error);
            showToast('Failed to award XP', 'error');
        }
    };

    return (
        <GamificationContext.Provider value={{ ...gamificationState, awardXP, loading, refreshGamificationState: fetchGamificationState }}>
            {children}
        </GamificationContext.Provider>
    );
};

export const useGamification = () => {
    return useContext(GamificationContext);
};
