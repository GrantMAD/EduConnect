import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesome } from '@expo/vector-icons';

export default function NotificationsScreen({ route, navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);
      } catch (err) {
        console.error('Error fetching notifications:', err);
        Alert.alert('Error', 'Unable to fetch notifications.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  // Call Supabase function to handle join request
  const handleJoinResponse = async (notification, accept) => {
    try {
      const { error } = await supabase.rpc('handle_join_request', {
        p_notification_id: notification.id,
        p_accept: accept
      });

      if (error) throw error;

      // Update local state to mark read and add status_text
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, is_read: true, status_text: accept ? 'You have accepted this request' : 'You have declined this request' }
            : n
        )
      );

    } catch (err) {
      console.error('Error handling join response:', err);
      Alert.alert('Error', 'Could not process the request.');
    }
  };

  // Delete notification
  const handleDelete = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
      Alert.alert('Error', 'Could not delete notification.');
    }
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('Error marking as read:', err);
      Alert.alert('Error', 'Could not mark as read.');
    }
  };

  const renderNotification = (n) => {
    const isUnread = !n.is_read;

    return (
      <View style={[styles.card, isUnread && styles.unreadCard]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, isUnread && styles.unreadTitle]}>{n.title}</Text>
            <Text style={styles.message}>{n.message}</Text>
            <Text style={styles.date}>{new Date(n.created_at).toLocaleString()}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isUnread && (
              <TouchableOpacity onPress={() => handleMarkAsRead(n.id)} style={{ marginRight: 12 }}>
                <Text style={{ color: '#007AFF', fontWeight: '600' }}>Mark as read</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => handleDelete(n.id)}>
              <FontAwesome name="trash" size={20} color="#d9534f" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Show accept/decline buttons only if unread school_join_request */}
        {n.type === 'school_join_request' && isUnread && (
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => handleJoinResponse(n, true)}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={() => handleJoinResponse(n, false)}
            >
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Show read status for read notifications */}
        {n.is_read && n.type === 'school_join_request' && (
          <Text style={styles.statusText}>
            {n.status_text || 'You have read this notification'}
          </Text>
        )}

        {n.is_read && n.type !== 'school_join_request' && (
          <Text style={styles.statusText}>
            You have read this notification
          </Text>
        )}
      </View>
    );
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      {notifications.length === 0 ? (
        <Text style={styles.emptyText}>No notifications</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderNotification(item)}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f4', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadCard: { backgroundColor: '#e6f0ff' },
  title: { fontSize: 16, fontWeight: '500', marginBottom: 4, color: '#333' },
  unreadTitle: { fontWeight: '700', color: '#007AFF' },
  message: { fontSize: 14, color: '#555', marginBottom: 6 },
  date: { fontSize: 12, color: '#999', textAlign: 'right' },
  buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  button: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6 },
  acceptButton: { backgroundColor: '#007AFF' },
  declineButton: { backgroundColor: '#d9534f' },
  buttonText: { color: '#fff', fontWeight: '600' },
  statusText: { marginTop: 6, fontStyle: 'italic', color: '#555', fontSize: 13 },
});
