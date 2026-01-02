import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, Animated, Easing, Image, Dimensions } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { usePushNotification } from '../../context/PushNotificationContext';

const { width } = Dimensions.get('window');
const logo = require('../../assets/Logo.png');

const AuthGate = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const { registerForPushNotificationsAsync } = usePushNotification();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    const checkSchoolId = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Error fetching user in AuthGate:', error.message);
        await supabase.auth.signOut();
        return;
      }

      if (user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('school_id, role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile in AuthGate:', profileError.message);
          await supabase.auth.signOut();
          return;
        }

        if (userProfile) {
          if (userProfile.role === 'server_admin') {
            Alert.alert(
              "Access Restricted",
              "Server Administrator access is only available on the Web Application. Please log in there to manage the system.",
              [
                { 
                  text: "OK", 
                  onPress: async () => await supabase.auth.signOut() 
                }
              ]
            );
            return;
          }

          if (userProfile.school_id) {
            await registerForPushNotificationsAsync();
            navigation.replace('MainNavigation');
          } else if (userProfile.role !== 'user') {
            navigation.replace('SchoolSetup');
          } else {
            navigation.replace('RoleSelection');
          }
        } else {
          navigation.replace('RoleSelection');
        }
      } else {
        await supabase.auth.signOut();
      }
      setLoading(false);
    };

    // Keep the splash/logo visible for at least 2 seconds for effect
    const timer = setTimeout(checkSchoolId, 2000);
    return () => clearTimeout(timer);
  }, []); 

  if (loading) {
    return (
      <View style={styles.container}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return null; 
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
      width: width * 0.4,
      height: width * 0.4,
  }
});

export default AuthGate;
