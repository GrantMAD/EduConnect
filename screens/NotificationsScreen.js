import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import NotificationCardSkeleton from '../components/skeletons/NotificationCardSkeleton';
import { FontAwesome5 } from '@expo/vector-icons';

export default function NotificationsScreen({ route, navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

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

  const handleNotificationPress = async (notification) => {
    const { data, type } = notification;
    let itemId, tableName, selectFields = '*';

    switch (type) {
      case 'new_general_announcement':
      case 'new_class_announcement':
        itemId = data?.announcement_id;
        tableName = 'announcements';
        selectFields = 'title, message, created_at';
        break;
      case 'new_homework':
        itemId = data?.homework_id;
        tableName = 'homework';
        selectFields = 'subject, description, due_date';
        break;
      case 'new_assignment':
        itemId = data?.assignment_id;
        tableName = 'assignments';
        selectFields = 'title, description, due_date, file_url';
        break;
      default:
        return; // Not a pressable notification
    }

    if (!itemId) return;

    setModalLoading(true);
    setDetailModalVisible(true);
    setSelectedItemDetail(null);

    try {
      const { data: itemData, error } = await supabase
        .from(tableName)
        .select(selectFields)
        .eq('id', itemId)
        .single();

      if (error) throw error;

      setSelectedItemDetail({ ...itemData, type });
    } catch (err) {
      console.error(`Error fetching ${type} details:`, err);
      Alert.alert('Error', `Could not fetch item details.`);
      setDetailModalVisible(false);
    } finally {
      setModalLoading(false);
    }
  };


  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all of your notifications? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error("User not found");

              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('user_id', user.id);

              if (error) throw error;

              setNotifications([]);
              Alert.alert('Success', 'All notifications have been cleared.');
            } catch (err) {
              console.error('Error clearing notifications:', err);
              Alert.alert('Error', 'Could not clear all notifications.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

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

  const handleParentChildResponse = async (notification, accept) => {
    try {
      if (accept) {
        const { error: insertError } = await supabase
          .from('parent_child_relationships')
          .insert({
            parent_id: notification.related_user_id,
            child_id: notification.user_id,
          });

        if (insertError) {
          throw insertError;
        }

        const { error: updateRequestError } = await supabase
          .from('parent_child_requests')
          .update({ status: 'accepted' })
          .eq('child_id', notification.user_id)
          .eq('parent_id', notification.related_user_id)
          .eq('status', 'pending');

        if (updateRequestError) {
          throw updateRequestError;
        }

        await supabase.from('notifications').insert({
          user_id: notification.related_user_id,
          type: 'parent_child_accepted',
          title: 'Association Request Accepted',
          message: `Your association request with ${notification.message.split(' wants to associate with you.')[0]} has been accepted.`,
          is_read: false,
        });
      } else {
        const { error: updateRequestError } = await supabase
          .from('parent_child_requests')
          .update({ status: 'rejected' })
          .eq('child_id', notification.user_id)
          .eq('parent_id', notification.related_user_id)
          .eq('status', 'pending');

        if (updateRequestError) {
          throw updateRequestError;
        }

        await supabase.from('notifications').insert({
          user_id: notification.related_user_id,
          type: 'parent_child_rejected',
          title: 'Association Request Rejected',
          message: `Your association request with ${notification.message.split(' wants to associate with you.')[0]} has been rejected.`,
          is_read: false,
        });
      }

      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));

    } catch (err) {
      console.error('Error handling parent-child response:', err);
      Alert.alert('Error', 'Could not process the request: ' + err.message);
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
    const iconName = item.type === 'school_join_request'
      ? 'school'
      : item.type === 'new_general_announcement' || item.type === 'new_class_announcement'
      ? 'bullhorn'
      : item.type === 'added_to_class'
      ? 'user-plus'
      : item.type === 'new_homework' || item.type === 'new_assignment'
      ? 'clipboard-list'
      : 'bell';

    const isPressable = [
      'new_general_announcement', 
      'new_class_announcement', 
      'new_homework', 
      'new_assignment'
    ].includes(item.type);

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => handleNotificationPress(item)}
        disabled={!isPressable}
      >
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

          {item.type === 'parent_child_request' && isUnread && (
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={() => handleParentChildResponse(item, true)}
              >
                <Text style={styles.buttonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={() => handleParentChildResponse(item, false)}
              >
                <Text style={styles.buttonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          )}

          {item.is_read && (item.type === 'school_join_request' || item.type === 'parent_child_request') && (
            <>
              <View style={styles.hr} />
              <Text style={styles.statusText}>
                {item.status_text || 'You have read this notification'}
              </Text>
            </>
          )}

          {item.is_read && item.type !== 'school_join_request' && item.type !== 'parent_child_request' && (
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
      </TouchableOpacity>
    );
  };

  if (loading) return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      <FlatList
        data={[1, 2, 3, 4, 5]}
        keyExtractor={(item) => item.toString()}
        renderItem={() => <NotificationCardSkeleton />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      <View style={styles.subHeaderContainer}>
        <Text style={styles.notificationCount}>You have {notifications.length} notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAllButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
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

      <Modal
        transparent={true}
        animationType="fade"
        visible={isDetailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {modalLoading ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : selectedItemDetail ? (
              <>
                <View style={styles.modalTitleContainer}>
                  <FontAwesome5 name={
                    selectedItemDetail.type.includes('announcement') ? 'bullhorn' : 'clipboard-list'
                  } size={20} color="#007AFF" style={{ marginRight: 10 }} />
                  <Text style={styles.modalHeader}>{selectedItemDetail.title || selectedItemDetail.subject}</Text>
                </View>

                {selectedItemDetail.due_date && (
                  <View style={styles.modalDateContainer}>
                    <FontAwesome5 name="calendar-check" size={16} color="#d9534f" style={{ marginRight: 8 }} />
                    <Text style={[styles.modalDate, { color: '#d9534f' }]}>Due: {new Date(selectedItemDetail.due_date).toLocaleDateString()}</Text>
                  </View>
                )}

                {selectedItemDetail.created_at && (
                  <View style={styles.modalDateContainer}>
                    <FontAwesome5 name="clock" size={16} color="#666" style={{ marginRight: 8 }} />
                    <Text style={styles.modalDate}>Posted: {new Date(selectedItemDetail.created_at).toLocaleString()}</Text>
                  </View>
                )}

                <View style={styles.hr} />
                <ScrollView style={styles.modalMessageScrollView}>
                  <Text style={styles.modalMessage}>{selectedItemDetail.message || selectedItemDetail.description}</Text>
                </ScrollView>

                {selectedItemDetail.file_url && (
                  <View>
                    <View style={styles.hr} />
                    <TouchableOpacity style={styles.fileLinkButton} onPress={() => Linking.openURL(selectedItemDetail.file_url)}>
                      <FontAwesome5 name="link" size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.modalCloseButtonText}>View Attached File</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 5, textAlign: 'center', color: '#333' },
  subHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8, // Added for some spacing
  },
  notificationCount: {
    fontSize: 14,
    color: '#888',
  },
  clearAllButtonText: {
    fontSize: 14,
    color: '#d9534f',
    fontWeight: '600',
  },
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
    marginVertical: 12,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%', // Limit height to make it scrollable
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginVertical: 50, // Added vertical margin for gap
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalDate: {
    fontSize: 13,
    color: '#666',
  },
  modalMessageScrollView: {
    maxHeight: '70%', // Adjust as needed
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
  },
  fileLinkButton: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
