import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import Modal from 'react-native-modal';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { FAB, Portal, Provider } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faClipboardList,
  faBook,
  faPen,
  faTrash,
  faUser,
  faChalkboardTeacher,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import HomeworkCard from '../components/HomeworkCard';
import AssignmentCard from '../components/AssignmentCard';
import ManageCompletionsModal from '../components/ManageCompletionsModal';
import ResourceDetailModal from '../components/ResourceDetailModal';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

// Import services
import { fetchHomework as fetchHomeworkService, updateHomework as updateHomeworkService, deleteHomework as deleteHomeworkService } from '../services/homeworkService';
import { fetchAssignments as fetchAssignmentsService, updateAssignment as updateAssignmentService, deleteAssignment as deleteAssignmentService } from '../services/assignmentService';
import { getCurrentUser } from '../services/authService';
import { getUserProfile, fetchParentChildren } from '../services/userService';

const Tab = createMaterialTopTabNavigator();

/* =========================
   HOMEWORK TAB
========================= */
const HomeworkList = React.memo(() => {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [currentTrackItem, setCurrentTrackItem] = useState(null);
  const [resourceModalVisible, setResourceModalVisible] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollViewRef = React.useRef(null);

  const handleOnScroll = (event) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const handleScrollTo = (p) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo(p);
    }
  };

  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const fetchUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user) setCurrentUserId(user.id);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, []);

  const fetchHomework = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const profile = await getUserProfile(user.id);
      const userRole = profile?.role;
      
      let childIds = [];
      if (userRole === 'parent') {
        childIds = await fetchParentChildren(user.id);
      }

      const data = await fetchHomeworkService({
        userId: user.id,
        userRole,
        schoolId: profile?.school_id,
        childIds
      });

      setHomework(data || []);
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    if (isFocused) fetchHomework();
    fetchUser();
  }, [isFocused, fetchHomework, fetchUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomework();
  }, [fetchHomework]);

  const handleHomeworkPress = useCallback((item) => {
    setSelectedHomework(item);
    setModalVisible(true);
    setIsEditing(false);
  }, []);

  const handleHomeworkTrackPress = useCallback((item) => {
    setCurrentTrackItem(item);
    setManageModalVisible(true);
  }, []);

  const formatDate = useCallback((date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }), []);

  const handleUpdate = useCallback(async () => {
    try {
      await updateHomeworkService(selectedHomework.id, {
        subject: selectedHomework.subject,
        description: selectedHomework.description,
        due_date: selectedHomework.due_date,
      });

      showToast('Homework updated successfully', 'success');
      setIsEditing(false);
      fetchHomework();
    } catch (error) {
      console.error('Error updating homework:', error);
      showToast('Failed to update homework', 'error');
    }
  }, [selectedHomework, fetchHomework, showToast]);

  const handleDelete = useCallback(async () => {
    Alert.alert('Delete Homework', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHomeworkService(selectedHomework.id);
            showToast('Homework deleted', 'success');
            setModalVisible(false);
            fetchHomework();
          } catch (error) {
            console.error('Error deleting homework:', error);
            showToast('Failed to delete homework', 'error');
          }
        },
      },
    ]);
  }, [selectedHomework, fetchHomework, showToast]);

  const renderItem = useCallback(({ item }) =>
    loading ? <CardSkeleton /> : (
      <HomeworkCard
        homework={item}
        userId={currentUserId}
        onPress={handleHomeworkPress}
        onTrackPress={handleHomeworkTrackPress}
      />
    ), [loading, currentUserId, handleHomeworkPress, handleHomeworkTrackPress]);

  return (
    <View style={[styles.listContainer, { backgroundColor: theme.colors.background }]}>
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        onSwipeComplete={() => setModalVisible(false)}
        swipeDirection={['down']}
        scrollTo={handleScrollTo}
        scrollOffset={scrollOffset}
        scrollOffsetMax={400}
        propagateSwipe={true}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.4}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.swipeIndicator} />
          {selectedHomework && (
            <>
              <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                  <FontAwesomeIcon icon={faClipboardList} size={20} color={theme.colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Homework Details</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                ref={scrollViewRef}
                onScroll={handleOnScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingTop: 24,
                  paddingBottom: Math.max(insets.bottom, 24)
                }}
              >
                <View style={styles.messageWrapper}>
                  {isEditing ? (
                    <TextInput
                      style={[styles.modalTextInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                      value={selectedHomework.description}
                      multiline
                      onChangeText={(t) => setSelectedHomework({ ...selectedHomework, description: t })}
                    />
                  ) : (
                    <Text style={[styles.descriptionText, { color: theme.colors.text }]}>
                      {selectedHomework.description}
                    </Text>
                  )}
                </View>

                <View style={[styles.metaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                  <View style={styles.metaRow}>
                    <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                      <FontAwesomeIcon icon={faBook} size={12} color={theme.colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>SUBJECT</Text>
                      {isEditing ? (
                        <TextInput
                          style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14, padding: 0 }}
                          value={selectedHomework.subject}
                          onChangeText={(t) => setSelectedHomework({ ...selectedHomework, subject: t })}
                        />
                      ) : (
                        <Text style={[styles.metaValue, { color: theme.colors.text }]}>{selectedHomework.subject}</Text>
                      )}
                    </View>
                  </View>

                  <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />

                  <View style={styles.metaRow}>
                    <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                      <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>DUE DATE</Text>
                      <Text style={[styles.metaValue, { color: theme.colors.text }]}>{formatDate(selectedHomework.due_date)}</Text>
                    </View>
                  </View>

                  {selectedHomework.created_by_user && (
                    <>
                      <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />
                      <View style={styles.metaRow}>
                        <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                          <FontAwesomeIcon icon={faUser} size={12} color={theme.colors.primary} />
                        </View>
                        <View>
                          <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>ASSIGNED BY</Text>
                          <Text style={[styles.metaValue, { color: theme.colors.text }]}>{selectedHomework.created_by_user.full_name}</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {selectedHomework.lesson_plans && (
                    <>
                      <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />
                      <View style={styles.metaRow}>
                        <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                          <FontAwesomeIcon icon={faChalkboardTeacher} size={12} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>RELATED LESSON</Text>
                          <Text style={[styles.metaValue, { color: theme.colors.text }]}>{selectedHomework.lesson_plans.title}</Text>
                          {selectedHomework.lesson_plans.objectives?.length > 0 && (
                            <Text style={{ fontSize: 11, color: theme.colors.placeholder, marginTop: 4 }}>
                              Focus: {selectedHomework.lesson_plans.objectives[0]}
                            </Text>
                          )}
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {selectedHomework.resources?.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={[styles.cardSectionLabel, { marginBottom: 12, marginLeft: 4 }]}>ATTACHED MATERIALS ({selectedHomework.resources.length})</Text>
                    {selectedHomework.resources.map((res) => (
                      <TouchableOpacity
                        key={res.id}
                        style={[styles.resourceItem, { backgroundColor: '#10b981' + '10', borderColor: '#10b981' + '30', borderWidth: 1 }]}
                        onPress={() => {
                          setSelectedResource(res);
                          setResourceModalVisible(true);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>{res.title}</Text>
                          <Text style={{ fontSize: 10, color: theme.colors.placeholder, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>Library Resource</Text>
                        </View>
                        <View style={[styles.resourceAction, { backgroundColor: '#10b981' }]}>
                          <FontAwesomeIcon icon={faExternalLinkAlt} size={10} color="#fff" />
                          <Text style={styles.resourceActionText}>OPEN</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {currentUserId === selectedHomework.created_by && (
                  <View style={[styles.modalButtonContainer, { marginTop: 24 }]}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => (isEditing ? handleUpdate() : setIsEditing(true))}
                    >
                      <FontAwesomeIcon icon={faPen} size={16} color="#fff" />
                      <Text style={styles.modalButtonText}>
                        {isEditing ? 'Save Changes' : 'Edit Homework'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: theme.colors.error, marginLeft: 12 }]}
                      onPress={handleDelete}
                      disabled={isEditing}
                    >
                      <FontAwesomeIcon icon={faTrash} size={16} color="#fff" />
                      <Text style={styles.modalButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      <FlatList
        data={loading ? [1, 2, 3] : homework}
        keyExtractor={(item, index) => loading ? index.toString() : item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        renderItem={renderItem}
        ListEmptyComponent={!loading && (
          <View style={styles.emptyContainer}>
            <FontAwesomeIcon icon={faBook} size={40} color={theme.colors.placeholder} style={{ marginBottom: 10, opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No homework assigned yet.</Text>
          </View>
        )}
      />

      <ManageCompletionsModal
        visible={manageModalVisible}
        onClose={() => setManageModalVisible(false)}
        item={currentTrackItem}
        type="homework"
      />

      <ResourceDetailModal
        visible={resourceModalVisible}
        onClose={() => {
          setResourceModalVisible(false);
          setSelectedResource(null);
        }}
        resource={selectedResource}
      />
    </View>
  );
});

/* =========================
   ASSIGNMENTS TAB
========================= */
const AssignmentsList = React.memo(() => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [currentTrackItem, setCurrentTrackItem] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [resourceModalVisible, setResourceModalVisible] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollViewRef = React.useRef(null);

  const handleOnScroll = (event) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const handleScrollTo = (p) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo(p);
    }
  };

  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const fetchUser = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (user) setCurrentUserId(user.id);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const profile = await getUserProfile(user.id);
      const userRole = profile?.role;
      
      let childIds = [];
      if (userRole === 'parent') {
        childIds = await fetchParentChildren(user.id);
      }

      const data = await fetchAssignmentsService({
        userId: user.id,
        userRole,
        schoolId: profile?.school_id,
        childIds
      });
      
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    if (isFocused) {
        fetchAssignments();
        fetchUser();
    }
  }, [isFocused, fetchAssignments, fetchUser]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAssignments();
  }, [fetchAssignments]);

  const handleAssignmentPress = useCallback((item) => {
    setSelectedAssignment(item);
    setModalVisible(true);
    setIsEditing(false);
  }, []);

  const handleAssignmentTrackPress = useCallback((item) => {
    setCurrentTrackItem(item);
    setManageModalVisible(true);
  }, []);

  const formatDate = useCallback((date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }), []);

  const handleUpdate = useCallback(async () => {
    try {
      await updateAssignmentService(selectedAssignment.id, {
        title: selectedAssignment.title,
        description: selectedAssignment.description,
        due_date: selectedAssignment.due_date,
      });

      showToast('Assignment updated successfully', 'success');
      setIsEditing(false);
      fetchAssignments();
    } catch (error) {
      console.error('Error updating assignment:', error);
      showToast('Failed to update assignment', 'error');
    }
  }, [selectedAssignment, fetchAssignments, showToast]);

  const handleDelete = useCallback(async () => {
    Alert.alert('Delete Assignment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAssignmentService(selectedAssignment.id);
            showToast('Assignment deleted', 'success');
            setModalVisible(false);
            fetchAssignments();
          } catch (error) {
            console.error('Error deleting assignment:', error);
            showToast('Failed to delete assignment', 'error');
          }
        },
      },
    ]);
  }, [selectedAssignment, fetchAssignments, showToast]);

  const renderItem = useCallback(({ item }) =>
    loading ? <CardSkeleton /> : (
      <AssignmentCard
        assignment={item}
        userId={currentUserId}
        onPress={handleAssignmentPress}
        onTrackPress={handleAssignmentTrackPress}
      />
    ), [loading, currentUserId, handleAssignmentPress, handleAssignmentTrackPress]);

  return (
    <View style={[styles.listContainer, { backgroundColor: theme.colors.background }]}>
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        onSwipeComplete={() => setModalVisible(false)}
        swipeDirection={['down']}
        scrollTo={handleScrollTo}
        scrollOffset={scrollOffset}
        scrollOffsetMax={400}
        propagateSwipe={true}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.4}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.swipeIndicator} />
          {selectedAssignment && (
            <>
              <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                  <FontAwesomeIcon icon={faClipboardList} size={20} color={theme.colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Assignment Details</Text>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                ref={scrollViewRef}
                onScroll={handleOnScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingTop: 24,
                  paddingBottom: Math.max(insets.bottom, 24)
                }}
              >
                <View style={styles.messageWrapper}>
                  {isEditing ? (
                    <TextInput
                      style={[styles.modalTextInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                      value={selectedAssignment.description}
                      multiline
                      onChangeText={(t) => setSelectedAssignment({ ...selectedAssignment, description: t })}
                    />
                  ) : (
                    <Text style={[styles.descriptionText, { color: theme.colors.text }]}>
                      {selectedAssignment.description}
                    </Text>
                  )}
                </View>

                <View style={[styles.metaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                  <View style={styles.metaRow}>
                    <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                      <FontAwesomeIcon icon={faBook} size={12} color={theme.colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>TITLE</Text>
                      {isEditing ? (
                        <TextInput
                          style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14, padding: 0 }}
                          value={selectedAssignment.title}
                          onChangeText={(t) => setSelectedAssignment({ ...selectedAssignment, title: t })}
                        />
                      ) : (
                        <Text style={[styles.metaValue, { color: theme.colors.text }]}>{selectedAssignment.title}</Text>
                      )}
                    </View>
                  </View>

                  <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />

                  <View style={styles.metaRow}>
                    <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                      <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>DUE DATE</Text>
                      <Text style={[styles.metaValue, { color: theme.colors.text }]}>{formatDate(selectedAssignment.due_date)}</Text>
                    </View>
                  </View>

                  {selectedAssignment.assigned_by_user && (
                    <>
                      <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />
                      <View style={styles.metaRow}>
                        <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                          <FontAwesomeIcon icon={faUser} size={12} color={theme.colors.primary} />
                        </View>
                        <View>
                          <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>ASSIGNED BY</Text>
                          <Text style={[styles.metaValue, { color: theme.colors.text }]}>{selectedAssignment.assigned_by_user.full_name}</Text>
                        </View>
                      </View>
                    </>
                  )}

                  {selectedAssignment.lesson_plans && (
                    <>
                      <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />
                      <View style={styles.metaRow}>
                        <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                          <FontAwesomeIcon icon={faChalkboardTeacher} size={12} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>RELATED LESSON</Text>
                          <Text style={[styles.metaValue, { color: theme.colors.text }]}>{selectedAssignment.lesson_plans.title}</Text>
                          {selectedAssignment.lesson_plans.objectives?.length > 0 && (
                            <Text style={{ fontSize: 11, color: theme.colors.placeholder, marginTop: 4 }}>
                              Focus: {selectedAssignment.lesson_plans.objectives[0]}
                            </Text>
                          )}
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {selectedAssignment.resources?.length > 0 && (
                  <View style={{ marginTop: 24 }}>
                    <Text style={[styles.cardSectionLabel, { marginBottom: 12, marginLeft: 4 }]}>ATTACHED MATERIALS ({selectedAssignment.resources.length})</Text>
                    {selectedAssignment.resources.map((res) => (
                      <TouchableOpacity
                        key={res.id}
                        style={[styles.resourceItem, { backgroundColor: '#10b981' + '10', borderColor: '#10b981' + '30', borderWidth: 1 }]}
                        onPress={() => {
                          setSelectedResource(res);
                          setResourceModalVisible(true);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>{res.title}</Text>
                          <Text style={{ fontSize: 10, color: theme.colors.placeholder, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>Library Resource</Text>
                        </View>
                        <View style={[styles.resourceAction, { backgroundColor: '#10b981' }]}>
                          <FontAwesomeIcon icon={faExternalLinkAlt} size={10} color="#fff" />
                          <Text style={styles.resourceActionText}>OPEN</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {currentUserId === selectedAssignment.assigned_by && (
                  <View style={[styles.modalButtonContainer, { marginTop: 24 }]}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => (isEditing ? handleUpdate() : setIsEditing(true))}
                    >
                      <FontAwesomeIcon icon={faPen} size={16} color="#fff" />
                      <Text style={styles.modalButtonText}>
                        {isEditing ? 'Save Changes' : 'Edit Assignment'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: theme.colors.error, marginLeft: 12 }]}
                      onPress={handleDelete}
                      disabled={isEditing}
                    >
                      <FontAwesomeIcon icon={faTrash} size={16} color="#fff" />
                      <Text style={styles.modalButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      <FlatList
        data={loading ? [1, 2, 3] : assignments}
        keyExtractor={(item, index) => loading ? index.toString() : item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={5}
        renderItem={renderItem}
        ListEmptyComponent={!loading && (
          <View style={styles.emptyContainer}>
            <FontAwesomeIcon icon={faClipboardList} size={40} color={theme.colors.placeholder} style={{ marginBottom: 10, opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No assignments found.</Text>
          </View>
        )}
      />

      <ManageCompletionsModal
        visible={manageModalVisible}
        onClose={() => setManageModalVisible(false)}
        item={currentTrackItem}
        type="assignment"
      />

      <ResourceDetailModal
        visible={resourceModalVisible}
        onClose={() => {
          setResourceModalVisible(false);
          setSelectedResource(null);
        }}
        resource={selectedResource}
      />
    </View>
  );
});

/* =========================
   MAIN SCREEN
========================= */
const HomeworkScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [userRole, setUserRole] = useState(null);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    const loadRole = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;

        const profile = await getUserProfile(user.id);
        setUserRole(profile?.role);
      } catch (error) {
        console.error('Error loading role:', error);
      }
    };
    loadRole();
  }, []);

  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

  return (
    <Provider>
      <View style={[styles.screenWrapper, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
            colors={['#4f46e5', '#4338ca']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroContainer}
        >
            <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>Tasks & Assignments</Text>
                <Text style={styles.heroDescription}>
                    View all homework and assignments assigned to you.
                </Text>
            </View>
        </LinearGradient>

        <Tab.Navigator
          screenOptions={{
            tabBarLabelStyle: { textTransform: 'none', color: theme.colors.text },
            tabBarStyle: { backgroundColor: theme.colors.surface },
            tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
          }}
        >
          <Tab.Screen name="HomeworkTab" component={HomeworkList} options={{ title: 'Homework' }} />
          <Tab.Screen name="AssignmentsTab" component={AssignmentsList} options={{ title: 'Assignments' }} />
        </Tab.Navigator>
      </View>

      {isTeacherOrAdmin && (
        <Portal>
          <FAB.Group
            open={fabOpen}
            icon={fabOpen ? 'close' : 'plus'}
            fabStyle={{ backgroundColor: theme.colors.primary }}
            actions={[
              { icon: 'notebook-plus', label: 'Create Homework', onPress: () => navigation.navigate('CreateHomework') },
              { icon: 'file-plus', label: 'Create Assignment', onPress: () => navigation.navigate('CreateAssignment') },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
          />
        </Portal>
      )}
    </Provider>
  );
}

export default React.memo(HomeworkScreen);

/* =========================
   STYLES
========================= */
const styles = StyleSheet.create({
  screenWrapper: { flex: 1 },
  listContainer: { flex: 1, padding: 16 },

  heroContainer: {
    padding: 20,
    marginBottom: 0,
    elevation: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  heroContent: {
      marginBottom: 10,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  messageWrapper: {
    marginBottom: 32,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '600',
  },
  metaCard: {
    borderRadius: 24,
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  metaDivider: {
    height: 1,
    marginVertical: 16,
    marginLeft: 48,
  },
  
  descriptionContainer: { paddingVertical: 20 },

  detailsCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  resourceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  resourceActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
