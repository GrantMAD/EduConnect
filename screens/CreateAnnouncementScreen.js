import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Switch, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { Picker } from '@react-native-picker/picker';

export default function CreateAnnouncementScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isClassSpecific, setIsClassSpecific] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);

  const { schoolId } = useSchool();

  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId) return;
      const { data, error } = await supabase.from('classes').select('id, name').eq('school_id', schoolId);
      if (error) {
      } else {
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(data[0].id); // Set default selected class
        }
      }
    };
    fetchClasses();
  }, [schoolId]);

  const handleSaveAnnouncement = async () => {
    if (!title || !message) {
      Alert.alert('Error', 'Title and Message cannot be empty.');
      return;
    }

    if (isClassSpecific && !selectedClass) {
      Alert.alert('Error', 'Please select a class for a class-specific announcement.');
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
        Alert.alert('Error', 'School ID not available. Cannot create announcement.');
        setLoading(false);
        return;
      }

      const announcementType = isClassSpecific ? 'class' : 'general';

      const newAnnouncement = {
        title,
        message,
        school_id: schoolId, // Correctly assign schoolId from context
        posted_by: user.id,
        class_id: isClassSpecific ? selectedClass : null,
        type: announcementType, // Include the new type column
      };

      const { data: newAnnouncements, error } = await supabase
        .from('announcements')
        .insert(newAnnouncement)
        .select();

      if (error) throw error;

      // If it's a general announcement, notify all users in the school
      if (!isClassSpecific) {
        try {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id')
            .eq('school_id', schoolId);

          if (usersError) throw usersError;

          const newAnnouncementData = newAnnouncements[0];
          const notifications = users.map(u => ({
            user_id: u.id,
            type: 'new_general_announcement',
            title: 'New School Announcement',
            message: `A new announcement has been posted: "${newAnnouncementData.title}"`,
            data: { announcement_id: newAnnouncementData.id }
          }));

          if (notifications.length > 0) {
            const { error: notificationError } = await supabase.from('notifications').insert(notifications);
            if (notificationError) {
              // Log the error but don't block the user, as the announcement was created.
              console.error('Failed to create notifications:', notificationError);
              Alert.alert('Warning', 'Announcement created, but failed to send notifications.');
            }
          }
        } catch (notificationError) {
          console.error('An error occurred while sending notifications:', notificationError);
          Alert.alert('Warning', 'Announcement created, but an error occurred while sending notifications.');
        }
      } else { // It's a class-specific announcement
        try {
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('users, name')
            .eq('id', selectedClass)
            .single();

          if (classError) throw classError;

          if (classData && classData.users && classData.users.length > 0) {
            const studentIds = classData.users;
            
            // Fetch parents of the students in the class using the RPC function
            const { data: parents, error: parentsError } = await supabase
              .rpc('get_parents_of_students', { p_student_ids: studentIds });

            if (parentsError) {
              console.error('Error fetching parents via RPC:', parentsError);
              // Don't throw, just log, so students still get notified
            }

            const parentIds = parents ? parents.map(p => p.parent_id) : [];
            
            // Combine students and parents, ensuring no duplicates
            const recipientIds = [...new Set([...studentIds, ...parentIds])];

            const newAnnouncementData = newAnnouncements[0];
            const notifications = recipientIds.map(userId => ({
              user_id: userId,
              type: 'new_class_announcement',
              title: `New Announcement in ${classData.name}`,
              message: `A new announcement has been posted: "${newAnnouncementData.title}"`,
              data: { announcement_id: newAnnouncementData.id },
            }));

            if (notifications.length > 0) {
              const { error: notificationError } = await supabase.from('notifications').insert(notifications);
              if (notificationError) {
                console.error('Failed to create class notifications:', notificationError);
                Alert.alert('Warning', 'Announcement created, but failed to send class notifications.');
              }
            }
          }
        } catch (notificationError) {
          console.error('An error occurred while sending class notifications:', notificationError);
          Alert.alert('Warning', 'Announcement created, but an error occurred while sending class notifications.');
        }
      }

      Alert.alert('Success', 'Announcement created successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Create New Announcement</Text>
      <Text style={styles.description}>Fill in the details below to create a new announcement for your school.</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter announcement title"
      />

      <Text style={styles.label}>Message</Text>
      <TextInput
        style={[styles.input, styles.messageInput]}
        value={message}
        onChangeText={setMessage}
        placeholder="Enter announcement message"
        multiline
      />

      <View style={styles.switchContainer}>
        <Text style={styles.label}>Class Specific Announcement</Text>
        <Switch
          value={isClassSpecific}
          onValueChange={setIsClassSpecific}
        />
      </View>
      <Text style={[styles.description, { textAlign: 'left', marginBottom: 20 }]}>Toggle this switch if the announcement is meant for a specific class only.</Text>

      {isClassSpecific && (
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Target Class</Text>
          <Picker
            selectedValue={selectedClass}
            onValueChange={(itemValue) => setSelectedClass(itemValue)}
            style={styles.picker}
          >
            {classes.map((cls) => (
              <Picker.Item key={cls.id} label={cls.name} value={cls.id} />
            ))}
          </Picker>
        </View>
      )}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSaveAnnouncement}
        disabled={loading || !schoolId}
      >
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Announcement'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
    paddingVertical: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
