import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';

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

  const handleJoinResponse = async (notification, accept) => {
    try {
      const { error } = await supabase.rpc('handle_join_request', {
        p_notification_id: notification.id,
        p_accept: accept
      });

      if (error) throw error;

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

  const renderNotification = ({ item }) => {
    const isUnread = !item.is_read;
    const iconName = item.type === 'school_join_request' ? 'school' : 'bell';

    return (
      <View style={[styles.card, isUnread && styles.unreadCard]}>
        <FontAwesome5 name={iconName} size={24} color={isUnread ? '#007AFF' : '#ccc'} style={styles.icon} />
        <View style={styles.contentContainer}>
          <Text style={[styles.title, isUnread && styles.unreadTitle]}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>

          {item.type === 'school_join_request' && isUnread && (
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={() => handleJoinResponse(item, true)}
              >
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={() => handleJoinResponse(item, false)}
              >
                <Text style={styles.buttonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.is_read && item.type === 'school_join_request' && (
            <>
              <View style={styles.hr} />
              <Text style={styles.statusText}>
                {item.status_text || 'You have read this notification'}
              </Text>
            </>
          )}

          {item.is_read && item.type !== 'school_join_request' && (
            <>
              <View style={styles.hr} />
              <Text style={styles.statusText}>
                You have read this notification
              </Text>
            </>
          )}
        </View>
        <View style={styles.actionsContainer}>
          {isUnread && (
            <TouchableOpacity onPress={() => handleMarkAsRead(item.id)} style={styles.actionButton}>
              <FontAwesome5 name="eye" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
            <FontAwesome5 name="trash" size={20} color="#d9534f" />
          </TouchableOpacity>
        </View>
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
          renderItem={renderNotification}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  emptyText: { textAlign: 'center', color: '#666', marginTop: 50, fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  unreadCard: { backgroundColor: '#eef5ff' },
  icon: { marginRight: 16, marginTop: 4 },
  contentContainer: { flex: 1 },
  title: { fontSize: 17, fontWeight: '600', marginBottom: 4, color: '#444' },
  unreadTitle: { fontWeight: 'bold', color: '#005cbf' },
  message: { fontSize: 15, color: '#666', marginBottom: 8 },
  date: { fontSize: 12, color: '#aaa', textAlign: 'left' },
  buttonsRow: { flexDirection: 'row', marginTop: 12 },
  button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginRight: 10 },
  acceptButton: { backgroundColor: '#007AFF' },
  declineButton: { backgroundColor: '#d9534f' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  statusText: { marginTop: 8, fontStyle: 'italic', color: '#999', fontSize: 14 },
  actionsContainer: { flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', marginLeft: 16 },
  actionButton: { padding: 8 },
  hr: {
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    marginVertical: 8,
  },
});
