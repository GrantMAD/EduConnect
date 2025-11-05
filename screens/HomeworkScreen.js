import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { FAB, Portal, Provider } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimesCircle, faCalendarAlt, faClipboardList, faCalendarPlus, faBook } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';

import { supabase } from '../lib/supabase';
import HomeworkCard from '../components/HomeworkCard';
import AssignmentCard from '../components/AssignmentCard';

const Tab = createMaterialTopTabNavigator();

const HomeworkList = () => {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if(isFocused){
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
        Alert.alert('Error', 'Failed to update homework: ' + error.message);
      } else {
        console.log('Homework updated successfully:', selectedHomework.id);
        Alert.alert('Success', 'Homework updated successfully.');
        setIsEditing(false);
        fetchHomework();
      }
    } catch (err) {
      console.error('Unexpected error during homework update:', err);
      Alert.alert('Error', 'An unexpected error occurred: ' + err.message);
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
              Alert.alert('Error', 'Failed to delete homework.');
            } else {
              Alert.alert('Success', 'Homework deleted successfully.');
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={styles.container}>
      <Text style={styles.screenDescription}>Here is a list of all your current homework. Tap on a card to view more details.</Text>
      <View style={styles.hr} />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          setIsEditing(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <FontAwesomeIcon icon={faTimesCircle} size={24} color="#007AFF" />
            </TouchableOpacity>
            {selectedHomework && (
              <>
                <View style={styles.modalTitleContainer}>
                  <FontAwesomeIcon icon={faClipboardList} size={20} color="#007AFF" />
                  <Text style={styles.modalTitle}>Todays homework</Text>
                </View>
                <View style={styles.modalInfoContainer}>
                  <FontAwesomeIcon icon={faCalendarPlus} size={14} color="#007AFF" style={styles.modalInfoIcon} />
                  <Text style={styles.modalInfoText}>Date issued: {formatDate(selectedHomework.created_at)}</Text>
                </View>
                <View style={styles.modalInfoContainer}>
                  <FontAwesomeIcon icon={faBook} size={14} color="#007AFF" style={styles.modalInfoIcon} />
                  {isEditing ? (
                    <TextInput
                      style={styles.modalTextInput}
                      value={selectedHomework.subject}
                      onChangeText={(text) => setSelectedHomework({ ...selectedHomework, subject: text })}
                    />
                  ) : (
                    <Text style={styles.modalInfoText}>Subject: {selectedHomework.subject}</Text>
                  )}
                </View>
                <View style={styles.hr} />
                {isEditing ? (
                  <TextInput
                    style={styles.modalTextInput}
                    value={selectedHomework.description}
                    onChangeText={(text) => setSelectedHomework({ ...selectedHomework, description: text })}
                    multiline
                  />
                ) : (
                  <Text style={styles.modalText}>Description: {selectedHomework.description}</Text>
                )}
                <View style={styles.hr} />
                <View style={styles.dueDateContainer}>
                  <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#007AFF" />
                  {isEditing ? (
                    <Calendar
                      minDate={new Date().toISOString().split('T')[0]}
                      onDayPress={(day) => {
                        setSelectedHomework({ ...selectedHomework, due_date: day.dateString });
                      }}
                      markedDates={{
                        [selectedHomework.due_date]: { selected: true, marked: true, selectedColor: '#007AFF' },
                      }}
                      style={styles.modalCalendar}
                    />
                  ) : (
                    <Text style={styles.dueDateText}>Due Date: {formatDate(selectedHomework.due_date)}</Text>
                  )}
                </View>
                {currentUserId === selectedHomework.created_by && (
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => {
                        if (isEditing) {
                          handleUpdate();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                    >
                      <Text style={styles.modalButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, isEditing && styles.disabledButton]}
                      onPress={handleDelete}
                      disabled={isEditing}
                    >
                      <Text style={styles.modalButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <FlatList
        data={homework}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <HomeworkCard homework={item} onPress={() => handleCardPress(item)} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No homework found.</Text>}
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
        Alert.alert('Error', 'Failed to update assignment: ' + error.message);
      } else {
        console.log('Assignment updated successfully:', selectedAssignment.id);
        Alert.alert('Success', 'Assignment updated successfully.');
        setIsEditing(false);
        fetchAssignments();
      }
    } catch (err) {
      console.error('Unexpected error during assignment update:', err);
      Alert.alert('Error', 'An unexpected error occurred: ' + err.message);
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
              Alert.alert('Error', 'Failed to delete assignment.');
            } else {
              Alert.alert('Success', 'Assignment deleted successfully.');
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={styles.container}>
      <Text style={styles.screenDescription}>Here is a list of all your current assignments. Tap on a card to view more details.</Text>
      <View style={styles.hr} />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          setIsEditing(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <FontAwesomeIcon icon={faTimesCircle} size={24} color="#007AFF" />
            </TouchableOpacity>
            {selectedAssignment && (
              <>
                <View style={styles.modalTitleContainer}>
                  <FontAwesomeIcon icon={faClipboardList} size={20} color="#007AFF" />
                  {isEditing ? (
                    <TextInput
                      style={styles.modalTitleTextInput}
                      value={selectedAssignment.title}
                      onChangeText={(text) => setSelectedAssignment({ ...selectedAssignment, title: text })}
                    />
                  ) : (
                    <Text style={styles.modalTitle}>{selectedAssignment.title}</Text>
                  )}
                </View>
                <View style={styles.modalInfoContainer}>
                  <FontAwesomeIcon icon={faCalendarPlus} size={14} color="#007AFF" style={styles.modalInfoIcon} />
                  <Text style={styles.modalInfoText}>Date issued: {formatDate(selectedAssignment.created_at)}</Text>
                </View>
                <View style={styles.hr} />
                {isEditing ? (
                  <TextInput
                    style={styles.modalTextInput}
                    value={selectedAssignment.description}
                    onChangeText={(text) => setSelectedAssignment({ ...selectedAssignment, description: text })}
                    multiline
                  />
                ) : (
                  <Text style={styles.modalText}>Description: {selectedAssignment.description}</Text>
                )}
                <View style={styles.hr} />
                <View style={styles.dueDateContainer}>
                  <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#007AFF" />
                  {isEditing ? (
                    <Calendar
                      minDate={new Date().toISOString().split('T')[0]}
                      onDayPress={(day) => {
                        setSelectedAssignment({ ...selectedAssignment, due_date: day.dateString });
                      }}
                      markedDates={{
                        [selectedAssignment.due_date]: { selected: true, marked: true, selectedColor: '#007AFF' },
                      }}
                      style={styles.modalCalendar}
                    />
                  ) : (
                    <Text style={styles.dueDateText}>Due Date: {formatDate(selectedAssignment.due_date)}</Text>
                  )}
                </View>
                {currentUserId === selectedAssignment.assigned_by && (
                  <View style={styles.modalButtonContainer}>
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={() => {
                        if (isEditing) {
                          handleUpdate();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                    >
                      <Text style={styles.modalButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, isEditing && styles.disabledButton]}
                      onPress={handleDelete}
                      disabled={isEditing}
                    >
                      <Text style={styles.modalButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <AssignmentCard assignment={item} onPress={() => handleCardPress(item)} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No assignments found.</Text>}
      />
    </View>
  );
};

export default function HomeworkScreen() {
  const navigation = useNavigation();
  const [userRole, setUserRole] = useState(null);
  const [fabOpen, setFabOpen] = useState(false);

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
          tabBarLabelStyle: { textTransform: 'none' }
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
            color='white'
            fabStyle={{ backgroundColor: '#007AFF' }}
            actions={[
              {
                icon: 'notebook-plus',
                label: 'Create Homework',
                onPress: () => navigation.navigate('CreateHomework'),
              },
              {
                icon: 'file-plus',
                label: 'Create Assignment',
                onPress: () => navigation.navigate('CreateAssignment'),
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
    backgroundColor: '#fff',
    padding: 16,
  },
  screenDescription: {
    fontSize: 14,
    color: '#000',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
    marginLeft: 10,
    flex: 1,
  },
  modalInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  modalInfoIcon: {
    marginRight: 10,
  },
  modalInfoText: {
    fontSize: 14,
    flex: 1,
  },
  modalText: {
    marginBottom: 15,
    textAlign: "left",
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  hr: {
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    marginVertical: 10,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dueDateText: {
    marginLeft: 10,
    fontSize: 14,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    flex: 1,
  },
  modalTitleTextInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  modalCalendar: {
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
});
