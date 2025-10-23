import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { supabase } from './lib/supabase'; // your Supabase client
import MainNavigation from './navigation/MainNavigation';
import AuthNavigation from './navigation/AuthNavigation'; // make sure this exists
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get the current session
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        setSession(data.session);
      }
      setLoading(false);
    };

    getSession();

    // Listen for auth state changes
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
      <NavigationContainer>
        <StatusBar style="auto" />
        {session ? <MainNavigation /> : <AuthNavigation />}
      </NavigationContainer>
    );
  }
