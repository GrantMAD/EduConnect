import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { SchoolProvider } from './context/SchoolContext';
import { supabase } from './lib/supabase';

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

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        setSession(data.session);
      }
      setLoading(false);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ThemeProvider session={session}>
      <ToastProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <SchoolProvider>
            {session ? <AppStack /> : <AuthStack />}
          </SchoolProvider>
        </NavigationContainer>
      </ToastProvider>
    </ThemeProvider>
  );
}