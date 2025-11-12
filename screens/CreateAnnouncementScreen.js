import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { Picker } from '@react-native-picker/picker';
import { useToast } from '../context/ToastContext';

export default function CreateAnnouncementScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isClassSpecific, setIsClassSpecific] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

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
      showToast('Title and Message cannot be empty.', 'error');
      return;
    }

    if (isClassSpecific && !selectedClass) {
      showToast('Please select a class for a class-specific announcement.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('User not authenticated.', 'error');
        setLoading(false);
        return;
      }

      if (!schoolId) {
        showToast('School ID not available. Cannot create announcement.', 'error');
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
              showToast('Announcement created, but failed to send notifications.', 'warning');
            }
          }
        } catch (notificationError) {
          console.error('An error occurred while sending notifications:', notificationError);
          showToast('Announcement created, but an error occurred while sending notifications.', 'warning');
        }
      } else { // It's a class-specific announcement
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
            
            // Fetch parents of the students in the class using the RPC function
            const { data: parents, error: parentsError } = await supabase
              .rpc('get_parents_of_students', { p_student_ids: studentIds });

            if (parentsError) {
              console.error('Error fetching parents via RPC:', parentsError);
            }

            const parentIds = parents ? parents.map(p => p.parent_id) : [];
            
            // Combine students and parents, ensuring no duplicates
            const recipientIds = [...new Set([...studentIds, ...parentIds])];

            const newAnnouncementData = newAnnouncements[0];
            const notifications = recipientIds.map(userId => ({
              user_id: userId,
              type: 'new_class_announcement',
              title: `New Announcement in ${classInfo.name}`,
              message: `A new announcement has been posted: "${newAnnouncementData.title}"`,
              data: { announcement_id: newAnnouncementData.id },
            }));

            if (notifications.length > 0) {
              const { error: notificationError } = await supabase.from('notifications').insert(notifications);
              if (notificationError) {
                console.error('Failed to create class notifications:', notificationError);
                showToast('Announcement created, but failed to send class notifications.', 'warning');
              }
            }
          }
        } catch (notificationError) {
          console.error('An error occurred while sending class notifications:', notificationError);
          showToast('Announcement created, but an error occurred while sending class notifications.', 'warning');
        }
      }

      showToast('Announcement created successfully!', 'success');
      navigation.goBack();
    } catch (error) {
      showToast('Failed to create announcement.', 'error');
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
