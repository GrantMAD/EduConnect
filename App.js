import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from './context/AuthContext';
import AppWalkthrough from './components/AppWalkthrough';
import { supabase } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';

import AuthNavigation from './navigation/AuthNavigation';
import MainNavigation from './navigation/MainNavigation';
import AuthGate from './screens/auth/AuthGate';
import RoleSelectionScreen from './screens/RoleSelectionScreen';
import SchoolSetupScreen from './screens/SchoolSetupScreen';

const RootStack = createNativeStackNavigator();

// Define AuthStack screens
const AuthStack = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Auth" component={AuthNavigation} />
  </RootStack.Navigator>
);

// Define AppStack screens
const AppStack = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="AuthGate" component={AuthGate} />
    <RootStack.Screen name="RoleSelection" component={RoleSelectionScreen} />
    <RootStack.Screen name="MainNavigation" component={MainNavigation} />
    <RootStack.Screen name="SchoolSetup" component={SchoolSetupScreen} />
  </RootStack.Navigator>
);

import AppProviders from './components/AppProviders';

import * as Linking from 'expo-linking';

const linking = {
  prefixes: [Linking.createURL('/'), 'classconnect://'],
  config: {
    screens: {
      Auth: {
        screens: {
          UpdatePassword: 'update-password',
          SignIn: 'login',
        },
      },
    },
  },
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const session = user ? { user } : null;

  return (
    <AppProviders session={session}>
      <ErrorBoundary>
        <NavigationContainer linking={linking}>
          <StatusBar style="auto" />
          {user ? <AppStack /> : <AuthStack />}
          <AppWalkthrough />
        </NavigationContainer>
      </ErrorBoundary>
    </AppProviders>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}