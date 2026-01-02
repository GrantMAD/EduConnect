import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { SchoolProvider } from '../context/SchoolContext';
import { GamificationProvider } from '../context/GamificationContext';
import { NotificationPreferencesProvider } from '../context/NotificationPreferencesContext';
import { ChatProvider } from '../context/ChatContext';
import { PushNotificationProvider } from '../context/PushNotificationContext';
import { WalkthroughProvider } from '../context/WalkthroughContext';

export default function AppProviders({ children, session }) {
    return (
        <ThemeProvider session={session}>
            <PushNotificationProvider>
                <ToastProvider>
                    <NotificationPreferencesProvider>
                        <WalkthroughProvider>
                            <SchoolProvider>
                                <GamificationProvider session={session}>
                                    <ChatProvider session={session}>
                                        {children}
                                    </ChatProvider>
                                </GamificationProvider>
                            </SchoolProvider>
                        </WalkthroughProvider>
                    </NotificationPreferencesProvider>
                </ToastProvider>
            </PushNotificationProvider>
        </ThemeProvider>
    );
}
