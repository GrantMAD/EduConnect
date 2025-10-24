import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, TouchableOpacity, Text } from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome'; // Import FontAwesome

import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import HomeworkScreen from '../screens/HomeworkScreen';
import MarketScreen from '../screens/MarketScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();



// Custom Header Component
const CustomHeader = ({ navigation }) => {

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
      <TouchableOpacity onPress={() => navigation.openDrawer()}>
        <FontAwesome name="bars" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
};

// Tab Navigator
const HomeTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#ccc' },
      }}
    >
      <Tab.Screen
        name="Announcements"
        component={AnnouncementsScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcon name="bullhorn" color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcon name="calendar" color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Homework"
        component={HomeworkScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcon name="book-open-outline" color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Market"
        component={MarketScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcon name="store" color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <MaterialCommunityIcon name="account" color={color} size={22} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Stack Navigator with Custom Header
const MainStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        header: ({ navigation, route }) => <CustomHeader navigation={navigation} route={route} />,
      }}
    >
      <Stack.Screen name="HomeTabs" component={HomeTabs} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

// Custom Drawer Content (Placeholder for now)
const CustomDrawerContent = (props) => {
  return (
    <View style={{ flex: 1, paddingTop: 50, paddingHorizontal: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Menu</Text>
      {/* Add your drawer items here */}
      <TouchableOpacity onPress={() => { /* Handle navigation */ }}>
        <Text style={{ fontSize: 18, paddingVertical: 10 }}>Item 1</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { /* Handle navigation */ }}>
        <Text style={{ fontSize: 18, paddingVertical: 10 }}>Item 2</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function MainNavigation() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        // headerShown: false, // Reverted to make custom header visible
      }}
    >
      <Drawer.Screen name="MainStack" component={MainStackNavigator} options={{ title: '' }} />
    </Drawer.Navigator>
  );
}
