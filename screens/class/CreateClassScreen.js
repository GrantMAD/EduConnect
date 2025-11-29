import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Button, Platform, ScrollView, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../context/SchoolContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlusCircle, faMinusCircle, faUser, faClock, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';
import { useToast } from '../../context/ToastContext';
const defaultUserImage = require('../../assets/user.png');
import ClassScheduleModal from '../../components/ClassScheduleModal';

export default function CreateClassScreen({ navigation, route }) {
  const { fromDashboard } = route.params || {};
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

  const { schoolId } = useSchool();
  const { showToast } = useToast();

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
      showToast('Failed to fetch students.', 'error');
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
    setModalVisible(true);
  };

  const handleSaveSchedule = (startTimeStr, endTimeStr, infoStr) => {
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

    if (isNaN(startHours) || isNaN(startMinutes) || isNaN(endHours) || isNaN(endMinutes) || startHours > 23 || startMinutes > 59 || endHours > 23 || endMinutes > 59) {
      showToast('Please enter a valid time in HH:MM format.', 'error');
      return;
    }

    const startTime = new Date(selectedDate);
    startTime.setHours(startHours, startMinutes);

    const endTime = new Date(selectedDate);
    endTime.setHours(endHours, endMinutes);

    if (startTime >= endTime) {
      showToast('End time must be after start time.', 'error');
      return;
    }

    const newSchedule = { date: selectedDate, startTime, endTime, info: infoStr };
    setSchedules([...schedules, newSchedule]);
    setModalVisible(false);
  };

  const handleRemoveSchedule = (indexToRemove) => {
    setSchedules(prevSchedules => prevSchedules.filter((_, index) => index !== indexToRemove));
  };

  const handleCreateClass = async () => {
    if (!className || !subject) {
      showToast('Class Name and Subject cannot be empty.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !schoolId) {
        showToast('User or School not identified.', 'error');
        setLoading(false);
        return;
      }

      // Step 1: Create the class without the 'users' array
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({ name: className, subject: subject, school_id: schoolId, teacher_id: user.id })
        .select()
        .single();

      if (classError) throw classError;

      // Step 2: If students are selected, insert them into class_members table
      if (selectedStudents.length > 0) {
        const classMembersToInsert = selectedStudents.map(studentId => ({
          class_id: newClass.id,
          user_id: studentId,
          school_id: schoolId,
          role: 'student',
        }));

        const { error: membersError } = await supabase.from('class_members').insert(classMembersToInsert);
        if (membersError) throw membersError;

        // Fetch preferences for all selected students
        const { data: recipientsData, error: recipientsError } = await supabase
          .from('users')
          .select('id, notification_preferences')
          .in('id', selectedStudents);

        if (recipientsError) {
          console.error('Error fetching student preferences:', recipientsError);
        } else {
          // Filter based on preferences (using 'classSchedule' preference as a proxy for class additions)
          const finalRecipients = recipientsData.filter(u => {
            const prefs = u.notification_preferences;
            return !prefs || prefs.classSchedule !== false;
          });

          // Notify students they've been added to the class
          const notifications = finalRecipients.map(student => ({
            user_id: student.id,
            type: 'added_to_class',
            title: 'Added to New Class',
            message: `You have been added to the class: ${newClass.name}`,
          }));

          if (notifications.length > 0) {
            const { error: notificationError } = await supabase.from('notifications').insert(notifications);
            if (notificationError) {
              console.error('Failed to create student notifications:', notificationError);
            }
          }
        }
      }

      // Step 3: Insert schedules if they exist
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

      showToast(`Class '${className}' created successfully!`, 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating class:', error.message);
      showToast('Failed to create class.', 'error');
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
      {fromDashboard && (
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesomeIcon icon={faArrowLeft} size={20} color="#333" />
          <Text style={styles.backButtonText}>Return to Dashboard</Text>
        </TouchableOpacity>
      )}
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

      <ClassScheduleModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        selectedDate={selectedDate}
        onSave={handleSaveSchedule}
      />

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

  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
