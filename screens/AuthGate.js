import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

const AuthGate = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSchoolId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Error fetching user in AuthGate:', error.message);
        navigation.replace('Auth'); // Navigate to Auth stack on error
        return;
      }

      if (user) {
        // Fetch user profile from 'users' table to get school_id
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile in AuthGate:', profileError.message);
          navigation.replace('Auth'); // Navigate to Auth stack on error
          return;
        }

        if (userProfile && userProfile.school_id) {
          navigation.replace('MainNavigation');
        } else {
          navigation.replace('SchoolSetup');
        }
      } else {
        navigation.replace('Auth'); // No user, go to Auth stack
      }
      setLoading(false);
    };

    checkSchoolId();
  }, []); // Empty dependency array means it runs once on mount

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return null; // Or a splash screen
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AuthGate;
