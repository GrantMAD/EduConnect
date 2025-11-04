import React, { useEffect, useState, useContext } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, Modal, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { FAB, Portal, Provider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimesCircle, faCalendarAlt, faClipboardList, faCalendarPlus, faBook } from '@fortawesome/free-solid-svg-icons';

import { supabase } from '../lib/supabase';
import HomeworkCard from '../components/HomeworkCard';
import AssignmentCard from '../components/AssignmentCard';

const Tab = createMaterialTopTabNavigator();

const HomeworkList = () => {
  const [homework, setHomework] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState(null);

  useEffect(() => {
    fetchHomework();
  }, []);

  const fetchHomework = async () => {
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
  };

  const formatDate = (dateString) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const date = new Date(dateString);
    const dayOfWeek = days[date.getDay()];
    const dayOfMonth = date.getDate();
    const month = months[date.getMonth()];
    return `${dayOfWeek} ${dayOfMonth} ${month}`;
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
                  <Text style={styles.modalInfoText}>Subject: {selectedHomework.subject}</Text>
                </View>
                <View style={styles.hr} />
                <Text style={styles.modalText}>Description: {selectedHomework.description}</Text>
                <View style={styles.hr} />
                <View style={styles.dueDateContainer}>
                  <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#007AFF" />
                  <Text style={styles.dueDateText}>Due Date: {selectedHomework.due_date}</Text>
                </View>
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

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .order('due_date', { ascending: true });
    if (error) console.error(error);
    else setAssignments(data);
    setLoading(false);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  return (
    <View style={styles.container}>
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <AssignmentCard assignment={item} />}
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
});
