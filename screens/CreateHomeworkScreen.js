import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, FlatList, Pressable, Switch, Dimensions } from 'react-native';
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

// Import services
import { getCurrentUser } from '../services/authService';
import {
  fetchTemplates as fetchTemplatesService,
  createTemplate as createTemplateService,
  deleteTemplate as deleteTemplateService,
  fetchClassMembersIds,
  fetchParentsOfStudentsRpc,
  fetchUsersByIdsWithPreferences
} from '../services/userService';
import { fetchClassesByTeacher, fetchClassInfo } from '../services/classService';
import {
  createHomework as createHomeworkService,
  fetchHomeworkSchedules
} from '../services/homeworkService';
import { fetchGradingCategories } from '../services/gradebookService';
import { sendBatchNotifications } from '../services/notificationService';

const { width } = Dimensions.get('window');

// Memoized Sub-components to prevent unnecessary re-renders
const HeroSection = React.memo(({ onBack, onOpenTemplates, theme }) => (
  <LinearGradient
    colors={['#059669', '#0d9488']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.heroContainer}
  >
    <View style={styles.heroContent}>
      <View style={styles.heroTextContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={onBack} style={styles.backButtonHero}>
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
        onPress={onOpenTemplates}
      >
        <FontAwesomeIcon icon={faFolderOpen} size={14} color="#059669" />
        <Text style={styles.heroButtonText}>Templates</Text>
      </TouchableOpacity>
    </View>
  </LinearGradient>
));

const ClassSelection = React.memo(({
  classes,
  selectedClass,
  setSelectedClass,
  schedules,
  selectedSchedule,
  setSelectedSchedule,
  setDueDate,
  gradingCategories,
  selectedCategory,
  setSelectedCategory,
  theme
}) => (
  <>
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

    {selectedClass && gradingCategories.length > 0 && (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>GRADING CATEGORY (OPTIONAL)</Text>
        <View style={[styles.pickerWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={(itemValue) => setSelectedCategory(itemValue)}
            style={{ color: theme.colors.text }}
            dropdownIconColor={theme.colors.placeholder}
          >
            <Picker.Item label="-- None (Ungraded) --" value={null} />
            {gradingCategories.map((cat) => (
              <Picker.Item key={cat.id} label={`${cat.name} (${cat.weight}%)`} value={cat.id} />
            ))}
          </Picker>
        </View>
      </View>
    )}
  </>
));

const CalendarSection = React.memo(({ dueDate, onDayPress, theme }) => (
  <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
    <Text style={styles.cardSectionLabel}>DUE DATE</Text>

    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>SELECT DEADLINE</Text>
      <Calendar
        onDayPress={(day) => onDayPress(day.dateString)}
        hideExtraDays={true}
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
));

const CreateHomeworkScreen = ({ route }) => {
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
  const [gradingCategories, setGradingCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const navigation = useNavigation();
  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};

  const fetchTemplates = useCallback(async () => {
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;

      const data = await fetchTemplatesService(authUser.id, 'homework');
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const authUser = await getCurrentUser();

        if (authUser) {
          const data = await fetchClassesByTeacher(authUser.id);
          setClasses(data || []);
        }
      } catch (error) {
        showToast('Error fetching classes', 'error');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchTemplates();
  }, [fetchTemplates, showToast]);

  const handleSaveTemplate = useCallback(async () => {
    if (!subject || !description) {
      showToast('Subject and description are required for a template.', 'error');
      return;
    }

    setIsSavingTemplate(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) throw new Error('No user logged in');

      await createTemplateService({
        user_id: authUser.id,
        school_id: schoolId,
        type: 'homework',
        title: subject,
        subject: subject,
        description: description
      });

      showToast('Template saved!', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      showToast('Failed to save template.', 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  }, [subject, description, schoolId, fetchTemplates, showToast]);

  const applyTemplate = useCallback((template) => {
    setSubject(template.subject || template.title || '');
    setDescription(template.description || '');
    setIsTemplatesModalVisible(false);
    showToast('Template applied!', 'success');
  }, [showToast]);

  const deleteTemplate = useCallback(async (templateId) => {
    try {
      await deleteTemplateService(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      showToast('Template deleted.', 'success');
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast('Failed to delete template.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedClass) {
      const fetchSchedulesData = async () => {
        try {
          const [schedulesData, categoriesData] = await Promise.all([
            fetchHomeworkSchedules(selectedClass),
            fetchGradingCategories(selectedClass)
          ]);
          setSchedules(schedulesData || []);
          setGradingCategories(categoriesData || []);
        } catch (error) {
          showToast('Could not fetch class data.', 'error');
          console.error(error);
        }
      };
      fetchSchedulesData();
    } else {
      setGradingCategories([]);
      setSelectedCategory(null);
    }
  }, [selectedClass, showToast]);

  const handleCreate = useCallback(async () => {
    if (!selectedClass || !subject || !description || !dueDate) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) throw new Error('No user logged in');

      const newHomework = await createHomeworkService({
        school_id: schoolId,
        class_id: selectedClass,
        subject,
        description,
        due_date: dueDate,
        created_by: authUser.id,
        grading_category_id: selectedCategory || null,
      });

      try {
        const classInfo = await fetchClassInfo(selectedClass);
        const studentIds = await fetchClassMembersIds(selectedClass, 'student');

        if (studentIds && studentIds.length > 0) {
          const parents = await fetchParentsOfStudentsRpc(studentIds);

          const parentIds = parents ? parents.map(p => p.parent_id) : [];
          const recipientIds = [...new Set([...studentIds, ...parentIds])];

          const recipientsData = await fetchUsersByIdsWithPreferences(recipientIds);

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
              is_read: false,
            }));

            if (notifications.length > 0) {
              await sendBatchNotifications(notifications);
            }
          }
        }
      } catch (e) {
        console.error(e);
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
  }, [selectedClass, subject, description, dueDate, schoolId, awardXP, navigation, showToast]);

  const openTemplatesModal = useCallback(() => setIsTemplatesModalVisible(true), []);
  const closeTemplatesModal = useCallback(() => setIsTemplatesModalVisible(false), []);
  const handleNavBack = useCallback(() => navigation.goBack(), [navigation]);

  if (loading) {
    return <CreateHomeworkScreenSkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <HeroSection
        onBack={handleNavBack}
        onOpenTemplates={openTemplatesModal}
        theme={theme}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <Text style={styles.cardSectionLabel}>ASSIGNMENT DETAILS</Text>

          <ClassSelection
            classes={classes}
            selectedClass={selectedClass}
            setSelectedClass={setSelectedClass}
            schedules={schedules}
            selectedSchedule={selectedSchedule}
            setSelectedSchedule={setSelectedSchedule}
            setDueDate={setDueDate}
            gradingCategories={gradingCategories}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            theme={theme}
          />

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>SUBJECT</Text>
              <Text style={styles.charCount}>{subject.length}/100</Text>
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, paddingHorizontal: 0, paddingTop: 0 }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, height: '100%', width: '100%', paddingHorizontal: 16, includeFontPadding: false }]}
                placeholder="e.g. Mathematics"
                placeholderTextColor={theme.colors.placeholder}
                value={subject}
                onChangeText={setSubject}
                autoCorrect={false}
                underlineColorAndroid="transparent"
                blurOnSubmit={false}
                maxLength={100}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>DESCRIPTION</Text>
              <Text style={styles.charCount}>{description.length}/1000</Text>
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, minHeight: 120, height: 'auto', paddingHorizontal: 0, paddingTop: 0, justifyContent: 'flex-start' }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, width: '100%', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, includeFontPadding: false }]}
                placeholder="Describe the homework..."
                placeholderTextColor={theme.colors.placeholder}
                value={description}
                onChangeText={setDescription}
                multiline
                scrollEnabled={false}
                textAlignVertical="top"
                autoCorrect={false}
                underlineColorAndroid="transparent"
                blurOnSubmit={false}
                maxLength={1000}
              />
            </View>
          </View>
        </View>

        <CalendarSection
          dueDate={dueDate}
          onDayPress={setDueDate}
          theme={theme}
        />

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
        onRequestClose={closeTemplatesModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.cardBorder }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Homework Templates</Text>
              <TouchableOpacity onPress={closeTemplatesModal}>
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

export default React.memo(CreateHomeworkScreen);

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