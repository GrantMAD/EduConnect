import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBars, faBell, faComments } from '@fortawesome/free-solid-svg-icons';
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
    // ... (existing fetchNotifications)

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
        backgroundColor: theme.colors.headerBackground,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.cardBorder,
        shadowColor: theme.colors.text,
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
        style={{ backgroundColor: theme.colors.surface, padding: 8, borderRadius: 10, shadowColor: theme.colors.text, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }}
      >
        <FontAwesomeIcon icon={faBars} size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Chat Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ChatList')}
          style={{ backgroundColor: theme.colors.surface, padding: 8, borderRadius: 10, shadowColor: theme.colors.text, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, marginRight: 10, position: 'relative' }}
        >
          <FontAwesomeIcon icon={faComments} size={20} color={theme.colors.success} />
          {unreadCount > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: theme.colors.error,
                transform: [{ scale: pulseAnim }],
                shadowColor: theme.colors.error,
                shadowOpacity: 0.8,
                shadowRadius: 6,
                elevation: 5,
              }}
            />
          )}
        </TouchableOpacity>

        {/* Notification Bell */}
        <TouchableOpacity
          onPress={() => setShowDropdown(true)}
          style={{ backgroundColor: theme.colors.surface, padding: 8, borderRadius: 10, shadowColor: theme.colors.text, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, position: 'relative' }}
        >
          <FontAwesomeIcon icon={faBell} size={20} color={theme.colors.primary} />
          {hasUnread && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: theme.colors.error,
                transform: [{ scale: pulseAnim }],
                shadowColor: theme.colors.error,
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
          <View style={{ width: 300, backgroundColor: theme.colors.surface, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 15 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <FontAwesomeIcon icon={faBell} size={18} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }}>
                Notifications
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.colors.placeholder, marginBottom: 10 }}>
              You have {notifications.length} new notifications.
            </Text>
            <View style={{ borderBottomColor: theme.colors.cardBorder, borderBottomWidth: 1, marginBottom: 8 }} />
            <ScrollView style={{ flexGrow: 0, maxHeight: 300 }}>
              {notifications.length === 0 ? (
                <Text style={{ textAlign: 'center', color: theme.colors.text, paddingVertical: 10 }}>No notifications</Text>
              ) : (
                notifications.slice(0, 6).map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    onPress={() => {
                      setShowDropdown(false);
                      navigation.navigate('Notifications', { selectedNotificationId: n.id });
                    }}
                    style={{
                      backgroundColor: n.is_read ? theme.colors.background : theme.colors.notification,
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                      shadowColor: theme.colors.text,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 2,
                      borderWidth: 1,
                      borderColor: theme.colors.cardBorder,
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: n.is_read ? '500' : '700', color: n.is_read ? theme.colors.text : theme.colors.primary, marginBottom: 4 }} numberOfLines={1}>
                      {n.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.colors.text }} numberOfLines={2}>
                      {n.message}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.colors.placeholder, textAlign: 'right', marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => { setShowDropdown(false); navigation.navigate('Notifications'); }}
              style={{ marginTop: 10, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.primary, alignItems: 'center' }}
            >
              <Text style={{ color: theme.colors.buttonPrimaryText, fontWeight: '600', fontSize: 14 }}>View All Notifications</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </View>
    </View>
  );
};

export default CustomHeader;
