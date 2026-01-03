import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated, Alert, ScrollView, Image, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faBell, faComments, faSearch } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-native-modal';
import { supabase } from '../../lib/supabase';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';

const CustomHeader = ({ navigation, showActions = false }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { theme } = useTheme();
  const { unreadCount } = useChat();

  const toggleDropdown = () => setShowDropdown(!showDropdown);

  // Pulsing animation for unread notifications AND messages
  useEffect(() => {
    if (hasUnread || unreadCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasUnread, unreadCount]);
  useEffect(() => {
    let isMounted = true;
    let subscription = null;

    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (isMounted && data) {
          setNotifications(data);
          setHasUnread(data.some(n => !n.is_read));
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    const setupSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        const uniqueChannelId = `notifications-header-${user.id}-${Math.random().toString(36).substr(2, 9)}`;
        subscription = supabase
          .channel(uniqueChannelId)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            () => {
              // Re-fetch when ANY notification change happens
              fetchNotifications();
            }
          )
          .subscribe();
      } catch (error) {
        console.error('Error setting up subscription:', error);
      }
    };

    // Initial load
    fetchNotifications();
    setupSubscription();

    // Listen for app state changes (when app comes to foreground)
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Refresh notifications when app becomes active (e.g., from push notification tap)
        // ONLY fetch data, do NOT re-subscribe
        fetchNotifications();
      }
    });

    return () => {
      isMounted = false;
      if (subscription) supabase.removeChannel(subscription);
      appStateSubscription.remove();
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
        backgroundColor: theme.colors.headerBackground,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.cardBorder,
        zIndex: 20,
      }}
    >
      {/* Drawer Button */}
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={{ backgroundColor: theme.colors.card, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.cardBorder }}
        activeOpacity={0.7}
      >
        <FontAwesomeIcon icon={faBars} size={16} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Logo - Centered */}
      <Image
        source={require('../../assets/Logo.png')}
        style={{
          width: 50,
          height: 50,
          resizeMode: 'contain',
          position: 'absolute',
          left: '50%',
          marginLeft: -25,
          top: insets.top + 7.5,
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Chat Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ChatList')}
          style={{ backgroundColor: theme.colors.card, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.cardBorder, marginRight: 8, position: 'relative' }}
          activeOpacity={0.7}
        >
          <FontAwesomeIcon icon={faComments} size={16} color={theme.colors.primary} />
          {unreadCount > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#ef4444',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: theme.colors.headerBackground,
                transform: [{ scale: pulseAnim }],
              }}
            >
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>{unreadCount}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>

        {/* Notification Bell */}
        <TouchableOpacity
          onPress={() => setShowDropdown(true)}
          style={{ backgroundColor: theme.colors.card, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.cardBorder, position: 'relative' }}
          activeOpacity={0.7}
        >
          <FontAwesomeIcon icon={faBell} size={16} color={theme.colors.text} />
          {hasUnread && (
            <Animated.View
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#ef4444',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: theme.colors.headerBackground,
                transform: [{ scale: pulseAnim }],
              }}
            >
              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '900' }}>
                {notifications.filter(n => !n.is_read).length}
              </Text>
            </Animated.View>
          )}
        </TouchableOpacity>

        {/* Notifications Dropdown */}
        <Modal
          isVisible={showDropdown}
          onBackdropPress={() => setShowDropdown(false)}
          animationIn="fadeIn"
          animationOut="fadeOut"
          backdropOpacity={0.2}
          style={{ margin: 0, justifyContent: 'flex-start', alignItems: 'flex-end', marginTop: 80, marginRight: 20 }}
        >
          <View style={{ width: 320, backgroundColor: theme.colors.surface, borderRadius: 24, paddingVertical: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: theme.colors.cardBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faBell} size={14} color={theme.colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.text }}>
                  INBOX
                </Text>
              </View>
              <View style={{ backgroundColor: theme.colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '900' }}>{notifications.filter(n => !n.is_read).length} NEW</Text>
              </View>
            </View>
            
            <ScrollView style={{ flexGrow: 0, maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.placeholder, fontWeight: '700', fontSize: 13 }}>CLEAR INBOX</Text>
                </View>
              ) : (
                notifications.slice(0, 6).map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => {
                      setShowDropdown(false);
                      navigation.navigate('Notifications', { selectedNotificationId: n.id });
                    }}
                    style={{
                      backgroundColor: n.is_read ? 'transparent' : theme.colors.primary + '05',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: n.is_read ? theme.colors.cardBorder : theme.colors.primary + '20',
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '900', color: n.is_read ? theme.colors.text : theme.colors.primary, marginBottom: 4 }} numberOfLines={1}>
                      {n.title.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.text }} numberOfLines={2}>
                      {n.message}
                    </Text>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: theme.colors.placeholder, marginTop: 8 }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => { setShowDropdown(false); navigation.navigate('Notifications'); }}
              style={{ marginTop: 16, height: 48, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>VIEW ALL NOTIFICATIONS</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </View>
  );
};

export default CustomHeader;
