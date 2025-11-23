import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const NotificationPreferencesContext = createContext();

const DEFAULT_PREFERENCES = {
    pushNotificationsEnabled: true,
    announcements: true,
    homework: true,
    polls: true,
    classSchedule: true,
    marketplace: true,
    gamification: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
};

export const NotificationPreferencesProvider = ({ children }) => {
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    // Load preferences from Supabase on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase
                    .from('users')
                    .select('notification_preferences')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching notification preferences:', error);
                } else if (data && data.notification_preferences) {
                    // Merge with defaults to ensure all keys exist
                    setPreferences({ ...DEFAULT_PREFERENCES, ...data.notification_preferences });
                }
            }
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const updatePreference = async (key, value) => {
        try {
            const newPreferences = { ...preferences, [key]: value };
            setPreferences(newPreferences); // Optimistic update

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('users')
                    .update({ notification_preferences: newPreferences })
                    .eq('id', user.id);

                if (error) {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error saving notification preferences:', error);
            // Revert on error (optional, but good practice)
            // setPreferences(preferences); 
        }
    };

    const resetPreferences = async () => {
        try {
            setPreferences(DEFAULT_PREFERENCES);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('users')
                    .update({ notification_preferences: DEFAULT_PREFERENCES })
                    .eq('id', user.id);
            }
        } catch (error) {
            console.error('Error resetting preferences:', error);
        }
    };

    // Check if notifications should be sent based on quiet hours
    const shouldSendNotification = () => {
        if (!preferences.quietHoursEnabled) return true;

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const { quietHoursStart, quietHoursEnd } = preferences;

        // Handle quiet hours that span midnight
        if (quietHoursStart > quietHoursEnd) {
            return currentTime < quietHoursStart && currentTime >= quietHoursEnd;
        }

        return currentTime < quietHoursStart || currentTime >= quietHoursEnd;
    };

    const value = {
        preferences,
        loading,
        updatePreference,
        resetPreferences,
        shouldSendNotification,
    };

    return (
        <NotificationPreferencesContext.Provider value={value}>
            {children}
        </NotificationPreferencesContext.Provider>
    );
};

export const useNotificationPreferences = () => {
    const context = useContext(NotificationPreferencesContext);
    if (!context) {
        throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider');
    }
    return context;
};
