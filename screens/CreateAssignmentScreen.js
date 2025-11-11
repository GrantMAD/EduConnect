import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { Calendar } from 'react-native-calendars';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useToast } from '../context/ToastContext';

const CreateAssignmentScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState(null);
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
          showToast('Error fetching classes');
        } else {
          setClasses(data);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleCreate = async () => {
    if (!selectedClass || !title || !description || !dueDate) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      let file_url = null;
      if (file) {
        console.log('Uploading file...');
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const blob = ReactNativeBlobUtil.wrap(file.uri);

        const { error: uploadError } = await supabase.storage
          .from('assignments')
          .upload(filePath, blob, {
            contentType: file.mimeType,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath);

        if (!publicUrlData) {
          throw new Error('Error getting public URL');
        }

        file_url = publicUrlData.publicUrl;
        console.log('File uploaded:', file_url);
      }

      const { data: newAssignment, error } = await supabase.from('assignments').insert([
        {
          title,
          description,
          due_date: dueDate,
          class_id: selectedClass,
          assigned_by: user.id,
          file_url,
        },
      ]).select().single();

      if (error) {
        throw error;
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
            console.error('Error fetching parents via RPC for assignment notification:', parentsError);
          }

          const parentIds = parents ? parents.map(p => p.parent_id) : [];
          const recipientIds = [...new Set([...studentIds, ...parentIds])];

          if (recipientIds.length > 0) {
            const notifications = recipientIds.map(userId => ({
              user_id: userId,
              type: 'new_assignment',
              title: `New Assignment for ${classData.name}`,
              message: `A new assignment has been set: "${newAssignment.title}"`,
              data: { assignment_id: newAssignment.id }
            }));

            const { error: notificationError } = await supabase.from('notifications').insert(notifications);
            if (notificationError) {
              console.error('Failed to create assignment notifications:', notificationError);
              showToast('Assignment created, but failed to send notifications.', 'warning');
            }
          }
        }
      } catch (notificationError) {
        console.error('An error occurred while sending assignment notifications:', notificationError);
        showToast('Assignment created, but an error occurred sending notifications.', 'warning');
      }
      // --- End Notification Logic ---

      console.log('Assignment inserted successfully.');
      showToast('Assignment created successfully.', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast(error.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1, justifyContent: 'center' }} size="large" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.title}>Create Assignment</Text>
      <Text style={styles.screenDescription}>
        Fill in the details below to create a new assignment.
      </Text>

      <Text style={styles.inputHeading}>Select a Class</Text>
      <Text style={styles.inputDescription}>Choose the class that this assignment is for.</Text>
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

      <Text style={styles.inputHeading}>Title</Text>
      <Text style={styles.inputDescription}>A concise title for the assignment.</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter title"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.inputHeading}>Description</Text>
      <Text style={styles.inputDescription}>Provide detailed instructions for the assignment.</Text>
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

      <Text style={styles.inputHeading}>Attach a File (Optional)</Text>
      <Text style={styles.inputDescription}>You can attach a file to this assignment.</Text>
      <View style={styles.filePickerContainer}>
        <TouchableOpacity style={styles.button} onPress={pickDocument}>
          <Text style={styles.buttonText}>Pick a file</Text>
        </TouchableOpacity>
        {file && <Text style={styles.fileName}>{file.name}</Text>}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isCreating && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <View style={styles.creatingButton}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Creating assignment...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Create Assignment</Text>
          )}
        </TouchableOpacity>
      </View>
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
  filePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
  },
  fileName: {
    marginLeft: 16,
    fontSize: 16,
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a9a9a9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
});

export default CreateAssignmentScreen;
