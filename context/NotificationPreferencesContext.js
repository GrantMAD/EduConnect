import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Import services
import { getCurrentUser } from '../services/authService';
import { fetchNotificationPreferences, updateNotificationPreferences } from '../services/userService';

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

export const NotificationPreferencesProvider = ({ children, session }) => {
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    const loadPreferences = useCallback(async () => {
        if (!session?.user?.id) {
            setLoading(false);
            return;
        }

        try {
            const data = await fetchNotificationPreferences(session.user.id);

            if (data) {
                // Merge with defaults to ensure all keys exist
                setPreferences({ ...DEFAULT_PREFERENCES, ...data });
            }
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id]);

    // Load preferences when session changes
    useEffect(() => {
        loadPreferences();
    }, [loadPreferences]);

    const updatePreference = React.useCallback(async (key, value) => {
        try {
            setPreferences(prev => {
                const newPrefs = { ...prev, [key]: value };
                
                if (session?.user?.id) {
                    updateNotificationPreferences(session.user.id, newPrefs)
                        .catch(err => console.error('Error saving notification preferences:', err));
                }

                return newPrefs;
            });
        } catch (error) {
            console.error('Error in updatePreference:', error);
        }
    }, [session?.user?.id]);

    const resetPreferences = React.useCallback(async () => {
        try {
            setPreferences(DEFAULT_PREFERENCES);
            if (session?.user?.id) {
                await updateNotificationPreferences(session.user.id, DEFAULT_PREFERENCES);
            }
        } catch (error) {
            console.error('Error resetting preferences:', error);
        }
    }, [session?.user?.id]);

    // Check if notifications should be sent based on quiet hours
    const shouldSendNotification = React.useCallback(() => {
        if (!preferences.quietHoursEnabled) return true;

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const { quietHoursStart, quietHoursEnd } = preferences;

        // Handle quiet hours that span midnight
        if (quietHoursStart > quietHoursEnd) {
            return currentTime < quietHoursStart && currentTime >= quietHoursEnd;
        }

        return currentTime < quietHoursStart || currentTime >= quietHoursEnd;
    }, [preferences]);

    const value = React.useMemo(() => ({
        preferences,
        loading,
        updatePreference,
        resetPreferences,
        shouldSendNotification,
    }), [preferences, loading, updatePreference, resetPreferences, shouldSendNotification]);

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
