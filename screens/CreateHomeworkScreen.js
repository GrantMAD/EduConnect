import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, FlatList, Pressable, Switch, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faSave, faCalendarAlt, faBook, faClipboardList, faChevronLeft, faFolderOpen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';
import { useSchool } from '../context/SchoolContext';
import CreateHomeworkScreenSkeleton from '../components/skeletons/CreateHomeworkScreenSkeleton';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { useGamification } from '../context/GamificationContext';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

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
  const [templates, setTemplates] = useState([]);
  const [isTemplatesModalVisible, setIsTemplatesModalVisible] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

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
          setClasses(data || []);
        }
      }
      setLoading(false);
    };

    fetchData();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'homework')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!subject || !description) {
      showToast('Subject and description are required for a template.', 'error');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      const { error } = await supabase.from('templates').insert([
        {
          user_id: user.id,
          school_id: schoolId,
          type: 'homework',
          title: subject,
          subject: subject,
          description: description
        }
      ]);

      if (error) throw error;
      showToast('Template saved!', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      showToast('Failed to save template.', 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const applyTemplate = (template) => {
    setSubject(template.subject || template.title || '');
    setDescription(template.description || '');
    setIsTemplatesModalVisible(false);
    showToast('Template applied!', 'success');
  };

  const deleteTemplate = async (templateId) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      setTemplates(templates.filter(t => t.id !== templateId));
      showToast('Template deleted.', 'success');
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast('Failed to delete template.', 'error');
    }
  };

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
          setSchedules(data || []);
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#059669', '#0d9488']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHero}>
                        <FontAwesomeIcon icon={faChevronLeft} size={18} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.heroTitle}>New Homework</Text>
                </View>
                <Text style={styles.heroDescription}>
                    Assign tasks and study materials to your students.
                </Text>
            </View>
            <TouchableOpacity
                style={styles.heroButton}
                onPress={() => setIsTemplatesModalVisible(true)}
            >
                <FontAwesomeIcon icon={faFolderOpen} size={14} color="#059669" />
                <Text style={styles.heroButtonText}>Templates</Text>
            </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Text style={styles.cardSectionLabel}>ASSIGNMENT DETAILS</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SELECT CLASS</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <Picker
                        selectedValue={selectedClass}
                        onValueChange={(itemValue) => setSelectedClass(itemValue)}
                        style={{ color: theme.colors.text }}
                        dropdownIconColor={theme.colors.placeholder}
                    >
                        <Picker.Item label="Choose a class..." value={null} />
                        {classes.map((c) => (
                        <Picker.Item key={c.id} label={c.name} value={c.id} />
                        ))}
                    </Picker>
                </View>
            </View>

            {selectedClass && (
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>SELECT CLASS DAY (OPTIONAL)</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
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
                            dropdownIconColor={theme.colors.placeholder}
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

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>SUBJECT</Text>
                    <Text style={styles.charCount}>{subject.length}/100</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="e.g. Mathematics"
                        placeholderTextColor={theme.colors.placeholder}
                        value={subject}
                        onChangeText={setSubject}
                        maxLength={100}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>DESCRIPTION</Text>
                    <Text style={styles.charCount}>{description.length}/1000</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, height: 120, alignItems: 'flex-start', paddingTop: 12 }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, height: 100 }]}
                        placeholder="Describe the homework..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        textAlignVertical="top"
                        maxLength={1000}
                    />
                </View>
            </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
            <Text style={styles.cardSectionLabel}>DUE DATE</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SELECT DEADLINE</Text>
                <Calendar
                    onDayPress={(day) => setDueDate(day.dateString)}
                    markedDates={{
                        [dueDate]: { selected: true, marked: true, selectedColor: theme.colors.primary },
                    }}
                    theme={{
                        backgroundColor: theme.colors.card,
                        calendarBackground: theme.colors.card,
                        textSectionTitleColor: theme.colors.text,
                        selectedDayBackgroundColor: theme.colors.primary,
                        selectedDayTextColor: '#fff',
                        todayTextColor: theme.colors.primary,
                        dayTextColor: theme.colors.text,
                        textDisabledColor: theme.colors.placeholder,
                        dotColor: theme.colors.primary,
                        selectedDotColor: '#fff',
                        arrowColor: theme.colors.primary,
                        monthTextColor: theme.colors.text,
                    }}
                    style={styles.calendar}
                />
            </View>
        </View>

        <TouchableOpacity 
            style={[styles.createBtnContainer, { marginTop: 30 }]} 
            onPress={handleCreate} 
            disabled={isCreating}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#059669', '#0d9488']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createBtn}
            >
                {isCreating ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <FontAwesomeIcon icon={faSave} size={16} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.createBtnText}>Assign Homework</Text>
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.templateActionBtn, { borderColor: theme.colors.primary + '40', borderWidth: 1, borderStyle: 'dashed' }]}
            onPress={handleSaveTemplate}
            disabled={isSavingTemplate}
        >
            {isSavingTemplate ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
                <>
                    <FontAwesomeIcon icon={faSave} size={14} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.templateActionText, { color: theme.colors.primary }]}>Save as Template</Text>
                </>
            )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={isTemplatesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsTemplatesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Homework Templates</Text>
              <TouchableOpacity onPress={() => setIsTemplatesModalVisible(false)}>
                <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.templateItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => applyTemplate(item)}>
                    <Text style={[styles.templateTitle, { color: theme.colors.text }]}>{item.subject || item.title}</Text>
                    <Text style={[styles.templateDescription, { color: theme.colors.placeholder }]} numberOfLines={2}>
                      {item.description || 'No description provided'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTemplate(item.id)} style={styles.deleteBtn}>
                    <FontAwesomeIcon icon={faTrash} size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyTemplates}>
                  <FontAwesomeIcon icon={faFolderOpen} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No templates saved yet.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: {
    padding: 24,
    paddingTop: 40,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  heroTextContainer: {
      flex: 1,
      paddingRight: 10,
  },
  heroTitle: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '900',
      marginBottom: 8,
      letterSpacing: -1,
  },
  heroDescription: {
      color: '#d1fae5',
      fontSize: 14,
      fontWeight: '500',
  },
  backButtonHero: { marginRight: 12 },
  heroButton: {
      backgroundColor: '#fff',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
  },
  heroButtonText: {
      color: '#059669',
      fontWeight: 'bold',
      marginLeft: 6,
      fontSize: 14,
  },
  card: { padding: 24, borderRadius: 32 },
  cardSectionLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: '#94a3b8',
      letterSpacing: 1.5,
      marginBottom: 20,
  },
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  charCount: { fontSize: 10, fontWeight: '700', color: '#cbd5e1' },
  inputWrapper: { borderRadius: 16, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  input: { fontSize: 15, fontWeight: '600' },
  pickerWrapper: { borderRadius: 16, overflow: 'hidden' },
  calendar: { borderRadius: 16, overflow: 'hidden' },
  createBtnContainer: { marginBottom: 16 },
  createBtn: { height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  templateActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, marginHorizontal: 20 },
  templateActionText: { fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  templateItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12 },
  templateTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  templateDescription: { fontSize: 12, fontWeight: '500' },
  deleteBtn: { padding: 8 },
  emptyTemplates: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '600' },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  templatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 10,
  },
  templatesButtonText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
});
