import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Button, Platform, ScrollView, Modal, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlusCircle, faMinusCircle, faUser, faClock } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';
const defaultUserImage = require('../assets/user.png');

export default function CreateClassScreen({ navigation }) {
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingStudents, setFetchingStudents] = useState(false);
  
  const [schedules, setSchedules] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tempStartTime, setTempStartTime] = useState('');
  const [tempEndTime, setTempEndTime] = useState('');
  const [classInfo, setClassInfo] = useState('');

  const { schoolId } = useSchool();

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [schoolId]);

  useEffect(() => {
    if (searchQuery === '') {
      setStudents(allStudents);
    } else {
      const filtered = allStudents.filter(student =>
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setStudents(filtered);
    }
  }, [searchQuery, allStudents]);

  const fetchStudents = async () => {
    setFetchingStudents(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .eq('school_id', schoolId)
        .eq('role', 'student');

      if (error) throw error;
      setAllStudents(data);
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error.message);
      Alert.alert('Error', 'Failed to fetch students.');
    } finally {
      setFetchingStudents(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      const isSelected = prev.includes(studentId);
      if (isSelected) {
        return prev.filter(id => id !== studentId);
      } else {
        setSearchQuery('');
        return [...prev, studentId];
      }
    });
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setTempStartTime('');
    setTempEndTime('');
    setClassInfo('');
    setModalVisible(true);
  };

  const handleTimeChange = (text, isStart) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let newText = cleaned;
    if (cleaned.length > 2) {
      newText = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
    }

    if (isStart) {
      setTempStartTime(newText);
    } else {
      setTempEndTime(newText);
    }
  };

  const handleSaveSchedule = () => {
    const [startHours, startMinutes] = tempStartTime.split(':').map(Number);
    const [endHours, endMinutes] = tempEndTime.split(':').map(Number);

    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes) || startHours > 23 || startMinutes > 59 || endHours > 23 || endMinutes > 59) {
      Alert.alert('Invalid Time', 'Please enter a valid time in HH:MM format.');
      return;
    }

    const startTime = new Date(selectedDate);
    startTime.setHours(startHours, startMinutes);

    const endTime = new Date(selectedDate);
    endTime.setHours(endHours, endMinutes);

    if (startTime >= endTime) {
      Alert.alert('Invalid Time', 'End time must be after start time.');
      return;
    }

    const newSchedule = { date: selectedDate, startTime, endTime, info: classInfo };
    setSchedules([...schedules, newSchedule]);
    setModalVisible(false);
  };

  const handleRemoveSchedule = (indexToRemove) => {
    setSchedules(prevSchedules => prevSchedules.filter((_, index) => index !== indexToRemove));
  };

  const handleCreateClass = async () => {
    if (!className || !subject) {
      Alert.alert('Error', 'Class Name and Subject cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        setLoading(false);
        return;
      }

      if (!schoolId) {
        Alert.alert('Error', 'School ID not available.');
        setLoading(false);
        return;
      }

      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({ name: className, subject: subject, school_id: schoolId, teacher_id: user.id, users: selectedStudents })
        .select()
        .single();

      if (classError) throw classError;

      // Notify students they've been added to the class
      if (selectedStudents.length > 0) {
        const notifications = selectedStudents.map(studentId => ({
          user_id: studentId,
          type: 'added_to_class',
          title: 'Added to New Class',
          message: `You have been added to the class: ${newClass.name}`,
        }));

        const { error: notificationError } = await supabase.from('notifications').insert(notifications);
        if (notificationError) {
          // Log the error, but don't block the main success message
          console.error('Failed to create student notifications:', notificationError);
        }
      }


      if (schedules.length > 0) {
        const scheduleToInsert = schedules.map(schedule => ({
          class_id: newClass.id,
          start_time: schedule.startTime.toISOString(),
          end_time: schedule.endTime.toISOString(),
          title: className,
          description: subject,
          class_info: schedule.info,
          school_id: schoolId,
          created_by: user.id,
        }));

        const { error: scheduleError } = await supabase.from('class_schedules').insert(scheduleToInsert);
        if (scheduleError) throw scheduleError;
      }

      Alert.alert('Success', `Class '${className}' created successfully!`);
      navigation.goBack();
    } catch (error) {
      console.error('Error creating class:', error.message);
      Alert.alert('Error', 'Failed to create class.');
    } finally {
      setLoading(false);
    }
  };

  const markedDates = schedules.reduce((acc, sched) => {
    acc[sched.date] = { marked: true, dotColor: '#007AFF' };
    return acc;
  }, {});

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Create New Class</Text>

      <Text style={styles.label}>Class Name</Text>
      <Text style={styles.descriptionText}>Give your class a unique and descriptive name.</Text>
      <TextInput style={styles.input} value={className} onChangeText={setClassName} placeholder="Enter class name (e.g., Math 101)" />

      <Text style={styles.label}>Subject</Text>
      <Text style={styles.descriptionText}>Specify the subject this class belongs to.</Text>
      <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Enter subject (e.g., Mathematics)" />

      <Text style={styles.label}>Add Students</Text>
      <Text style={styles.descriptionText}>Search for and add students to this class.</Text>
      <TextInput style={styles.input} value={searchQuery} onChangeText={setSearchQuery} placeholder="Search students by name..." />

      {fetchingStudents ? (
        <ActivityIndicator size="small" style={{ marginBottom: 10 }} />
      ) : (
        <ScrollView style={styles.studentList} nestedScrollEnabled={true}>
          {students.filter(s => !selectedStudents.includes(s.id)).length > 0 ? (
            students.filter(s => !selectedStudents.includes(s.id)).map(item => (
              <TouchableOpacity key={item.id} style={styles.studentItem} onPress={() => toggleStudentSelection(item.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage}
                    style={styles.studentAvatar}
                  />
                  <View>
                    <Text>{item.full_name}</Text>
                    <Text style={{ color: 'gray' }}>{item.email}</Text>
                  </View>
                </View>
                <FontAwesomeIcon icon={faPlusCircle} size={20} color="#28a745" />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No students found.</Text>
          )}
        </ScrollView>
      )}

      <Text style={styles.label}>Selected Students</Text>
      {selectedStudents.length === 0 ? (
        <Text style={styles.emptyText}>No students selected.</Text>
      ) : (
        <ScrollView style={styles.studentList} nestedScrollEnabled={true}>
          {students.filter(s => selectedStudents.includes(s.id)).map(item => (
            <TouchableOpacity key={item.id} style={styles.studentItem} onPress={() => toggleStudentSelection(item.id)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Image
                    source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage}
                    style={styles.studentAvatar}
                  />
                <View>
                  <Text>{item.full_name}</Text>
                  <Text style={{ color: 'gray' }}>{item.email}</Text>
                </View>
              </View>
              <FontAwesomeIcon icon={faMinusCircle} size={20} color="#dc3545" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={styles.subHeader}>Class Schedules</Text>
      <Text style={styles.subHeaderDescription}>Select dates on the calendar to add class times.</Text>
      <Calendar onDayPress={handleDayPress} markedDates={markedDates} />

      <Text style={styles.subHeader}>Scheduled Times</Text>
      <Text style={styles.subHeaderDescription}>Review the dates and times you've added for this class.</Text>
      <View style={styles.scheduleList}>
        {schedules.map((item, index) => (
          <View key={index} style={styles.scheduleItem}>
            <View>
              <Text style={styles.scheduleText}>Date: {item.date}</Text>
              <Text style={styles.scheduleText}>Time: {item.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {item.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              {item.info ? <Text style={styles.scheduleInfoText}>Info: {item.info}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleRemoveSchedule(index)}>
              <FontAwesomeIcon icon={faMinusCircle} size={24} color="#dc3545" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Modal visible={isModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Time Select</Text>
            <Text style={styles.modalDescription}>Input the start and end times for your class.</Text>
            <Text style={styles.modalDate}>{selectedDate}</Text>
            <View style={styles.timeInputRow}>
                <FontAwesomeIcon icon={faClock} size={24} color="#888" style={{ marginRight: 15, marginTop: 20 }} />
                <View style={styles.timeInputGroup}>
                    <Text style={styles.timeInputLabel}>Start Time</Text>
                    <TextInput
                        style={styles.timeInput}
                        placeholder="10:00"
                        keyboardType="numeric"
                        maxLength={5}
                        value={tempStartTime}
                        onChangeText={(text) => handleTimeChange(text, true)}
                    />
                </View>
                <Text style={styles.timeSeparator}>-</Text>
                <View style={styles.timeInputGroup}>
                    <Text style={styles.timeInputLabel}>End Time</Text>
                    <TextInput
                        style={styles.timeInput}
                        placeholder="11:00"
                        keyboardType="numeric"
                        maxLength={5}
                        value={tempEndTime}
                        onChangeText={(text) => handleTimeChange(text, false)}
                    />
                </View>
            </View>
            <TextInput
                style={styles.infoInput}
                placeholder="Enter class information for this day..."
                value={classInfo}
                onChangeText={setClassInfo}
                multiline
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveSchedule}>
                  <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.createClassButton} onPress={handleCreateClass} disabled={loading}>
        <Text style={styles.createClassButtonText}>{loading ? 'Creating...' : 'Create Class'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#f8f9fa', padding: 20 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#555', marginTop: 10 },
  descriptionText: { fontSize: 12, color: '#777', marginBottom: 10, marginLeft: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 },
  studentList: { maxHeight: 150, marginBottom: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
  studentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  emptyText: { textAlign: 'center', padding: 10, color: '#666' },
  createClassButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  createClassButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scheduleList: { marginTop: 10 },
  scheduleItem: { backgroundColor: '#e9ecef', padding: 10, borderRadius: 5, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scheduleText: { fontSize: 14 },
  scheduleInfoText: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 5 },
  subHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 5 },
  subHeaderDescription: { fontSize: 14, color: '#666', marginBottom: 10 },
  // Modal Styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 25, borderRadius: 15, width: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 5, textAlign: 'center' },
  modalDescription: { fontSize: 14, color: '#666', marginBottom: 10, textAlign: 'center' },
  modalDate: { fontSize: 16, fontWeight: 'bold', marginBottom: 25, textAlign: 'center' },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  timeInputGroup: { alignItems: 'center' },
  timeInputLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  timeInput: { fontSize: 18, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, width: 100, textAlign: 'center' },
  timeSeparator: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 10, marginTop: 20 },
  infoInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, flex: 1, marginHorizontal: 5 },
  saveButton: { backgroundColor: '#007AFF' },
  saveButtonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  cancelButton: { backgroundColor: '#f1f1f1' },
  cancelButtonText: { color: '#333', fontWeight: 'bold', textAlign: 'center' },
});
