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
import { useGamification } from '../context/GamificationContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faChevronLeft, faCloudUploadAlt, faFileAlt, faSave, faCalendarAlt, faBook, faAlignLeft } from '@fortawesome/free-solid-svg-icons';
import CreateAssignmentScreenSkeleton from '../components/skeletons/CreateAssignmentScreenSkeleton';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CreateAssignmentScreen = ({ navigation, route }) => {
  const { fromDashboard } = route.params || {};
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
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
        // Fetch class name
        const { data: classInfo, error: classInfoError } = await supabase
          .from('classes')
          .select('name')
          .eq('id', selectedClass)
          .single();
        if (classInfoError) throw classInfoError;

        // Fetch students from the class
        const { data: members, error: membersError } = await supabase
          .from('class_members')
          .select('user_id')
          .eq('class_id', selectedClass)
          .eq('role', 'student');
        if (membersError) throw membersError;

        if (members && members.length > 0) {
          const studentIds = members.map(m => m.user_id);

          const { data: parents, error: parentsError } = await supabase
            .rpc('get_parents_of_students', { p_student_ids: studentIds });

          if (parentsError) {
            console.error('Error fetching parents via RPC for assignment notification:', parentsError);
          }

          const parentIds = parents ? parents.map(p => p.parent_id) : [];
          const recipientIds = [...new Set([...studentIds, ...parentIds])];

          if (recipientIds.length > 0) {
            // Fetch preferences for all potential recipients
            const { data: recipientsData, error: recipientsError } = await supabase
              .from('users')
              .select('id, notification_preferences')
              .in('id', recipientIds);

            if (recipientsError) throw recipientsError;

            // Filter based on preferences (using 'homework' preference for assignments as well)
            const finalRecipients = recipientsData.filter(u => {
              const prefs = u.notification_preferences;
              return !prefs || prefs.homework !== false;
            });

            const notifications = finalRecipients.map(userId => ({
              user_id: userId.id,
              type: 'new_assignment',
              title: `New Assignment for ${classInfo.name}`,
              message: `A new assignment has been posted: "${newAssignment.title}"`,
              data: { assignment_id: newAssignment.id }
            }));

            if (notifications.length > 0) {
              const { error: notificationError } = await supabase.from('notifications').insert(notifications);
              if (notificationError) {
                console.error('Failed to create assignment notifications:', notificationError);
                showToast('Assignment created, but failed to send notifications.', 'warning');
              }
            }
          }
        }
      } catch (notificationError) {
        console.error('An error occurred while sending assignment notifications:', notificationError);
        showToast('Assignment created, but an error occurred sending notifications.', 'warning');
      }
      // --- End Notification Logic ---

      awardXP('content_creation', 30);
      showToast('Assignment created successfully! +30 XP', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating assignment:', error);
      showToast('Failed to create assignment.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        setFile(result.assets[0]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  if (loading) {
    return <CreateAssignmentScreenSkeleton />;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 50 + insets.bottom }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBackButton}>
        <FontAwesomeIcon icon={faChevronLeft} size={16} color={theme.colors.primary} />
        <Text style={[styles.backText, { color: theme.colors.primary }]}>Back</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>New Assignment</Text>
      </View>

      <Text style={[styles.screenDescription, { color: theme.colors.placeholder }]}>
        Create a new assignment for your students. You can attach files and set a due date.
      </Text>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.inputHeading, { color: theme.colors.text }]}>Select Class</Text>
        <View style={[styles.pickerContainer, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}>
          <Picker
            selectedValue={selectedClass}
            onValueChange={(itemValue) => setSelectedClass(itemValue)}
            style={[styles.picker, { color: theme.colors.text }]}
            dropdownIconColor={theme.colors.text}
          >
            <Picker.Item label="-- Select a class --" value={null} />
            {classes.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <FontAwesomeIcon icon={faBook} size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.inputHeading, { color: theme.colors.text, marginTop: 0 }]}>Title</Text>
        </View>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}
          placeholder="Assignment Title"
          placeholderTextColor={theme.colors.placeholder}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <FontAwesomeIcon icon={faAlignLeft} size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.inputHeading, { color: theme.colors.text, marginTop: 0 }]}>Description</Text>
        </View>
        <TextInput
          style={[styles.input, styles.descriptionInput, { color: theme.colors.text, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}
          placeholder="Assignment Description"
          placeholderTextColor={theme.colors.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
          <FontAwesomeIcon icon={faCalendarAlt} size={16} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.inputHeading, { color: theme.colors.text, marginTop: 0 }]}>Due Date</Text>
        </View>
        <Calendar
          onDayPress={(day) => setDueDate(day.dateString)}
          markedDates={{
            [dueDate]: { selected: true, marked: true, selectedColor: theme.colors.primary },
          }}
          theme={{
            backgroundColor: theme.colors.surface,
            calendarBackground: theme.colors.surface,
            textSectionTitleColor: theme.colors.text,
            selectedDayBackgroundColor: theme.colors.primary,
            selectedDayTextColor: theme.colors.buttonPrimaryText,
            todayTextColor: theme.colors.primary,
            dayTextColor: theme.colors.text,
            textDisabledColor: theme.colors.placeholder,
            dotColor: theme.colors.primary,
            selectedDotColor: theme.colors.buttonPrimaryText,
            arrowColor: theme.colors.primary,
            monthTextColor: theme.colors.text,
            indicatorColor: theme.colors.primary,
          }}
          style={styles.calendar}
        />
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.inputHeading, { color: theme.colors.text }]}>Attachment (Optional)</Text>
        <TouchableOpacity onPress={pickDocument} style={styles.filePickerContainer}>
          <FontAwesomeIcon icon={faCloudUploadAlt} size={24} color={theme.colors.primary} />
          <Text style={[styles.fileName, { color: theme.colors.text }]}>{file ? file.name : 'Select a file'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, isCreating && styles.buttonDisabled, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreate}
        disabled={isCreating}
      >
        {isCreating ? (
          <View style={styles.creatingButton}>
            <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Creating...</Text>
          </View>
        ) : (
          <View style={styles.creatingButton}>
            <FontAwesomeIcon icon={faSave} size={18} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Create Assignment</Text>
          </View>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  topBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    alignSelf: 'flex-start',
    padding: 5,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  screenDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  inputHeading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 10,
  },
  inputDescription: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 5,
    overflow: 'hidden',
  },
  picker: {},
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  filePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5,
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  fileName: {
    marginLeft: 16,
    fontSize: 16,
    flexShrink: 1,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendar: {
    marginBottom: 10,
  },

});

export default CreateAssignmentScreen;
