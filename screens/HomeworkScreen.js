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
} from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

import { supabase } from '../lib/supabase';
import HomeworkCard from '../components/HomeworkCard';
import AssignmentCard from '../components/AssignmentCard';
import ManageCompletionsModal from '../components/ManageCompletionsModal';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

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

  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  }, []);

  const fetchHomework = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('role, school_id')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role;
      let childIds = [];
      if (userRole === 'parent') {
        const { data: relationships } = await supabase
          .from('parent_child_relationships')
          .select('child_id')
          .eq('parent_id', user.id);
        childIds = relationships?.map(r => r.child_id) || [];
      }

      let selectStr = '*, created_by_user:users!created_by(full_name, email)';
      if (userRole === 'student' || userRole === 'parent') {
        selectStr += ', student_completions(id, student_id)';
      }

      let query = supabase.from('homework').select(selectStr);

      if (userRole === 'student') {
        query = query.filter('student_completions.student_id', 'eq', user.id);
      } else if (userRole === 'parent' && childIds.length > 0) {
        query = query.filter('student_completions.student_id', 'in', `(${childIds.join(',')})`);
      }

      if (userRole === 'student' || userRole === 'parent') {
        const targetUsers = userRole === 'student' ? [user.id] : childIds;
        if (targetUsers.length > 0) {
          const { data: members } = await supabase
            .from('class_members')
            .select('class_id')
            .in('user_id', targetUsers);
          const classIds = [...new Set(members?.map(m => m.class_id) || [])];
          if (classIds.length > 0) {
            query = query.in('class_id', classIds);
          } else {
            setHomework([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        } else {
          setHomework([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } else if (profile?.school_id) {
        query = query.eq('school_id', profile.school_id);
      }

      const { data } = await query.order('due_date', { ascending: true }).limit(50);
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

  const formatDate = useCallback((date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }), []);

  const handleUpdate = useCallback(async () => {
    const { error } = await supabase
      .from('homework')
      .update({
        subject: selectedHomework.subject,
        description: selectedHomework.description,
        due_date: selectedHomework.due_date,
      })
      .eq('id', selectedHomework.id);

    if (!error) {
      showToast('Homework updated successfully', 'success');
      setIsEditing(false);
      fetchHomework();
    }
  }, [selectedHomework, fetchHomework, showToast]);

  const handleDelete = useCallback(async () => {
    Alert.alert('Delete Homework', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('homework').delete().eq('id', selectedHomework.id);
          showToast('Homework deleted', 'success');
          setModalVisible(false);
          fetchHomework();
        },
      },
    ]);
  }, [selectedHomework, fetchHomework, showToast]);

  const renderItem = useCallback(({ item }) =>
    loading ? <CardSkeleton /> : (
      <HomeworkCard
        homework={item}
        userId={currentUserId}
        onPress={() => {
          setSelectedHomework(item);
          setModalVisible(true);
          setIsEditing(false);
        }}
        onTrackPress={() => {
          setCurrentTrackItem(item);
          setManageModalVisible(true);
        }}
      />
    ), [loading]);

  return (
    <View style={[styles.listContainer, { backgroundColor: theme.colors.background }]}>
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        onSwipeComplete={() => setModalVisible(false)}
        swipeDirection={['down']}
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
                </View>

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

  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const fetchUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('role, school_id')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role;
      let childIds = [];
      if (userRole === 'parent') {
        const { data: relationships } = await supabase
          .from('parent_child_relationships')
          .select('child_id')
          .eq('parent_id', user.id);
        childIds = relationships?.map(r => r.child_id) || [];
      }

      let selectStr = '*, assigned_by_user:users!assigned_by(full_name, email)';
      if (userRole === 'student' || userRole === 'parent') {
        selectStr += ', student_completions(id, student_id)';
      }

      let query = supabase.from('assignments').select(selectStr);

      if (userRole === 'student') {
        query = query.filter('student_completions.student_id', 'eq', user.id);
      } else if (userRole === 'parent' && childIds.length > 0) {
        query = query.filter('student_completions.student_id', 'in', `(${childIds.join(',')})`);
      }

      if (userRole === 'student' || userRole === 'parent') {
        const targetUsers = userRole === 'student' ? [user.id] : childIds;
        if (targetUsers.length > 0) {
          const { data: members } = await supabase
            .from('class_members')
            .select('class_id')
            .in('user_id', targetUsers);
          const classIds = [...new Set(members?.map(m => m.class_id) || [])];
          if (classIds.length > 0) {
            query = query.in('class_id', classIds);
          } else {
            setAssignments([]);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        } else {
          setAssignments([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      const { data } = await query.order('due_date', { ascending: true });
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

  const formatDate = useCallback((date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }), []);

  const handleUpdate = useCallback(async () => {
    const { error } = await supabase
      .from('assignments')
      .update({
        title: selectedAssignment.title,
        description: selectedAssignment.description,
        due_date: selectedAssignment.due_date,
      })
      .eq('id', selectedAssignment.id);

    if (!error) {
      showToast('Assignment updated successfully', 'success');
      setIsEditing(false);
      fetchAssignments();
    }
  }, [selectedAssignment, fetchAssignments, showToast]);

  const handleDelete = useCallback(async () => {
    Alert.alert('Delete Assignment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('assignments').delete().eq('id', selectedAssignment.id);
          showToast('Assignment deleted', 'success');
          setModalVisible(false);
          fetchAssignments();
        },
      },
    ]);
  }, [selectedAssignment, fetchAssignments, showToast]);

  const renderItem = useCallback(({ item }) =>
    loading ? <CardSkeleton /> : (
      <AssignmentCard
        assignment={item}
        userId={currentUserId}
        onPress={() => {
          setSelectedAssignment(item);
          setModalVisible(true);
          setIsEditing(false);
        }}
        onTrackPress={() => {
          setCurrentTrackItem(item);
          setManageModalVisible(true);
        }}
      />
    ), [loading, currentUserId]);

  return (
    <View style={[styles.listContainer, { backgroundColor: theme.colors.background }]}>
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        onSwipeComplete={() => setModalVisible(false)}
        swipeDirection={['down']}
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
                </View>

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      setUserRole(data?.role);
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
});
