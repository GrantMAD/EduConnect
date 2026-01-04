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
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 30) }]}>
          {selectedHomework && (
            <>
              <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                <FontAwesomeIcon icon={faClipboardList} size={26} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Homework Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <View style={styles.descriptionContainer}>
                  {isEditing ? (
                    <TextInput
                      style={[styles.modalTextInput, { color: theme.colors.text }]}
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

                <View style={[styles.detailsCard, { backgroundColor: theme.colors.cardBackground }]}>
                  <Text style={{ color: theme.colors.text }}>
                    Subject: {selectedHomework.subject}
                  </Text>
                  <Text style={{ color: theme.colors.text }}>
                    Due: {formatDate(selectedHomework.due_date)}
                  </Text>
                </View>

                {currentUserId === selectedHomework.created_by && (
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => (isEditing ? handleUpdate() : setIsEditing(true))}
                    >
                      <FontAwesomeIcon icon={faPen} size={16} color="#fff" />
                      <Text style={styles.modalButtonText}>
                        {isEditing ? 'Save' : 'Edit'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
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
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [currentTrackItem, setCurrentTrackItem] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const isFocused = useIsFocused();
  const { theme } = useTheme();

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

  const renderItem = useCallback(({ item }) =>
    loading ? <CardSkeleton /> : (
      <AssignmentCard
        assignment={item}
        userId={currentUserId}
        onTrackPress={() => {
          setCurrentTrackItem(item);
          setManageModalVisible(true);
        }}
      />
    ), [loading, currentUserId]);

  return (
    <View style={[styles.listContainer, { backgroundColor: theme.colors.background }]}>
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
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 15,
    flex: 1,
  },
  descriptionContainer: { paddingVertical: 20 },
  descriptionText: { fontSize: 16, lineHeight: 24 },

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
    borderRadius: 6,
    padding: 10,
  },
});
