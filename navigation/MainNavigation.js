import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, Text, Image, Dimensions } from 'react-native';
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
} from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-native-modal';
import { supabase } from '../lib/supabase';

const defaultUserImage = require('../assets/user.png');

import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import MarketScreen from '../screens/MarketScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

const CustomHeader = ({ navigation }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const insets = useSafeAreaInsets();

  const toggleDropdown = () => setShowDropdown(!showDropdown);

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
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{
          backgroundColor: '#fff',
          padding: 8,
          borderRadius: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <FontAwesomeIcon icon={faBars} size={20} color="#007AFF" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={toggleDropdown}
        style={{
          backgroundColor: '#fff',
          padding: 8,
          borderRadius: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}
      >
        <FontAwesomeIcon icon={faBell} size={20} color="#007AFF" />
      </TouchableOpacity>

      <Modal
        isVisible={showDropdown}
        onBackdropPress={toggleDropdown}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0.1}
        style={{
          margin: 0,
          justifyContent: 'flex-start',
          alignItems: 'flex-end',
          marginTop: 90,
          marginRight: 25,
        }}
      >
        <View
          style={{
            width: 240,
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 15,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>
            Notifications
          </Text>
          <View style={{ borderBottomColor: '#eee', borderBottomWidth: 1, marginBottom: 8 }} />
          {['New message received', 'Homework updated', 'Event reminder'].map((item, i) => (
            <Text
              key={i}
              style={{
                paddingVertical: 6,
                fontSize: 15,
                color: '#444',
                borderBottomWidth: i < 2 ? 0.5 : 0,
                borderBottomColor: '#f0f0f0',
              }}
            >
              • {item}
            </Text>
          ))}
        </View>
      </Modal>
    </View>
  );
};

const HomeTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#7b7b7b',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopColor: '#ddd',
        height: 70,            // slightly taller
        paddingBottom: 10,     // gives space above nav buttons
        paddingTop: 6,
        marginBottom: 5,       // lifts bar above system buttons
      },
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
      },
      tabBarHideOnKeyboard: true, // hides tab bar when keyboard appears
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

const MainStackNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      header: ({ navigation }) => <CustomHeader navigation={navigation} />,
    }}
  >
    <Stack.Screen name="HomeTabs" component={HomeTabs} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);

const CustomDrawerContent = (props) => {
  const [userAvatar, setUserAvatar] = useState(null);
  const [userName, setUserName] = useState('Guest');
  const [userEmail, setUserEmail] = useState('N/A');

  const mainStackState = props.state.routes.find(route => route.name === 'MainStack')?.state;
  const activeMainStackRouteName = mainStackState?.routes[mainStackState.index]?.name;

  useEffect(() => {
    const fetchUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
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
    <View
      style={{
        flex: 1,
        height: '100%',
        paddingTop: 70,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 25,
          paddingBottom: 15,
          borderBottomWidth: 1,
          borderBottomColor: '#e1e4e8',
          paddingHorizontal: 20,
        }}
      >
        <Image
          source={userAvatar ? { uri: userAvatar } : defaultUserImage}
          style={{
            width: 55,
            height: 55,
            borderRadius: 27.5,
            marginRight: 12,
            borderWidth: 2,
            borderColor: '#007AFF',
          }}
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
