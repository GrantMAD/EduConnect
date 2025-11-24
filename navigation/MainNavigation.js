import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Dimensions } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import CustomHeader from '../components/navigation/CustomHeader';
import CustomDrawerContent from '../components/navigation/CustomDrawerContent';
import HomeTabs from './HomeTabs';

import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ManagementScreen from '../screens/ManagementScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import CreateAnnouncementScreen from '../screens/CreateAnnouncementScreen';
import ManageClassesScreen from '../screens/class/ManageClassesScreen';
import CreateClassScreen from '../screens/class/CreateClassScreen';
import ManageUsersInClassScreen from '../screens/class/ManageUsersInClassScreen';
import SchoolDataScreen from '../screens/SchoolDataScreen';
import ManageAnnouncementsScreen from '../screens/ManageAnnouncementsScreen';
import ManageMarketDataScreen from '../screens/market/ManageMarketDataScreen';

import CreateAssignmentScreen from '../screens/CreateAssignmentScreen';
import CreateHomeworkScreen from '../screens/CreateHomeworkScreen';

import CreateMarketplaceItemScreen from '../screens/market/CreateMarketplaceItemScreen';
import MyChildrenScreen from '../screens/MyChildrenScreen';
import ResourcesScreen from '../screens/ResourcesScreen';
import PollsScreen from '../screens/PollsScreen';
import CreatePollScreen from '../screens/CreatePollScreen';
import DashboardScreen from '../screens/DashboardScreen';

// Gamification Screens
import LeaderboardScreen from '../screens/gamification/LeaderboardScreen';
import ShopScreen from '../screens/gamification/ShopScreen';

// Chat Screens
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import NewChatScreen from '../screens/chat/NewChatScreen';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Stack Navigator
const MainStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      header: ({ navigation }) => <CustomHeader navigation={navigation} />,
    }}
  >
    <Stack.Screen name="HomeTabs" component={HomeTabs} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="MyChildren" component={MyChildrenScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Management" component={ManagementScreen} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
    <Stack.Screen name="Notifications">
      {props => <NotificationsScreen {...props} showActions={true} />}
    </Stack.Screen>
    <Stack.Screen name="CreateAnnouncement" component={CreateAnnouncementScreen} />
    <Stack.Screen name="ManageClasses" component={ManageClassesScreen} />
    <Stack.Screen name="CreateClass" component={CreateClassScreen} />
    <Stack.Screen name="ManageUsersInClass" component={ManageUsersInClassScreen} />
    <Stack.Screen name="SchoolData" component={SchoolDataScreen} />
    <Stack.Screen name="ManageAnnouncements" component={ManageAnnouncementsScreen} />
    <Stack.Screen name="CreateHomework" component={CreateHomeworkScreen} />
    <Stack.Screen name="CreateAssignment" component={CreateAssignmentScreen} />
    <Stack.Screen name="CreateMarketplaceItem" component={CreateMarketplaceItemScreen} />
    <Stack.Screen name="ManageMarketData" component={ManageMarketDataScreen} />
    <Stack.Screen name="Resources" component={ResourcesScreen} />
    <Stack.Screen name="Polls" component={PollsScreen} />
    <Stack.Screen name="CreatePoll" component={CreatePollScreen} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />

    {/* Gamification Screens */}
    <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Leaderboard' }} />
    <Stack.Screen name="Shop" component={ShopScreen} options={{ title: 'Shop' }} />

    {/* Chat Screens */}
    <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Messages' }} />
    <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
    <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'New Message' }} />
  </Stack.Navigator>
);

export default function MainNavigation() {
  const drawerWidth = Dimensions.get('window').width * 0.75;
  const { theme } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: theme.colors.background,
        },
        overlayColor: theme.colors.backdrop,
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="MainStack" component={MainStackNavigator} />
    </Drawer.Navigator>
  );
}
