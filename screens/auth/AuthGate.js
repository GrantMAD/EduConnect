import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, Animated, Easing, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePushNotification } from '../../context/PushNotificationContext';

// Import services
import { getCurrentUser, signOut as signOutService } from '../../services/authService';
import { getUserProfile } from '../../services/userService';

const { width } = Dimensions.get('window');
const logo = require('../../assets/Logo.png');

const AuthGate = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const { registerForPushNotificationsAsync } = usePushNotification();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const checkSchoolId = useCallback(async () => {
    try {
      const user = await getCurrentUser();

      if (user) {
        const userProfile = await getUserProfile(user.id);

        if (userProfile) {
          if (userProfile.role === 'server_admin') {
            Alert.alert(
              "Access Restricted",
              "Server Administrator access is only available on the Web Application. Please log in there to manage the system.",
              [
                { 
                  text: "OK", 
                  onPress: async () => await signOutService() 
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
        await signOutService();
      }
    } catch (error) {
      console.error('Error in AuthGate:', error.message);
      await signOutService();
    } finally {
      setLoading(false);
    }
  }, [navigation, registerForPushNotificationsAsync]);

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

    // Keep the splash/logo visible for at least 2 seconds for effect
    const timer = setTimeout(checkSchoolId, 2000);
    return () => clearTimeout(timer);
  }, [checkSchoolId, pulseAnim]); 

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

export default React.memo(AuthGate);