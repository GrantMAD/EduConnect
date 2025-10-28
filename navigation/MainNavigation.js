import React, { useEffect, useState, useRef } from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, Text, Image, Dimensions, Animated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faBullhorn,
  faCalendar,
  faBookOpen,
  faStore,
  faUser,
  faBell,
  faBars,
  faRightFromBracket,
  faHome,
  faGear
} from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-native-modal';

import { supabase } from '../lib/supabase';
const defaultUserImage = require('../assets/user.png');

import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import MarketScreen from '../screens/MarketScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import UserManagementScreen from '../screens/UserManagementScreen';

const Tab = createMaterialTopTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const CustomHeader = ({ navigation, showActions = false }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  // Pulsing animation for unread notifications
  useEffect(() => {
    if (hasUnread) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasUnread]);

  // Fetch notifications
  useEffect(() => {
    let subscription;
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setNotifications(data);
        setHasUnread(data.some(n => !n.is_read));
      }

      subscription = supabase
        .channel('notifications-channel')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          async () => {
            const { data: newData } = await supabase
              .from('notifications')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });
            if (newData) {
              setNotifications(newData);
              setHasUnread(newData.some(n => !n.is_read));
            }
          }
        )
        .subscribe();
    };

    fetchNotifications();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  // Handle Accept/Decline for school join requests (only used if showActions=true)
  const handleJoinResponse = async (notification, accept) => {
    try {
      const regex = /([a-f0-9\-]{36})/; // UUID regex
      const match = notification.message.match(regex);
      if (!match) return Alert.alert('Error', 'Could not parse request user ID.');
      const requesterId = match[1];

      if (accept) {
        await supabase.from('users').update({ school_id: notification.related_school_id }).eq('id', requesterId);
        const { data: school } = await supabase
          .from('schools')
          .select('users')
          .eq('id', notification.related_school_id)
          .single();
        const newUsers = [...(school.users || []), requesterId];
        await supabase.from('schools').update({ users: newUsers }).eq('id', notification.related_school_id);
        await supabase.from('notifications').insert([{
          user_id: requesterId,
          type: 'school_join_accepted',
          title: 'Join Request Accepted',
          message: 'Your request to join the school has been accepted!',
          is_read: false,
        }]);
      } else {
        await supabase.from('notifications').insert([{
          user_id: requesterId,
          type: 'school_join_declined',
          title: 'Join Request Declined',
          message: 'Your request to join the school has been declined.',
          is_read: false,
        }]);
      }

      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error handling join response:', error);
      Alert.alert('Error', 'Could not process the request.');
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 65 + insets.top,
        paddingTop: insets.top,
        backgroundColor: '#f8f9fb',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e5e9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
        zIndex: 20,
      }}
    >
      {/* Drawer Button */}
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{ backgroundColor: '#fff', padding: 8, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
      >
        <FontAwesomeIcon icon={faBars} size={20} color="#007AFF" />
      </TouchableOpacity>

      {/* Notification Bell */}
      <TouchableOpacity
        onPress={() => setShowDropdown(true)}
        style={{ backgroundColor: '#fff', padding: 8, borderRadius: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, position: 'relative' }}
      >
        <FontAwesomeIcon icon={faBell} size={20} color="#007AFF" />
        {hasUnread && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#ff3b30',
              transform: [{ scale: pulseAnim }],
              shadowColor: '#ff3b30',
              shadowOpacity: 0.8,
              shadowRadius: 6,
              elevation: 5,
            }}
          />
        )}
      </TouchableOpacity>

      {/* Notifications Dropdown */}
      <Modal
        isVisible={showDropdown}
        onBackdropPress={() => setShowDropdown(false)}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.1}
        style={{ margin: 0, justifyContent: 'flex-start', alignItems: 'flex-end', marginTop: 90, marginRight: 25 }}
      >
        <View style={{ width: 300, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15, maxHeight: 420 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 10, textAlign: 'center' }}>
            Notifications
          </Text>
          <View style={{ borderBottomColor: '#eee', borderBottomWidth: 1, marginBottom: 8 }} />

          {notifications.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#666', paddingVertical: 10 }}>No notifications</Text>
          ) : (
            notifications.slice(0, 6).map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => {
                  setShowDropdown(false);
                  navigation.navigate('Notifications', { selectedNotificationId: n.id });
                }}
                style={{
                  backgroundColor: n.is_read ? '#f9f9f9' : '#e6f0ff',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 8,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: n.is_read ? '500' : '700', color: n.is_read ? '#444' : '#007AFF', marginBottom: 4 }} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={{ fontSize: 13, color: '#666' }} numberOfLines={2}>
                  {n.message}
                </Text>
                <Text style={{ fontSize: 11, color: '#999', textAlign: 'right', marginTop: 4 }}>
                  {new Date(n.created_at).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity
            onPress={() => { setShowDropdown(false); navigation.navigate('Notifications'); }}
            style={{ marginTop: 10, paddingVertical: 10, borderRadius: 8, backgroundColor: '#007AFF', alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>View All Notifications</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

// Bottom Tabs
const HomeTabs = () => (
  <Tab.Navigator
    tabBarPosition="bottom"
    screenOptions={{
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#7b7b7b',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopColor: '#ddd',
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
        backgroundColor: '#007AFF',
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

// Stack Navigator
const MainStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      header: ({ navigation }) => <CustomHeader navigation={navigation} />,
    }}
  >
    <Stack.Screen name="HomeTabs" component={HomeTabs} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="UserManagement" component={UserManagementScreen} />
    <Stack.Screen name="Notifications">
      {props => <NotificationsScreen {...props} showActions={true} />}
    </Stack.Screen>
  </Stack.Navigator>
);

// Custom Drawer
const CustomDrawerContent = (props) => {
  const [userAvatar, setUserAvatar] = useState(null);
  const [userName, setUserName] = useState('Guest');
  const [userEmail, setUserEmail] = useState('N/A');

  const mainStackState = props.state.routes.find(route => route.name === 'MainStack')?.state;
  const activeMainStackRouteName = mainStackState?.routes[mainStackState.index]?.name;

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserAvatar(profile.avatar_url);
          setUserName(profile.full_name || user.email);
        }
        setUserEmail(user.email);
      }
    };
    fetchUserData();
  }, []);

  return (
    <View style={{ flex: 1, height: '100%', paddingTop: 70 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#e1e4e8', paddingHorizontal: 20 }}>
        <Image
          source={userAvatar ? { uri: userAvatar } : defaultUserImage}
          style={{ width: 55, height: 55, borderRadius: 27.5, marginRight: 12, borderWidth: 2, borderColor: '#007AFF' }}
        />
        <View>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#222' }}>Welcome,</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#007AFF' }}>{userName}</Text>
          <Text style={{ fontSize: 12, color: '#777' }}>{userEmail}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => props.navigation.navigate('MainStack', { screen: 'HomeTabs' })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 20,
          backgroundColor: activeMainStackRouteName === 'HomeTabs' ? '#d0e6ff' : 'transparent',
          borderRadius: 8,
        }}
      >
        <FontAwesomeIcon icon={faHome} size={18} color="#007AFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, color: '#333', fontWeight: '500' }}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => props.navigation.navigate('MainStack', { screen: 'Profile' })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 20,
          backgroundColor: activeMainStackRouteName === 'Profile' ? '#d0e6ff' : 'transparent',
          borderRadius: 8,
        }}
      >
        <FontAwesomeIcon icon={faUser} size={18} color="#007AFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, color: '#333', fontWeight: '500' }}>Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => props.navigation.navigate('MainStack', { screen: 'Settings' })}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 20,
          backgroundColor: activeMainStackRouteName === 'Settings' ? '#d0e6ff' : 'transparent',
          borderRadius: 8,
        }}
      >
        <FontAwesomeIcon icon={faGear} size={18} color="#007AFF" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, color: '#333', fontWeight: '500' }}>Settings</Text>
      </TouchableOpacity>

      <View style={{ flex: 1 }} />

      <TouchableOpacity
        onPress={async () => {
          await supabase.auth.signOut();
        }}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, marginBottom: 20 }}
      >
        <FontAwesomeIcon icon={faRightFromBracket} size={18} color="#d9534f" style={{ marginRight: 15 }} />
        <Text style={{ fontSize: 16, color: '#d9534f', fontWeight: '500' }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function MainNavigation() {
  const drawerWidth = Dimensions.get('window').width * 0.75;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: 'rgba(248, 249, 251, 0.9)',
        },
        overlayColor: 'rgba(0,0,0,0.4)',
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="MainStack" component={MainStackNavigator} />
    </Drawer.Navigator>
  );
}
