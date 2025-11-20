import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { FAB, Portal, Provider } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import CardListSkeleton from '../components/skeletons/CardListSkeleton';
import { faTimes, faCalendarAlt, faClipboardList, faCalendarPlus, faBook, faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';

import { supabase } from '../lib/supabase';
import HomeworkCard from '../components/HomeworkCard';
import AssignmentCard from '../components/AssignmentCard';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const Tab = createMaterialTopTabNavigator();

const HomeworkList = () => {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const { theme } = useTheme(); // Use the theme hook

  useEffect(() => {
    if (isFocused) {
      fetchHomework();
    }
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, [isFocused]);

  const fetchHomework = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('homework')
      .select('*')
      .order('due_date', { ascending: true });
    if (error) console.error(error);
    else setHomework(data);
    setLoading(false);
  };

  const handleCardPress = (item) => {
    setSelectedHomework(item);
    setModalVisible(true);
    setIsEditing(false); // Ensure modal opens in view mode
  };

  const handleUpdate = async () => {
    if (!selectedHomework) return;

    try {
      console.log('Attempting to update homework:', selectedHomework.id);
      const { error } = await supabase
        .from('homework')
        .update({ subject: selectedHomework.subject, description: selectedHomework.description, due_date: selectedHomework.due_date })
        .eq('id', selectedHomework.id);

      if (error) {
        console.error('Supabase update error:', error);
        showToast('Failed to update homework: ' + error.message, 'error');
      } else {
        console.log('Homework updated successfully:', selectedHomework.id);
        showToast('Homework updated successfully.', 'success');
        setIsEditing(false);
        fetchHomework();
      }
    } catch (err) {
      console.error('Unexpected error during homework update:', err);
      showToast('An unexpected error occurred: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedHomework) return;

    Alert.alert(
      'Delete Homework',
      'Are you sure you want to delete this homework?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            const { error } = await supabase
              .from('homework')
              .delete()
              .eq('id', selectedHomework.id);

            if (error) {
              showToast('Failed to delete homework.', 'error');
            } else {
              showToast('Homework deleted successfully.', 'success');
              setModalVisible(false);
              fetchHomework();
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  if (loading) return <CardListSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.screenDescription, { color: theme.colors.text }]}>Here is a list of all your current homework. Tap on a card to view more details.</Text>
      <View style={[styles.hr, { borderBottomColor: theme.colors.cardBorder }]} />
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          {selectedHomework && (
            <>
              <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                <FontAwesomeIcon icon={faClipboardList} size={26} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Homework Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                  <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.descriptionContainer}>
                  {isEditing ? (
                    <TextInput
                      style={[styles.modalTextInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                      value={selectedHomework.description}
                      onChangeText={(text) => setSelectedHomework({ ...selectedHomework, description: text })}
                      multiline
                    />
                  ) : (
                    <Text style={[styles.descriptionText, { color: theme.colors.text }]}>{selectedHomework.description}</Text>
                  )}
                </View>

                <View style={[styles.detailsCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                  <View style={styles.modalDetailRow}>
                    <FontAwesomeIcon icon={faBook} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
                    {isEditing ? (
                      <TextInput
                        style={[styles.modalTextInput, { flex: 1, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                        value={selectedHomework.subject}
                        onChangeText={(text) => setSelectedHomework({ ...selectedHomework, subject: text })}
                      />
                    ) : (
                      <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>Subject: {selectedHomework.subject}</Text>
                    )}
                  </View>
                  <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
                  <View style={styles.modalDetailRow}>
                    <FontAwesomeIcon icon={faCalendarAlt} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
                    <View style={{ flex: 1 }}>
                      {isEditing ? (
                        <Calendar
                          minDate={new Date().toISOString().split('T')[0]}
                          onDayPress={(day) => {
                            setSelectedHomework({ ...selectedHomework, due_date: day.dateString });
                          }}
                          markedDates={{
                            [selectedHomework.due_date]: { selected: true, marked: true, selectedColor: theme.colors.primary },
                          }}
                          style={styles.modalCalendar}
                          theme={{
                            backgroundColor: theme.colors.background,
                            calendarBackground: theme.colors.background,
                            dayTextColor: theme.colors.text,
                            textDisabledColor: theme.colors.placeholder,
                            monthTextColor: theme.colors.text,
                            textSectionTitleColor: theme.colors.text,
                            selectedDayBackgroundColor: theme.colors.primary,
                            selectedDayTextColor: theme.colors.buttonPrimaryText,
                            todayTextColor: theme.colors.primary,
                            arrowColor: theme.colors.primary,
                            dotColor: theme.colors.primary,
                          }}
                        />
                      ) : (
                        <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>Due: {formatDate(selectedHomework.due_date)}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {currentUserId === selectedHomework.created_by && (
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => {
                        if (isEditing) {
                          handleUpdate();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={faPen} size={16} color={theme.colors.buttonPrimaryText} style={{ marginRight: 8 }} />
                      <Text style={[styles.modalButtonText, { color: theme.colors.buttonPrimaryText }]}>{isEditing ? 'Save Changes' : 'Edit'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, isEditing && styles.disabledButton, { backgroundColor: theme.colors.error }]}
                      onPress={handleDelete}
                      disabled={isEditing}
                    >
                      <FontAwesomeIcon icon={faTrash} size={16} color={theme.colors.buttonPrimaryText} style={{ marginRight: 8 }} />
                      <Text style={[styles.modalButtonText, { color: theme.colors.buttonPrimaryText }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      <FlatList
        data={homework}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <HomeworkCard homework={item} onPress={() => handleCardPress(item)} />}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No homework found.</Text>}
      />
    </View>
  );
};

const AssignmentsList = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const { theme } = useTheme(); // Use the theme hook

  useEffect(() => {
    if (isFocused) {
      fetchAssignments();
    }
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, [isFocused]);

  const fetchAssignments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('due_date', { ascending: true });
    if (error) console.error(error);
    else setAssignments(data);
    setLoading(false);
  };

  const handleCardPress = (item) => {
    setSelectedAssignment(item);
    setModalVisible(true);
    setIsEditing(false); // Ensure modal opens in view mode
  };

  const handleUpdate = async () => {
    if (!selectedAssignment) return;

    try {
      console.log('Attempting to update assignment:', selectedAssignment.id);
      const { error } = await supabase
        .from('assignments')
        .update({ title: selectedAssignment.title, description: selectedAssignment.description, due_date: selectedAssignment.due_date })
        .eq('id', selectedAssignment.id);

      if (error) {
        console.error('Supabase update error:', error);
        showToast('Failed to update assignment: ' + error.message, 'error');
      } else {
        console.log('Assignment updated successfully:', selectedAssignment.id);
        showToast('Assignment updated successfully.', 'success');
        setIsEditing(false);
        fetchAssignments();
      }
    } catch (err) {
      console.error('Unexpected error during assignment update:', err);
      showToast('An unexpected error occurred: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedAssignment) return;

    Alert.alert(
      'Delete Assignment',
      'Are you sure you want to delete this assignment?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            const { error } = await supabase
              .from('assignments')
              .delete()
              .eq('id', selectedAssignment.id);

            if (error) {
              showToast('Failed to delete assignment.', 'error');
            } else {
              showToast('Assignment deleted successfully.', 'success');
              setModalVisible(false);
              fetchAssignments();
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  if (loading) return <CardListSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.screenDescription, { color: theme.colors.text }]}>Here is a list of all your current assignments. Tap on a card to view more details.</Text>
      <View style={[styles.hr, { borderBottomColor: theme.colors.cardBorder }]} />
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          {selectedAssignment && (
            <>
              <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                <FontAwesomeIcon icon={faClipboardList} size={26} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Assignment Details</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                  <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.descriptionContainer}>
                  {isEditing ? (
                    <TextInput
                      style={[styles.modalTextInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                      value={selectedAssignment.description}
                      onChangeText={(text) => setSelectedAssignment({ ...selectedAssignment, description: text })}
                      multiline
                    />
                  ) : (
                    <Text style={[styles.descriptionText, { color: theme.colors.text }]}>{selectedAssignment.description}</Text>
                  )}
                </View>

                <View style={[styles.detailsCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                  <View style={styles.modalDetailRow}>
                    <FontAwesomeIcon icon={faBook} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
                    {isEditing ? (
                      <TextInput
                        style={[styles.modalTextInput, { flex: 1, backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                        value={selectedAssignment.title}
                        onChangeText={(text) => setSelectedAssignment({ ...selectedAssignment, title: text })}
                      />
                    ) : (
                      <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>Title: {selectedAssignment.title}</Text>
                    )}
                  </View>
                  <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
                  <View style={styles.modalDetailRow}>
                    <FontAwesomeIcon icon={faCalendarAlt} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
                    <View style={{ flex: 1 }}>
                      {isEditing ? (
                        <Calendar
                          minDate={new Date().toISOString().split('T')[0]}
                          onDayPress={(day) => {
                            setSelectedAssignment({ ...selectedAssignment, due_date: day.dateString });
                          }}
                          markedDates={{
                            [selectedAssignment.due_date]: { selected: true, marked: true, selectedColor: theme.colors.primary },
                          }}
                          style={styles.modalCalendar}
                          theme={{
                            backgroundColor: theme.colors.background,
                            calendarBackground: theme.colors.background,
                            dayTextColor: theme.colors.text,
                            textDisabledColor: theme.colors.placeholder,
                            monthTextColor: theme.colors.text,
                            textSectionTitleColor: theme.colors.text,
                            selectedDayBackgroundColor: theme.colors.primary,
                            selectedDayTextColor: theme.colors.buttonPrimaryText,
                            todayTextColor: theme.colors.primary,
                            arrowColor: theme.colors.primary,
                            dotColor: theme.colors.primary,
                          }}
                        />
                      ) : (
                        <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>Due: {formatDate(selectedAssignment.due_date)}</Text>
                      )}
                    </View>
                  </View>
                </View>

                {currentUserId === selectedAssignment.assigned_by && (
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => {
                        if (isEditing) {
                          handleUpdate();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={faPen} size={16} color={theme.colors.buttonPrimaryText} style={{ marginRight: 8 }} />
                      <Text style={[styles.modalButtonText, { color: theme.colors.buttonPrimaryText }]}>{isEditing ? 'Save Changes' : 'Edit'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, isEditing && styles.disabledButton, { backgroundColor: theme.colors.error }]}
                      onPress={handleDelete}
                      disabled={isEditing}
                    >
                      <FontAwesomeIcon icon={faTrash} size={16} color={theme.colors.buttonPrimaryText} style={{ marginRight: 8 }} />
                      <Text style={[styles.modalButtonText, { color: theme.colors.buttonPrimaryText }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <AssignmentCard assignment={item} onPress={() => handleCardPress(item)} />}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No assignments found.</Text>}
      />
    </View>
  );
};

export default function HomeworkScreen() {
  const navigation = useNavigation();
  const [userRole, setUserRole] = useState(null);
  const [fabOpen, setFabOpen] = useState(false);
  const { theme } = useTheme(); // Use the theme hook

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserRole(profile.role);
        }
      }
    };
    fetchUserRole();
  }, []);

  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

  return (
    <Provider>
      <Tab.Navigator
        screenOptions={{
          tabBarLabelStyle: { textTransform: 'none', color: theme.colors.text },
          tabBarStyle: { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.cardBorder },
          tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
        }}
      >
        <Tab.Screen name="HomeworkList" component={HomeworkList} options={{ title: 'Homework' }} />
        <Tab.Screen name="AssignmentsList" component={AssignmentsList} options={{ title: 'Assignments' }} />
      </Tab.Navigator>
      {isTeacherOrAdmin && (
        <Portal>
          <FAB.Group
            open={fabOpen}
            icon={fabOpen ? 'close' : 'plus'}
            color={theme.colors.buttonPrimaryText}
            fabStyle={{ backgroundColor: theme.colors.primary }}
            actions={[
              {
                icon: 'notebook-plus',
                label: 'Create Homework',
                onPress: () => navigation.navigate('CreateHomework'),
                color: theme.colors.text,
                labelTextColor: theme.colors.text,
                style: { backgroundColor: theme.colors.surface },
              },
              {
                icon: 'file-plus',
                label: 'Create Assignment',
                onPress: () => navigation.navigate('CreateAssignment'),
                color: theme.colors.text,
                labelTextColor: theme.colors.text,
                style: { backgroundColor: theme.colors.surface },
              },
            ]}
            onStateChange={({ open }) => setFabOpen(open)}
          />
        </Portal>
      )}
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  screenDescription: {
    fontSize: 14,
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalCloseButton: {
    padding: 5,
  },
  descriptionContainer: {
    paddingVertical: 20,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailsCard: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  modalIcon: {
    marginRight: 12,
  },
  modalDetailText: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginVertical: 12,
  },
  hr: {
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    marginBottom: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.45,
  },
  modalButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  modalCalendar: {
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
});