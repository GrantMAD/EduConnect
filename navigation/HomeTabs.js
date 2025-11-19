import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faCalendar, faBookOpen, faStore } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import MarketScreen from '../screens/market/MarketScreen';

const Tab = createMaterialTopTabNavigator();

const HomeTabs = () => {
    const { theme } = useTheme();
    return (
        <Tab.Navigator
            tabBarPosition="bottom"
            screenOptions={{
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.placeholder,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.cardBorder,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 6,
                    marginBottom: 5,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginBottom: 2,
                },
                tabBarIndicatorStyle: {
                    backgroundColor: theme.colors.primary,
                    height: 3,
                },
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
