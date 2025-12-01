import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faSave, faCalendarAlt, faBook, faClipboardList, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';
import { useSchool } from '../context/SchoolContext';
import CreateHomeworkScreenSkeleton from '../components/skeletons/CreateHomeworkScreenSkeleton';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useGamification } from '../context/GamificationContext';

export default function CreateHomeworkScreen({ route }) {
  const { fromDashboard } = route.params || {};
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const navigation = useNavigation();
  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { data: newHomework, error } = await supabase.from('homework').insert([
        {
          school_id: schoolId,
          class_id: selectedClass,
          subject,
          description,
          due_date: dueDate,
          created_by: user.id,
        },
      ]).select().single();

      if (error) throw error;

      // Notification Logic
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
            const prefs = u.notification_preferences;
            return !prefs || prefs.homework !== false;
          });

          const notifications = finalRecipients.map(u => ({
            user_id: u.id,
            type: 'new_homework',
            title: `New Homework for ${classInfo?.name || 'Class'}`,
            message: `A new piece of homework has been set: "${newHomework.subject}"`,
            data: { homework_id: newHomework.id }
          }));

          if (notifications.length > 0) {
            await supabase.from('notifications').insert(notifications);
          }
        }
      }

      awardXP('content_creation', 20);
      showToast('Homework created successfully! +20 XP', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating homework:', error.message);
      showToast('Failed to create homework.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <CreateHomeworkScreenSkeleton />;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesomeIcon icon={faChevronLeft} size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>New Homework</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Select Class</Text>
        <View style={[styles.pickerWrapper, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}>
          <Picker
            selectedValue={selectedClass}
            onValueChange={(itemValue) => setSelectedClass(itemValue)}
            style={{ color: theme.colors.text }}
            dropdownIconColor={theme.colors.text}
          >
            <Picker.Item label="-- Select a class --" value={null} />
            {classes.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id} />
            ))}
          </Picker>
        </View>
      </View>

      {selectedClass && (
        <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Select Class Day (Optional)</Text>
          <View style={[styles.pickerWrapper, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}>
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
              style={{ color: theme.colors.text }}
              dropdownIconColor={theme.colors.text}
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
        </View>
      )}

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <FontAwesomeIcon icon={faBook} size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
          <Text style={[styles.label, { color: theme.colors.text }]}>Subject</Text>
        </View>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}
          placeholder="e.g., Mathematics, History"
          placeholderTextColor={theme.colors.placeholder}
          value={subject}
          onChangeText={setSubject}
        />
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <FontAwesomeIcon icon={faClipboardList} size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
          <Text style={[styles.label, { color: theme.colors.text }]}>Description</Text>
        </View>
        <TextInput
          style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}
          placeholder="Enter homework details..."
          placeholderTextColor={theme.colors.placeholder}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={[styles.inputGroup, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <FontAwesomeIcon icon={faCalendarAlt} size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
          <Text style={[styles.label, { color: theme.colors.text }]}>Due Date</Text>
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreate}
          disabled={isCreating}
        >
          {isCreating ? (
            <Text style={[styles.createButtonText, { color: theme.colors.buttonPrimaryText }]}>Creating...</Text>
          ) : (
            <>
              <FontAwesomeIcon icon={faSave} size={18} color={theme.colors.buttonPrimaryText} style={{ marginRight: 10 }} />
              <Text style={[styles.createButtonText, { color: theme.colors.buttonPrimaryText }]}>Assign Homework</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
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
    minHeight: 100,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  calendar: {
    marginBottom: 10,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  createButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});