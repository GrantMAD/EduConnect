import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const CreateHomeworkScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('teacher_id', user.id);

        if (error) {
          showToast('Error fetching classes', 'error');
        } else {
          setClasses(data);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      const fetchSchedules = async () => {
        const { data, error } = await supabase
          .from('class_schedules')
          .select('id, start_time, title')
          .eq('class_id', selectedClass);

        if (error) {
          showToast('Could not fetch class schedules.', 'error');
        } else {
          setSchedules(data);
        }
      };
      fetchSchedules();
    }
  }, [selectedClass]);

  const handleCreate = async () => {
    if (!selectedClass || !subject || !description || !dueDate) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setIsCreating(true);

    const { data: newHomework, error } = await supabase.from('homework').insert([
      {
        class_id: selectedClass,
        subject,
        description,
        due_date: dueDate,
        created_by: user.id,
      },
    ]).select().single();

    if (error) {
      showToast(error.message, 'error');
      setIsCreating(false);
      return;
    }

    // --- Notification Logic ---
    try {
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('users, name')
        .eq('id', selectedClass)
        .single();

      if (classError) throw classError;

      if (classData && classData.users && classData.users.length > 0) {
        const studentIds = classData.users;
        
        const { data: parents, error: parentsError } = await supabase
          .rpc('get_parents_of_students', { p_student_ids: studentIds });

        if (parentsError) {
          console.error('Error fetching parents via RPC for homework notification:', parentsError);
        }

        const parentIds = parents ? parents.map(p => p.parent_id) : [];
        const recipientIds = [...new Set([...studentIds, ...parentIds])];

        if (recipientIds.length > 0) {
          const notifications = recipientIds.map(userId => ({
            user_id: userId,
            type: 'new_homework',
            title: `New Homework for ${classData.name}`,
            message: `A new piece of homework has been set: "${newHomework.subject}"`,
            data: { homework_id: newHomework.id }
          }));

          const { error: notificationError } = await supabase.from('notifications').insert(notifications);
          if (notificationError) {
            console.error('Failed to create homework notifications:', notificationError);
            // Non-blocking alert
            showToast('Homework created, but failed to send notifications.', 'warning');
          }
        }
      }
    } catch (notificationError) {
      console.error('An error occurred while sending homework notifications:', notificationError);
      showToast('Homework created, but an error occurred sending notifications.', 'warning');
    }
    // --- End Notification Logic ---

    showToast('Homework created successfully.', 'success');
    navigation.goBack();
    setIsCreating(false);
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} size="large" />;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Create Homework</Text>
      <Text style={styles.screenDescription}>
        Start by selecting a class and a scheduled day for the homework.
      </Text>

      <Text style={styles.inputHeading}>Select a Class</Text>
      <Text style={styles.inputDescription}>Choose the class that this homework is for.</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedClass}
          onValueChange={(itemValue) => setSelectedClass(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="-- Select a class --" value={null} />
          {classes.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={c.id} />
          ))}
        </Picker>
      </View>

      {selectedClass && (
        <>
          <Text style={styles.inputHeading}>Select a Class Day</Text>
          <Text style={styles.inputDescription}>Associate this homework with a specific day from the class schedule.</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedSchedule}
              onValueChange={(itemValue) => {
                setSelectedSchedule(itemValue);
                if (itemValue) {
                  const schedule = schedules.find(s => s.id === itemValue);
                  if (schedule) {
                    setDueDate(new Date(schedule.start_time).toISOString().split('T')[0]);
                  }
                }
              }}
              style={styles.picker}
            >
              <Picker.Item label="-- Select a day --" value={null} />
              {schedules.map((s) => (
                <Picker.Item
                  key={s.id}
                  label={`${s.title} - ${new Date(s.start_time).toLocaleString()}`}
                  value={s.id}
                />
              ))}
            </Picker>
          </View>
        </>
      )}

      {selectedSchedule && (
        <>
          <Text style={styles.inputHeading}>Subject</Text>
          <Text style={styles.inputDescription}>A concise title for the homework.</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter subject"
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={styles.inputHeading}>Description</Text>
          <Text style={styles.inputDescription}>Provide detailed instructions for the homework.</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Enter description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <Text style={styles.inputHeading}>Due Date</Text>
          <Text style={styles.inputDescription}>Select a due date from the calendar.</Text>
          <Calendar
            minDate={new Date().toISOString().split('T')[0]}
            onDayPress={(day) => {
              setDueDate(day.dateString);
            }}
            markedDates={{
              [dueDate]: { selected: true, marked: true, selectedColor: '#007AFF' },
            }}
            style={styles.calendar}
          />
          {dueDate ? (
            <View style={styles.selectedDateCard}>
              <Text style={styles.selectedDateText}>Selected Date: {dueDate}</Text>
            </View>
          ) : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, isCreating && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.buttonText}>Creating homework...</Text>
                </>
              ) : (
                <Text style={styles.buttonText}>Create Homework</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  screenDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 10,
  },
  inputDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
  },
  picker: {},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  calendar: {
    marginBottom: 10,
  },
  selectedDateCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 10,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a9a9a9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});

export default CreateHomeworkScreen;