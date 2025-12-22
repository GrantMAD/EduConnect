import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '../lib/supabase';

const PushNotificationContext = createContext();

export const usePushNotification = () => {
    const context = useContext(PushNotificationContext);
    if (!context) {
        throw new Error('usePushNotification must be used within PushNotificationProvider');
    }
    return context;
};

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export const PushNotificationProvider = ({ children }) => {
    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        // Set up notification listeners
        setupNotificationListeners();

        return () => {
            // Cleanup listeners on unmount
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, []);

    const setupNotificationListeners = () => {
        // Listener for notifications received while app is in foreground
        notificationListener.current = Notifications.addNotificationReceivedListener(
            notification => {
                console.log('📬 Notification received in foreground:', notification);
                // You can add custom handling here if needed
            }
        );

        // Listener for when user taps on a notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            response => {
                console.log('👆 Notification tapped:', response);
                const { notification } = response;
                const notificationData = notification.request.content.data;

                // Handle navigation based on notification type
                if (notificationData.type === 'chat_message' && notificationData.channel_id) {
                    // Navigate to chat room
                    // Note: You'll need to pass navigation ref or use a navigation service
                    console.log('Navigate to chat:', notificationData.channel_id);
                } else {
                    // Navigate to notifications screen for other types
                    console.log('Navigate to notifications');
                }
            }
        );
    };

    const registerForPushNotificationsAsync = async () => {
        let token;

        // Only register on physical devices, not simulators/emulators
        if (!Device.isDevice) {
            console.log('⚠️ Push notifications only work on physical devices');
            return null;
        }

        try {
            // Check existing permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            // Request permissions if not already granted
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            // Exit if permissions not granted
            if (finalStatus !== 'granted') {
                console.log('⚠️ Notification permissions not granted');
                return null;
            }

            // Get Expo push token
            token = (await Notifications.getExpoPushTokenAsync()).data;
            console.log('✅ Expo push token:', token);

        } catch (e) {
            console.error('❌ Failed to get Expo push token:', e);
            return null;
        }

        // Configure Android notification channel
        if (Platform.OS === 'android') {
            try {
                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#2196F3',
                });
                console.log('✅ Android notification channel configured');
            } catch (e) {
                console.error('❌ Failed to set notification channel:', e);
            }
        }

        // Save push token to database
        if (token) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { error } = await supabase
                        .from('users')
                        .update({ push_token: token })
                        .eq('id', user.id);

                    if (error) {
                        console.error('❌ Error saving push token to database:', error);
                    } else {
                        console.log('✅ Push token saved to database successfully');
                    }
                }
            } catch (error) {
                console.error('❌ Error in token save process:', error);
            }
        }

        return token;
    };

    const clearPushToken = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { error } = await supabase
                    .from('users')
                    .update({ push_token: null })
                    .eq('id', user.id);

                if (error) {
                    console.error('❌ Error clearing push token:', error);
                } else {
                    console.log('✅ Push token cleared successfully');
                }
            }
        } catch (error) {
            console.error('❌ Error in clearPushToken:', error);
        }
    };

    const value = {
        registerForPushNotificationsAsync,
        clearPushToken,
    };

    return (
        <PushNotificationContext.Provider value={value}>
            {children}
        </PushNotificationContext.Provider>
    );
};
