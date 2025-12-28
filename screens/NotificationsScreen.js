import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import NotificationCardSkeleton, { SkeletonPiece } from '../components/skeletons/NotificationCardSkeleton';
import { FontAwesome5 } from '@expo/vector-icons';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

export default function NotificationsScreen({ route, navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const { showToast } = useToast();
  const { theme } = useTheme(); // Use the theme hook

  const fetchNotifications = async () => {
    if (!refreshing) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);  // Pagination: Load first 100 notifications

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      showToast('Unable to fetch notifications.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
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
      case 'new_poll':
        // Navigate to Polls screen instead of showing modal
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        navigation.navigate('Polls');
        return;
      case 'new_ptm_booking':
      case 'ptm_cancellation':
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        navigation.navigate('Meetings');
        return;
      case 'added_to_club':
      case 'club_join_accepted':
      case 'club_join_request':
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        navigation.navigate('ClubList');
        return;
      default:
        return; // Not a pressable notification
    }

    if (!itemId) return;

    // Mark notification as read when opening the modal
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id);

    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
    );

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
      showToast(`Could not fetch item details.`, 'error');
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
              showToast('All notifications have been cleared.', 'success');
            } catch (err) {
              console.error('Error clearing notifications:', err);
              showToast('Could not clear all notifications.', 'error');
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
      showToast(accept ? 'Request accepted.' : 'Request declined.', 'success');

    } catch (err) {
      console.error('Error handling join response:', err);
      showToast('Could not process the request.', 'error');
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
      showToast('Notification deleted.', 'success');
    } catch (err) {
      console.error('Error deleting notification:', err);
      showToast('Could not delete notification.', 'error');
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
        showToast('Association request accepted.', 'success');
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
        showToast('Association request rejected.', 'success');
      }

      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));

    } catch (err) {
      console.error('Error handling parent-child response:', err);
      showToast('Could not process the request: ' + err.message, 'error');
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
      showToast('Notification marked as read.', 'success');
    } catch (err) {
      console.error('Error marking as read:', err);
      showToast('Could not mark as read.', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      console.error('Error marking all as read:', err);
      showToast('Could not mark all as read.', 'error');
    }
  };

  const groupNotifications = (notifs) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    notifs.forEach(n => {
      const date = new Date(n.created_at);
      date.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) {
        groups.Today.push(n);
      } else if (date.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(n);
      } else {
        groups.Older.push(n);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  };

  const groupedNotifications = groupNotifications(notifications);

  const renderNotification = ({ item }) => {
    const isUnread = !item.is_read;
    const typeInfo = {
      new_general_announcement: { icon: 'bullhorn', color: '#007AFF', label: 'Announcement' },
      new_class_announcement: { icon: 'bullhorn', color: '#34C759', label: 'Class Update' },
      new_homework: { icon: 'clipboard-list', color: '#FF9500', label: 'Homework' },
      new_assignment: { icon: 'file-signature', color: '#AF52DE', label: 'Assignment' },
      new_poll: { icon: 'poll', color: '#5856D6', label: 'Poll' },
      new_ptm_booking: { icon: 'handshake', color: '#FF2D55', label: 'PTM' },
      ptm_cancellation: { icon: 'handshake-slash', color: '#FF3B30', label: 'PTM Cancel' },
      school_join_request: { icon: 'school', color: '#007AFF', label: 'Join Request' },
      parent_child_request: { icon: 'user-friends', color: '#5AC8FA', label: 'Association' },
      added_to_club: { icon: 'users', color: '#AF52DE', label: 'Club' },
    };

    const info = typeInfo[item.type] || { icon: 'bell', color: theme.colors.primary, label: 'Notification' };

    const isPressable = [
      'new_general_announcement',
      'new_class_announcement',
      'new_homework',
      'new_assignment',
      'new_poll',
      'new_ptm_booking',
      'ptm_cancellation',
      'added_to_club',
      'club_join_request',
      'club_join_accepted'
    ].includes(item.type);

    return (
      <View 
        key={item.id}
        style={[
          styles.card, 
          { 
            backgroundColor: theme.colors.cardBackground, 
            shadowColor: theme.colors.text,
            borderLeftColor: isUnread ? info.color : 'transparent',
            borderLeftWidth: 4
          }
        ]}
      >
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => handleNotificationPress(item)}
          disabled={!isPressable}
        >
          <View style={[styles.iconContainer, { backgroundColor: isUnread ? `${info.color}20` : theme.colors.inputBackground }]}>
            <FontAwesome5 name={info.icon} size={20} color={isUnread ? info.color : theme.colors.placeholder} />
          </View>
          <View style={styles.contentContainer}>
            <View style={styles.typeHeader}>
              <Text style={[styles.typeLabel, { color: isUnread ? info.color : theme.colors.placeholder }]}>{info.label}</Text>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: info.color }]} />}
            </View>
            <Text style={[styles.title, { color: theme.colors.text }, isUnread && { fontWeight: 'bold' }]}>{item.title}</Text>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.message}</Text>
            <Text style={[styles.date, { color: theme.colors.placeholder }]}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>

            {/* Specialized Actions for Requests */}
            {item.type === 'school_join_request' && isUnread && (
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleJoinResponse(item, true)}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.colors.error }]}
                  onPress={() => handleJoinResponse(item, false)}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}

            {item.type === 'parent_child_request' && isUnread && (
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleParentChildResponse(item, true)}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.colors.error }]}
                  onPress={() => handleParentChildResponse(item, false)}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.actionsContainer}>
          {isUnread && (
            <TouchableOpacity onPress={() => handleMarkAsRead(item.id)} style={styles.actionButton}>
              <FontAwesome5 name="check-circle" size={18} color={theme.colors.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
            <FontAwesome5 name="trash-alt" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.header, { color: theme.colors.text }]}>Notifications</Text>
          <Text style={[styles.description, { color: theme.colors.placeholder }]}>
            {notifications.filter(n => !n.is_read).length} unread updates
          </Text>
        </View>
        {!loading && notifications.length > 0 && (
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerActionButton}>
              <FontAwesome5 name="check-double" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearAll} style={styles.headerActionButton}>
              <FontAwesome5 name="broom" size={16} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <ScrollView>
          {[1, 2, 3, 4, 5].map(i => <NotificationCardSkeleton key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={groupedNotifications}
          keyExtractor={(item) => item[0]}
          renderItem={({ item }) => (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{item[0]}</Text>
                <View style={[styles.sectionLine, { backgroundColor: theme.colors.cardBorder }]} />
              </View>
              {item[1].map(n => renderNotification({ item: n }))}
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="bell-slash" size={60} color={theme.colors.placeholder} />
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>All caught up!</Text>
              <Text style={[styles.emptySubText, { color: theme.colors.placeholder }]}>No new notifications for you right now.</Text>
            </View>
          }
        />
      )}

      <Modal
        transparent={true}
        animationType="fade"
        visible={isDetailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.text }]}>
            {modalLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : selectedItemDetail ? (
              <>
                <View style={styles.modalTitleContainer}>
                  <FontAwesome5 name={
                    selectedItemDetail.type.includes('announcement') ? 'bullhorn' : 'clipboard-list'
                  } size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.modalHeader, { color: theme.colors.text }]}>{selectedItemDetail.title || selectedItemDetail.subject}</Text>
                </View>

                {selectedItemDetail.due_date && (
                  <View style={styles.modalDateContainer}>
                    <FontAwesome5 name="calendar-check" size={16} color={theme.colors.error} style={{ marginRight: 8 }} />
                    <Text style={[styles.modalDate, { color: theme.colors.error }]}>Due: {new Date(selectedItemDetail.due_date).toLocaleDateString()}</Text>
                  </View>
                )}

                {selectedItemDetail.created_at && (
                  <View style={styles.modalDateContainer}>
                    <FontAwesome5 name="clock" size={16} color={theme.colors.placeholder} style={{ marginRight: 8 }} />
                    <Text style={[styles.modalDate, { color: theme.colors.placeholder }]}>Posted: {new Date(selectedItemDetail.created_at).toLocaleString()}</Text>
                  </View>
                )}

                <View style={[styles.hr, { borderBottomColor: theme.colors.cardBorder }]} />
                <ScrollView style={styles.modalMessageScrollView}>
                  <Text style={[styles.modalMessage, { color: theme.colors.text }]}>{selectedItemDetail.message || selectedItemDetail.description}</Text>
                </ScrollView>

                {selectedItemDetail.file_url && (
                  <View>
                    <View style={[styles.hr, { borderBottomColor: theme.colors.cardBorder }]} />
                    <TouchableOpacity style={[styles.fileLinkButton, { backgroundColor: theme.colors.success }]} onPress={() => Linking.openURL(selectedItemDetail.file_url)}>
                      <FontAwesome5 name="link" size={16} color={theme.colors.buttonPrimaryText} style={{ marginRight: 8 }} />
                      <Text style={[styles.modalCloseButtonText, { color: theme.colors.buttonPrimaryText }]}>View Attached File</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={[styles.modalCloseButtonText, { color: theme.colors.buttonPrimaryText }]}>Close</Text>
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
  container: { flex: 1, padding: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  header: { fontSize: 28, fontWeight: 'bold' },
  description: { fontSize: 14, marginTop: 2 },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: { flex: 1 },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: { fontSize: 16, marginBottom: 4 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 6 },
  date: { fontSize: 12, fontWeight: '500' },
  buttonsRow: { flexDirection: 'row', marginTop: 12 },
  button: { 
    paddingVertical: 8, 
    paddingHorizontal: 16, 
    borderRadius: 10, 
    marginRight: 10 
  },
  buttonText: { fontWeight: '700', fontSize: 13 },
  actionsContainer: { 
    width: 50, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.05)',
    paddingVertical: 10,
  },
  actionButton: { 
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  hr: {
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
    maxHeight: '80%',
    borderRadius: 15,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  },
  modalMessageScrollView: {
    maxHeight: '70%',
  },
  modalMessage: {
    fontSize: 16,
    lineHeight: 24,
  },
  fileLinkButton: {
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalCloseButton: {
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
