import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const STORAGE_KEY = '@notification_preferences';

export const NotificationPreferencesProvider = ({ children }) => {
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);

    // Load preferences from AsyncStorage on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            if (stored) {
                setPreferences(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const savePreferences = async (newPreferences) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
            setPreferences(newPreferences);
        } catch (error) {
            console.error('Error saving notification preferences:', error);
        }
    };

    const updatePreference = async (key, value) => {
        const newPreferences = { ...preferences, [key]: value };
        await savePreferences(newPreferences);
    };

    const resetPreferences = async () => {
        await savePreferences(DEFAULT_PREFERENCES);
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
