import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { Calendar } from 'react-native-calendars';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useToast } from '../context/ToastContext';
import { useSchool } from '../context/SchoolContext';
import { useGamification } from '../context/GamificationContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faChevronLeft, faCloudUploadAlt, faFileAlt, faSave, faCalendarAlt, faBook, faAlignLeft, faFolderOpen, faTrash, faTimes, faClipboardList } from '@fortawesome/free-solid-svg-icons';
import CreateAssignmentScreenSkeleton from '../components/skeletons/CreateAssignmentScreenSkeleton';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

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
  const { schoolId } = useSchool();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [templates, setTemplates] = useState([]);
  const [isTemplatesModalVisible, setIsTemplatesModalVisible] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

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
        .eq('type', 'assignment')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!title || !description) {
      showToast('Title and description are required for a template.', 'error');
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
          type: 'assignment',
          title: title,
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
    setTitle(template.title || '');
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

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('assignments')
          .getPublicUrl(filePath);

        if (!publicUrlData) throw new Error('Error getting public URL');

        file_url = publicUrlData.publicUrl;
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

      if (error) throw error;

      try {
        const { data: classInfo, error: classInfoError } = await supabase
          .from('classes')
          .select('name')
          .eq('id', selectedClass)
          .single();
        if (classInfoError) throw classInfoError;

        const { data: members, error: membersError } = await supabase
          .from('class_members')
          .select('user_id')
          .eq('class_id', selectedClass)
          .eq('role', 'student');
        if (membersError) throw membersError;

        if (members && members.length > 0) {
          const studentIds = members.map(m => m.user_id);

          const { data: parents } = await supabase
            .rpc('get_parents_of_students', { p_student_ids: studentIds });

          const parentIds = parents ? parents.map(p => p.parent_id) : [];
          const recipientIds = [...new Set([...studentIds, ...parentIds])];

          if (recipientIds.length > 0) {
            const { data: recipientsData } = await supabase
              .from('users')
              .select('id, notification_preferences')
              .in('id', recipientIds);

            if (recipientsData) {
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
                await supabase.from('notifications').insert(notifications);
              }
            }
          }
        }
      } catch (e) {
        console.error(e);
      }

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#4f46e5', '#7c3aed']} 
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
                    <Text style={styles.heroTitle}>New Assignment</Text>
                </View>
                <Text style={styles.heroDescription}>
                    Create a new assignment for your students.
                </Text>
            </View>
            <TouchableOpacity
                style={styles.heroButton}
                onPress={() => setIsTemplatesModalVisible(true)}
            >
                <FontAwesomeIcon icon={faFolderOpen} size={14} color="#4f46e5" />
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

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>TITLE</Text>
                    <Text style={styles.charCount}>{title.length}/100</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="e.g. History Project"
                        placeholderTextColor={theme.colors.placeholder}
                        value={title}
                        onChangeText={setTitle}
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
                        placeholder="Describe the assignment..."
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
            <Text style={styles.cardSectionLabel}>DUE DATE & ATTACHMENTS</Text>
            
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

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ATTACHMENT (OPTIONAL)</Text>
                <TouchableOpacity onPress={pickDocument} style={[styles.filePicker, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderStyle: 'dashed', borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faCloudUploadAlt} size={20} color={theme.colors.primary} />
                    <Text style={[styles.fileName, { color: theme.colors.text }]}>{file ? file.name : 'Select a file'}</Text>
                </TouchableOpacity>
            </View>
        </View>

        <TouchableOpacity 
            style={[styles.createBtnContainer, { marginTop: 30 }]} 
            onPress={handleCreate} 
            disabled={isCreating}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createBtn}
            >
                {isCreating ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <FontAwesomeIcon icon={faSave} size={16} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.createBtnText}>Create Assignment</Text>
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
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Assignment Templates</Text>
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
                    <Text style={[styles.templateTitle, { color: theme.colors.text }]}>{item.title}</Text>
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
};

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
      color: '#e0e7ff',
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
      color: '#4f46e5',
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
  filePicker: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginTop: 8 },
  fileName: { marginLeft: 12, fontSize: 14, fontWeight: '700' },
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
  screenDescription: {
    fontSize: 14,
    marginBottom: 20,
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

export default CreateAssignmentScreen;
