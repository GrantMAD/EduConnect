import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faArrowLeft, faPaperPlane, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

export default function CreateAnnouncementScreen({ route }) {
  const { fromDashboard } = route.params || {};
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClassSpecific, setIsClassSpecific] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);

  const navigation = useNavigation();
  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId) return;
      const { data, error } = await supabase.from('classes').select('id, name').eq('school_id', schoolId);
      if (error) {
        console.error('Error fetching classes:', error);
      } else {
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(data[0].id);
        }
      }
    };
    fetchClasses();
  }, [schoolId]);

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('Title and Message cannot be empty.', 'error');
      return;
    }

    if (isClassSpecific && !selectedClass) {
      showToast('Please select a class.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const announcementType = isClassSpecific ? 'class' : 'general';

      const { data: newAnnouncements, error } = await supabase.from('announcements').insert([
        {
          school_id: schoolId,
          title,
          message,
          type: announcementType,
          class_id: isClassSpecific ? selectedClass : null,
          posted_by: user.id,
        },
      ]).select();

      if (error) throw error;

      // Notification Logic
      if (!isClassSpecific) {
        // General Announcement Notifications
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, notification_preferences')
          .eq('school_id', schoolId);

        if (!usersError) {
          const newAnnouncementData = newAnnouncements[0];
          const recipients = users.filter(u => {
            // Exclude the creator
            if (u.id === user.id) return false;
            // Check notification preferences
            const prefs = u.notification_preferences;
            return !prefs || prefs.announcements !== false;
          });

          const notifications = recipients.map(u => ({
            user_id: u.id,
            type: 'new_general_announcement',
            title: 'New School Announcement',
            message: `A new announcement has been posted: "${newAnnouncementData.title}"`,
            data: { announcement_id: newAnnouncementData.id }
          }));

          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
          }
        }
      } else {
        // Class Specific Notifications
        const { data: classInfo } = await supabase
          .from('classes')
          .select('name')
          .eq('id', selectedClass)
          .single();

        const { data: members } = await supabase
          .from('class_members')
          .select('user_id')
          .eq('class_id', selectedClass)
          .eq('role', 'student');

        if (members && members.length > 0) {
          const studentIds = members.map(m => m.user_id);
          const { data: parents } = await supabase
            .rpc('get_parents_of_students', { p_student_ids: studentIds });

          const parentIds = parents ? parents.map(p => p.parent_id) : [];
          const recipientIds = [...new Set([...studentIds, ...parentIds])];

          const { data: recipientsData } = await supabase
            .from('users')
            .select('id, notification_preferences')
            .in('id', recipientIds);

          if (recipientsData) {
            const finalRecipients = recipientsData.filter(u => {
              // Exclude the creator
              if (u.id === user.id) return false;
              // Check notification preferences
              const prefs = u.notification_preferences;
              return !prefs || prefs.announcements !== false;
            });

            const newAnnouncementData = newAnnouncements[0];
            const notifications = finalRecipients.map(u => ({
              user_id: u.id,
              type: 'new_class_announcement',
              title: `New Announcement in ${classInfo?.name || 'Class'}`,
              message: `A new announcement has been posted: "${newAnnouncementData.title}"`,
              data: { announcement_id: newAnnouncementData.id },
            }));

            if (notifications.length > 0) {
              await supabase.from('notifications').insert(notifications);
            }
          }
        }
      }

      showToast('Announcement created successfully!', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating announcement:', error.message);
      showToast('Failed to create announcement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 40 + insets.bottom }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <FontAwesomeIcon icon={faArrowLeft} size={20} color={theme.colors.primary} />
        <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>Back to Announcements</Text>
      </TouchableOpacity>

      <Text style={[styles.headerTitle, { color: theme.colors.text }]}>New Announcement</Text>
      <Text style={{ fontSize: 14, color: theme.colors.textSecondary || theme.colors.placeholder, marginBottom: 20, marginTop: -15 }}>
        Create a new announcement for the school or a specific class.
      </Text>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Title</Text>
          <Text style={[styles.charCount, { color: theme.colors.placeholder }]}>{title.length}/100</Text>
        </View>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}
          placeholder="Enter title"
          placeholderTextColor={theme.colors.placeholder}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Message</Text>
          <Text style={[styles.charCount, { color: theme.colors.placeholder }]}>{message.length}/1000</Text>
        </View>
        <TextInput
          style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}
          placeholder="Write your announcement here..."
          placeholderTextColor={theme.colors.placeholder}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={styles.switchContainer}>
          <Text style={[styles.label, { color: theme.colors.text, marginBottom: 0 }]}>Class Specific</Text>
          <Switch
            value={isClassSpecific}
            onValueChange={setIsClassSpecific}
            trackColor={{ false: "#767577", true: theme.colors.primary }}
            thumbColor={isClassSpecific ? "#fff" : "#f4f3f4"}
          />
        </View>

        {isClassSpecific && (
          <View style={styles.pickerContainer}>
            <Text style={[styles.subLabel, { color: theme.colors.text }]}>Select Class</Text>
            <View style={[styles.pickerWrapper, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}>
              <Picker
                selectedValue={selectedClass}
                onValueChange={(itemValue) => setSelectedClass(itemValue)}
                style={{ color: theme.colors.text }}
                dropdownIconColor={theme.colors.text}
              >
                {classes.map((cls) => (
                  <Picker.Item key={cls.id} label={cls.name} value={cls.id} />
                ))}
              </Picker>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <Text style={[styles.createButtonText, { color: theme.colors.buttonPrimaryText }]}>Posting...</Text>
        ) : (
          <>
            <FontAwesomeIcon icon={faPaperPlane} size={18} color={theme.colors.buttonPrimaryText} style={{ marginRight: 10 }} />
            <Text style={[styles.createButtonText, { color: theme.colors.buttonPrimaryText }]}>Post Announcement</Text>
          </>
        )}
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
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    marginBottom: 10,
  },
  subLabel: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerContainer: {
    marginTop: 10,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  createButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
