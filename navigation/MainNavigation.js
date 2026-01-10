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
import ClubListScreen from '../screens/class/ClubListScreen';
import CreateClubScreen from '../screens/class/CreateClubScreen';
import ClubDetailScreen from '../screens/class/ClubDetailScreen';
import GradebookScreen from '../screens/class/GradebookScreen';
import LessonPlansScreen from '../screens/class/LessonPlansScreen';
import SchoolDataScreen from '../screens/SchoolDataScreen';
import EngagementInsightsScreen from '../screens/EngagementInsightsScreen';
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
import CalendarScreen from '../screens/CalendarScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import MarketScreen from '../screens/market/MarketScreen';
import MeetingsScreen from '../screens/meetings/MeetingsScreen';
import MyExamsScreen from '../screens/MyExamsScreen';

import ExamManagementScreen from '../screens/ExamManagementScreen';
import CreateExamSessionScreen from '../screens/CreateExamSessionScreen';
import ExamSessionDetailScreen from '../screens/ExamSessionDetailScreen';
import CreateExamPaperScreen from '../screens/CreateExamPaperScreen';
import ExamAllocationsScreen from '../screens/ExamAllocationsScreen';

// Gamification Screens
import LeaderboardScreen from '../screens/gamification/LeaderboardScreen';
import ShopScreen from '../screens/gamification/ShopScreen';

// Chat Screens
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatRoomScreen from '../screens/chat/ChatRoomScreen';
import NewChatScreen from '../screens/chat/NewChatScreen';
import SearchScreen from '../screens/SearchScreen';

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
    <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
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
    <Stack.Screen name="ClubList" component={ClubListScreen} options={{ title: 'Clubs & Teams' }} />
    <Stack.Screen name="CreateClub" component={CreateClubScreen} options={{ title: 'Manage Club' }} />
    <Stack.Screen name="ClubDetail" component={ClubDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Gradebook" component={GradebookScreen} options={{ headerShown: false }} />
    <Stack.Screen name="LessonPlans" component={LessonPlansScreen} options={{ headerShown: false }} />
    <Stack.Screen name="SchoolData" component={SchoolDataScreen} />
    <Stack.Screen name="EngagementInsights" component={EngagementInsightsScreen} />
    <Stack.Screen name="ManageAnnouncements" component={ManageAnnouncementsScreen} />
    <Stack.Screen name="CreateHomework" component={CreateHomeworkScreen} />
    <Stack.Screen name="CreateAssignment" component={CreateAssignmentScreen} />
    <Stack.Screen name="CreateMarketplaceItem" component={CreateMarketplaceItemScreen} />
    <Stack.Screen name="ManageMarketData" component={ManageMarketDataScreen} />
    <Stack.Screen name="Resources" component={ResourcesScreen} />
    <Stack.Screen name="Polls" component={PollsScreen} />
    <Stack.Screen name="CreatePoll" component={CreatePollScreen} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
    <Stack.Screen name="Homework" component={HomeworkScreen} options={{ title: 'Homework' }} />
    <Stack.Screen name="Market" component={MarketScreen} options={{ title: 'Marketplace' }} />
    <Stack.Screen name="Meetings" component={MeetingsScreen} options={{ title: 'Meetings' }} />
    <Stack.Screen name="MyExams" component={MyExamsScreen} options={{ headerShown: false }} />

    {/* Exam Management */}
    <Stack.Screen name="ExamManagement" component={ExamManagementScreen} options={{ headerShown: false }} />
    <Stack.Screen name="CreateExamSession" component={CreateExamSessionScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ExamSessionDetail" component={ExamSessionDetailScreen} options={{ headerShown: false }} />
    <Stack.Screen name="CreateExamPaper" component={CreateExamPaperScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ExamAllocations" component={ExamAllocationsScreen} options={{ headerShown: false }} />

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
