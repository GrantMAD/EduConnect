import React, { useRef, useCallback } from 'react';
import { View, BackHandler, Platform } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faCalendar, faBookOpen, faStore } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../context/ToastContext';

import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import MarketScreen from '../screens/market/MarketScreen';

const Tab = createMaterialTopTabNavigator();

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HomeTabs = () => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { showToast } = useToast();
    const lastBackPress = useRef(0);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (Platform.OS !== 'android') return false;

                const now = Date.now();
                if (now - lastBackPress.current < 2000) {
                    BackHandler.exitApp();
                    return true;
                }

                lastBackPress.current = now;
                showToast('Press back again to exit', 'default', 2000);
                return true;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => subscription.remove();
        }, [showToast])
    );

    const TabButton = ({ focused, children }) => (
        <View style={{
            backgroundColor: focused ? theme.colors.primary + '15' : 'transparent',
            borderRadius: 12,
            marginHorizontal: 4,
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
        }}>
            {children}
        </View>
    );

    return (
        <Tab.Navigator
            tabBarPosition="bottom"
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.placeholder,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.cardBorder,
                    height: 70 + insets.bottom,
                    paddingBottom: 10 + insets.bottom,
                    paddingTop: 6,
                    marginBottom: 0,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginBottom: 2,
                },
                tabBarIndicatorStyle: {
                    backgroundColor: theme.colors.primary,
                    height: 3,
                    top: 0,
                },
                tabBarButton: (props) => <TabButton {...props} />,
            }}
        >
            <Tab.Screen
                name="Announcements"
                component={AnnouncementsScreen}
                options={{
                    tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faBullhorn} color={color} size={20} />,
                }}
            />
            <Tab.Screen
                name="Calendar"
                component={CalendarScreen}
                options={{
                    tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faCalendar} color={color} size={20} />,
                }}
            />
            <Tab.Screen
                name="Homework"
                component={HomeworkScreen}
                options={{
                    tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faBookOpen} color={color} size={20} />,
                }}
            />
            <Tab.Screen
                name="Market"
                component={MarketScreen}
                options={{
                    tabBarIcon: ({ color }) => <FontAwesomeIcon icon={faStore} color={color} size={20} />,
                }}
            />
        </Tab.Navigator>
    );
};

export default HomeTabs;
