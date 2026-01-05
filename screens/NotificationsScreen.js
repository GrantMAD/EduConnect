import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, Linking, RefreshControl } from 'react-native';
import NotificationCardSkeleton, { SkeletonPiece } from '../components/skeletons/NotificationCardSkeleton';
import { FontAwesome5 } from '@expo/vector-icons';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../services/authService';
import {
  fetchNotifications as fetchNotificationsService,
  markAsRead,
  markAllAsRead as markAllAsReadService,
  deleteNotification as deleteNotificationService,
  clearAllNotifications,
  sendNotification
} from '../services/notificationService';
import { handleJoinRequest } from '../services/requestService';
import { createParentChildRelationship, updateParentChildRequest } from '../services/userService';
import { fetchAnnouncementById } from '../services/announcementService';
import { fetchHomeworkById } from '../services/homeworkService';
import { fetchAssignmentById } from '../services/assignmentService';

const NotificationsScreen = ({ route, navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const { showToast } = useToast();
  const { theme } = useTheme();

  const fetchNotifications = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const data = await fetchNotificationsService(user.id);
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      showToast('Unable to fetch notifications.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing, showToast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback(async (notification) => {
    const { data, type } = notification;
    let itemId;

    switch (type) {
      case 'new_general_announcement':
      case 'new_class_announcement':
        itemId = data?.announcement_id;
        break;
      case 'new_homework':
        itemId = data?.homework_id;
        break;
      case 'new_assignment':
        itemId = data?.assignment_id;
        break;
      case 'new_poll':
        await markAsRead(notification.id);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        navigation.navigate('Polls');
        return;
      case 'new_ptm_booking':
      case 'ptm_cancellation':
        await markAsRead(notification.id);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        navigation.navigate('Meetings');
        return;
      case 'added_to_club':
      case 'club_join_accepted':
      case 'club_join_request':
        await markAsRead(notification.id);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        navigation.navigate('ClubList');
        return;
      default:
        return;
    }

    if (!itemId) return;

    await markAsRead(notification.id);

    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
    );

    setModalLoading(true);
    setDetailModalVisible(true);
    setSelectedItemDetail(null);

    try {
      let itemData;
      if (type.includes('announcement')) {
        itemData = await fetchAnnouncementById(itemId);
      } else if (type === 'new_homework') {
        itemData = await fetchHomeworkById(itemId);
      } else if (type === 'new_assignment') {
        itemData = await fetchAssignmentById(itemId);
      }

      if (!itemData) throw new Error('Item not found');

      setSelectedItemDetail({ ...itemData, type });
    } catch (err) {
      console.error(`Error fetching ${type} details:`, err);
      showToast(`Could not fetch item details.`, 'error');
      setDetailModalVisible(false);
    } finally {
      setModalLoading(false);
    }
  }, [navigation, showToast]);


  const handleClearAll = useCallback(async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all of your notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await getCurrentUser();
              if (!user) throw new Error("User not found");

              await clearAllNotifications(user.id);

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
  }, [showToast]);

  const handleJoinResponse = useCallback(async (notification, accept) => {
    try {
      await handleJoinRequest(notification.id, accept);

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
  }, [showToast]);

  const handleDelete = useCallback(async (notificationId) => {
    try {
      await deleteNotificationService(notificationId);

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      showToast('Notification deleted.', 'success');
    } catch (err) {
      console.error('Error deleting notification:', err);
      showToast('Could not delete notification.', 'error');
    }
  }, [showToast]);

  const handleParentChildResponse = useCallback(async (notification, accept) => {
    try {
      if (accept) {
        await createParentChildRelationship(notification.related_user_id, notification.user_id);
        await updateParentChildRequest(notification.related_user_id, notification.user_id, 'accepted');

        await sendNotification({
          user_id: notification.related_user_id,
          type: 'parent_child_accepted',
          title: 'Association Request Accepted',
          message: `Your association request with ${notification.message.split(' wants to associate with you.')[0]} has been accepted.`,
          is_read: false,
        });
        showToast('Association request accepted.', 'success');
      } else {
        await updateParentChildRequest(notification.related_user_id, notification.user_id, 'rejected');

        await sendNotification({
          user_id: notification.related_user_id,
          type: 'parent_child_rejected',
          title: 'Association Request Rejected',
          message: `Your association request with ${notification.message.split(' wants to associate with you.')[0]} has been rejected.`,
          is_read: false,
        });
        showToast('Association request rejected.', 'success');
      }

      await markAsRead(notification.id);
      setNotifications(prev => prev.filter(n => n.id !== notification.id));

    } catch (err) {
      console.error('Error handling parent-child response:', err);
      showToast('Could not process the request: ' + err.message, 'error');
    }
  }, [showToast]);

  const handleMarkAsRead = useCallback(async (notificationId) => {
    try {
      await markAsRead(notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      showToast('Notification marked as read.', 'success');
    } catch (err) {
      console.error('Error marking as read:', err);
      showToast('Could not mark as read.', 'error');
    }
  }, [showToast]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      await markAllAsReadService(user.id);

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      console.error('Error marking all as read:', err);
      showToast('Could not mark all as read.', 'error');
    }
  }, [showToast]);

  const sections = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    notifications.forEach(n => {
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

    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([title, data]) => ({ title, data }));
  }, [notifications]);

  const renderNotification = useCallback(({ item }) => {
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
            borderColor: theme.colors.cardBorder,
            borderWidth: 1,
            borderLeftColor: isUnread ? info.color : theme.colors.cardBorder,
            borderLeftWidth: 4
          }
        ]}
      >
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => handleNotificationPress(item)}
          disabled={!isPressable}
        >
          <View style={[styles.iconContainer, { backgroundColor: isUnread ? `${info.color}15` : theme.colors.background }]}>
            <FontAwesome5 name={info.icon} size={18} color={isUnread ? info.color : theme.colors.placeholder} />
          </View>
          <View style={styles.contentContainer}>
            <View style={styles.typeHeader}>
              <Text style={[styles.typeLabel, { color: isUnread ? info.color : theme.colors.placeholder }]}>{info.label}</Text>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: info.color }]} />}
            </View>
            <Text style={[styles.title, { color: theme.colors.text }, isUnread && { fontWeight: 'bold' }]}>{item.title}</Text>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={2}>{item.message}</Text>
            <Text style={[styles.date, { color: theme.colors.placeholder }]}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>

            {(item.type === 'school_join_request' || item.type === 'parent_child_request') && isUnread && (
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.colors.primary }]}
                  onPress={() => item.type === 'school_join_request' ? handleJoinResponse(item, true) : handleParentChildResponse(item, true)}
                >
                  <Text style={[styles.buttonText, { color: '#fff' }]}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.colors.error }]}
                  onPress={() => item.type === 'school_join_request' ? handleJoinResponse(item, false) : handleParentChildResponse(item, false)}
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
              <FontAwesome5 name="check-circle" size={16} color={theme.colors.success} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
            <FontAwesome5 name="trash-alt" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [theme, handleNotificationPress, handleJoinResponse, handleParentChildResponse, handleMarkAsRead, handleDelete]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#4f46e5', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>Notifications</Text>
            <Text style={styles.heroDescription}>
              {notifications.filter(n => !n.is_read).length} unread updates
            </Text>
          </View>
          {!loading && notifications.length > 0 && (
            <View style={styles.heroActions}>
              <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.heroActionBtn}>
                <FontAwesome5 name="check-double" size={14} color="#4f46e5" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClearAll} style={styles.heroActionBtn}>
                <FontAwesome5 name="broom" size={14} color="#e11d48" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <ScrollView style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5].map(i => <NotificationCardSkeleton key={i} />)}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.placeholder }]}>{title}</Text>
              <View style={[styles.sectionLine, { backgroundColor: theme.colors.cardBorder }]} />
            </View>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          stickySectionHeadersEnabled={false}
          removeClippedSubviews={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="bell-slash" size={60} color={theme.colors.placeholder} />
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>All caught up!</Text>
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
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
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
                      <FontAwesome5 name="link" size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={[styles.modalCloseButtonText, { color: '#fff' }]}>View Attached File</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={[styles.modalCloseButtonText, { color: '#fff' }]}>Close</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default React.memo(NotificationsScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: {
    padding: 20,
    marginBottom: 0,
    elevation: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroDescription: {
    color: '#e0e7ff',
    fontSize: 14,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginRight: 10,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 0,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
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
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: { fontSize: 15, marginBottom: 4 },
  message: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  date: { fontSize: 11, fontWeight: '600' },
  buttonsRow: { flexDirection: 'row', marginTop: 12 },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 10
  },
  buttonText: { fontWeight: '700', fontSize: 12 },
  actionsContainer: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalDate: {
    fontSize: 12,
  },
  modalMessageScrollView: {
    maxHeight: '70%',
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
  },
  fileLinkButton: {
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalCloseButton: {
    borderRadius: 12,
    padding: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
});