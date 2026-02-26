import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, ScrollView, Linking, RefreshControl } from 'react-native';
import NotificationCardSkeleton, { SkeletonPiece } from '../components/skeletons/NotificationCardSkeleton';
import NotificationGroup from '../components/NotificationGroup';
import NotificationItem from '../components/NotificationItem';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../lib/supabase';
import AssignGradeModal from '../components/AssignGradeModal';

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

  // Grade assignment state
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [pendingStudent, setPendingStudent] = useState(null);
  const [existingShadow, setExistingShadow] = useState(null);
  const [isProcessingGrade, setIsProcessingGrade] = useState(false);

  const { showToast } = useToast();
  const { theme } = useTheme();
  const { profile } = useAuth();

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
      case 'parent_child_request':
      case 'parent_welcome':
        await markAsRead(notification.id);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        navigation.navigate('MyChildren');
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
      case 'exam_schedule':
        await markAsRead(notification.id);

        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );

        if (profile?.role === 'parent') {
          navigation.navigate('MyChildren', { studentId: notification.related_user_id, activeTab: 'exams' });
        } else {
          navigation.navigate('MyExams');
        }
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
      if (accept) {
        const requesterId = notification.related_user_id || notification.created_by;

        // Check if this is a student. If so, we need to assign a grade.
        const { data: requester } = await supabase
          .from('users')
          .select('role, full_name, school_id, requested_school_id')
          .eq('id', requesterId)
          .single();

        if (requester?.role === 'student') {
          const schoolIdToUse = requester.school_id || requester.requested_school_id || profile?.school_id;

          setPendingStudent({
            id: requesterId,
            name: requester.full_name,
            notificationId: notification.id,
            schoolId: schoolIdToUse
          });

          // Check for shadow profile
          const { data: shadow } = await supabase
            .from('users')
            .select('id, full_name, grade')
            .eq('school_id', schoolIdToUse)
            .eq('is_managed', true)
            .ilike('full_name', requester.full_name)
            .maybeSingle();

          setExistingShadow(shadow);
          setGradeModalVisible(true);
          return;
        }

        if (requester?.role === 'parent') {
          await sendNotification({
            user_id: requesterId,
            type: 'parent_welcome',
            title: 'Welcome to the School!',
            message: 'You have been accepted. Please link to your child to start tracking their progress.',
            is_read: false
          });
        }
      }

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
  }, [showToast, profile?.school_id]);

  const handleAssignGradeConfirm = async (grade, isRestricted, shadowId) => {
    if (isRestricted || !pendingStudent) return;

    setIsProcessingGrade(true);
    try {
      // 1. Assign grade
      const { error: updateError } = await supabase
        .from('users')
        .update({ grade: grade })
        .eq('id', pendingStudent.id);

      if (updateError) throw updateError;

      // 2. Merge accounts if needed
      if (shadowId) {
        const { error: mergeError } = await supabase.rpc('merge_student_accounts', {
          p_shadow_id: shadowId,
          p_new_auth_id: pendingStudent.id
        });
        if (mergeError) throw mergeError;
      }

      // 3. Complete join
      await handleJoinRequest(pendingStudent.notificationId, true);

      // 4. Update local UI
      setNotifications(prev => prev.filter(n => n.id !== pendingStudent.notificationId));
      showToast('Student accepted and grade assigned.', 'success');

      setGradeModalVisible(false);
      setPendingStudent(null);
      setExistingShadow(null);
    } catch (err) {
      console.error('Error in handleAssignGradeConfirm:', err);
      showToast('Failed to complete enrollment.', 'error');
    } finally {
      setIsProcessingGrade(false);
    }
  };

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

  const handleMarkGroupAsRead = useCallback(async (items) => {
    try {
      const unreadIds = items.filter(i => !i.is_read).map(i => i.id);
      if (unreadIds.length === 0) return;

      await Promise.all(unreadIds.map(id => markAsRead(id)));

      setNotifications(prev =>
        prev.map(n => unreadIds.includes(n.id) ? { ...n, is_read: true } : n)
      );
      showToast('Group marked as read.', 'success');
    } catch (err) {
      console.error('Error marking group as read:', err);
      showToast('Could not mark group as read.', 'error');
    }
  }, [showToast]);

  const handleDeleteGroup = useCallback(async (items) => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete all ${items.length} notifications in this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              const ids = items.map(i => i.id);
              await Promise.all(ids.map(id => deleteNotificationService(id)));

              setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
              showToast('Group deleted.', 'success');
            } catch (err) {
              console.error('Error deleting group:', err);
              showToast('Could not delete group.', 'error');
            }
          }
        }
      ]
    );
  }, [showToast]);

  const sections = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const initialGroups = {
      Today: [],
      Yesterday: [],
      Older: []
    };

    notifications.forEach(n => {
      const date = new Date(n.created_at);
      date.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) {
        initialGroups.Today.push(n);
      } else if (date.getTime() === yesterday.getTime()) {
        initialGroups.Yesterday.push(n);
      } else {
        initialGroups.Older.push(n);
      }
    });

    const groupableTypes = [
      'new_homework', 'new_assignment', 'new_poll',
      'new_class_announcement', 'homework_submission'
    ];

    const getGroupKey = (n) => {
      if (!groupableTypes.includes(n.type)) return null;
      const data = n.data || {};
      const homeworkId = data.homework_id || (n.type === 'new_homework' ? n.related_user_id : null);
      const assignmentId = data.assignment_id || (n.type === 'new_assignment' ? n.related_user_id : null);
      const pollId = data.poll_id || (n.type === 'new_poll' ? n.related_user_id : null);
      const classId = data.class_id || (n.type === 'new_class_announcement' ? n.related_user_id : null);
      return homeworkId || assignmentId || pollId || classId || null;
    };

    return Object.entries(initialGroups)
      .filter(([_, items]) => items.length > 0)
      .map(([title, sectionItems]) => {
        const subGroups = [];
        const processedIndices = new Set();

        for (let i = 0; i < sectionItems.length; i++) {
          if (processedIndices.has(i)) continue;

          const current = sectionItems[i];
          const key = getGroupKey(current);

          if (key) {
            const groupItems = [current];
            for (let j = i + 1; j < sectionItems.length; j++) {
              if (processedIndices.has(j)) continue;
              const other = sectionItems[j];
              if (other.type === current.type && getGroupKey(other) === key) {
                groupItems.push(other);
                processedIndices.add(j);
              }
            }

            if (groupItems.length > 1) {
              subGroups.push({
                isGroup: true,
                type: current.type,
                groupKey: key,
                items: groupItems,
                id: `group-${current.type}-${key}`,
                created_at: current.created_at // Use the latest one for display
              });
            } else {
              subGroups.push({ isGroup: false, ...current });
            }
          } else {
            subGroups.push({ isGroup: false, ...current });
          }
          processedIndices.add(i);
        }

        return { title, data: subGroups };
      });
  }, [notifications]);

  const renderNotification = useCallback(({ item }) => {
    if (item.isGroup) {
      return (
        <NotificationGroup
          group={item}
          theme={theme}
          onMainPress={handleNotificationPress}
          onAcceptPress={handleJoinResponse}
          onDeclinePress={handleParentChildResponse}
          onMarkReadPress={handleMarkAsRead}
          onDeletePress={handleDelete}
          onMarkGroupAsRead={() => handleMarkGroupAsRead(item.items)}
          onDeleteGroup={() => handleDeleteGroup(item.items)}
        />
      );
    }

    return (
      <NotificationItem
        item={item}
        theme={theme}
        onMainPress={handleNotificationPress}
        onAcceptPress={handleJoinResponse}
        onDeclinePress={handleParentChildResponse}
        onMarkReadPress={handleMarkAsRead}
        onDeletePress={handleDelete}
      />
    );
  }, [theme, handleNotificationPress, handleJoinResponse, handleParentChildResponse, handleMarkAsRead, handleDelete, handleMarkGroupAsRead, handleDeleteGroup]);

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

      <AssignGradeModal
        visible={gradeModalVisible}
        onClose={() => {
          setGradeModalVisible(false);
          setPendingStudent(null);
          setExistingShadow(null);
        }}
        onConfirm={handleAssignGradeConfirm}
        requesterName={pendingStudent?.name}
        existingShadow={existingShadow}
        isLoading={isProcessingGrade}
        theme={theme}
      />
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