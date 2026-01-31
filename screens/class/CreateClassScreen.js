import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Button, Platform, ScrollView, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSchool } from '../../context/SchoolContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlusCircle, faMinusCircle, faUser, faClock, faArrowLeft, faChevronLeft, faChalkboardTeacher, faBookOpen, faSearch, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
const defaultUserImage = require('../../assets/user.png');
import TimetableManager from '../../components/TimetableManager';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../../services/authService';
import { fetchUsersBySchool, fetchUsersByIdsWithPreferences } from '../../services/userService';
import {
  createClass as createClassService,
  createClassMembers,
  createClassSchedules
} from '../../services/classService';
import { sendBatchNotifications } from '../../services/notificationService';

const { width } = Dimensions.get('window');

const CreateClassScreen = ({ navigation, route }) => {
  const { fromDashboard, fromManageClassesScreen } = route.params || {};
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [filterByGrade, setFilterByGrade] = useState(true);
  const [loading, setLoading] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const [schedules, setSchedules] = useState([]);

  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const fetchStudents = useCallback(async () => {
    setFetchingStudents(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;

      const data = await fetchUsersBySchool(schoolId, { role: 'student' });

      setAllStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error.message);
      showToast('Failed to fetch students.', 'error');
    } finally {
      setFetchingStudents(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [schoolId, fetchStudents]);

  useEffect(() => {
    let filtered = allStudents;

    // Apply search query
    if (searchQuery !== '') {
      filtered = filtered.filter(student =>
        student.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply grade filter strictly (Teacher MUST select grade first)
    if (selectedGrade) {
      filtered = filtered.filter(student => student.grade === selectedGrade);
    } else {
      // If no grade selected, don't show any students
      filtered = [];
    }

    setStudents(filtered);
  }, [searchQuery, allStudents, selectedGrade]);

  const toggleStudentSelection = useCallback((studentId) => {
    setSelectedStudents(prev => {
      const isSelected = prev.includes(studentId);
      if (isSelected) {
        return prev.filter(id => id !== studentId);
      } else {
        setSearchQuery('');
        return [...prev, studentId];
      }
    });
  }, []);



  const handleCreateClass = useCallback(async () => {
    if (!className || !subject) {
      showToast('Class Name and Subject cannot be empty.', 'error');
      return;
    }

    setLoading(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser || !schoolId) throw new Error('Auth session invalid');

      const newClass = await createClassService({
        name: className,
        subject: subject,
        grade: selectedGrade,
        school_id: schoolId,
        teacher_id: authUser.id
      });

      if (selectedStudents.length > 0) {
        const classMembersToInsert = selectedStudents.map(studentId => ({
          class_id: newClass.id,
          user_id: studentId,
          school_id: schoolId,
          role: 'student',
        }));

        await createClassMembers(classMembersToInsert);

        const recipientsData = await fetchUsersByIdsWithPreferences(selectedStudents);

        if (recipientsData) {
          const finalRecipients = recipientsData.filter(u => {
            const prefs = u.notification_preferences;
            return !prefs || prefs.classSchedule !== false;
          });

          const notifications = finalRecipients.map(student => ({
            user_id: student.id,
            type: 'added_to_class',
            title: 'Added to New Class',
            message: `You have been added to the class: ${newClass.name}`,
            is_read: false,
          }));

          if (notifications.length > 0) {
            await sendBatchNotifications(notifications);
          }
        }
      }

      if (schedules.length > 0) {
        const scheduleToInsert = schedules.map(schedule => ({
          class_id: newClass.id,
          start_time: schedule.startTime.toISOString(),
          end_time: schedule.endTime.toISOString(),
          title: className,
          description: subject,
          class_info: schedule.info,
          school_id: schoolId,
          created_by: authUser.id,
        }));

        await createClassSchedules(scheduleToInsert);
      }

      showToast(`Class '${className}' created successfully!`, 'success');
      navigation.goBack();
    } catch (error) {
      console.error(error);
      showToast('Failed to create class.', 'error');
    } finally {
      setLoading(false);
    }
  }, [className, subject, schoolId, selectedStudents, schedules, navigation, showToast]);



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
              <Text style={styles.heroTitle}>Create Class</Text>
            </View>
            <Text style={styles.heroDescription}>
              Establish a new course and manage your student roster.
            </Text>
          </View>
          <View style={styles.iconBoxHero}>
            <FontAwesomeIcon icon={faBookOpen} size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <Text style={styles.cardSectionLabel}>CLASS IDENTITY</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>OFFICIAL NAME</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="e.g. Mathematics 101"
                placeholderTextColor={theme.colors.placeholder}
                value={className}
                onChangeText={setClassName}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>SUBJECT CATEGORY</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="e.g. Science"
                placeholderTextColor={theme.colors.placeholder}
                value={subject}
                onChangeText={setSubject}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>TARGET GRADE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.gradeChip,
                    { backgroundColor: selectedGrade === g ? theme.colors.primary : theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }
                  ]}
                  onPress={() => setSelectedGrade(g)}
                >
                  <Text style={[styles.gradeChipText, { color: selectedGrade === g ? '#fff' : theme.colors.text }]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={[styles.cardSectionLabel, { marginBottom: 0 }]}>STUDENT ROSTER</Text>
            {selectedGrade ? (
              <View style={styles.filterToggle}>
                <FontAwesomeIcon icon={faPlusCircle} size={12} color={'#10b981'} />
                <Text style={[styles.filterToggleText, { color: '#10b981' }]}>
                  {`Filtered: ${selectedGrade}`}
                </Text>
              </View>
            ) : null}
          </View>

          {selectedGrade ? (
            <>
              <View style={[styles.searchWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  placeholder="Search students to add..."
                  placeholderTextColor={theme.colors.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <Text style={styles.subLabel}>AVAILABLE STUDENTS ({students.filter(s => !selectedStudents.includes(s.id)).length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {students.filter(s => !selectedStudents.includes(s.id)).map(item => (
                  <TouchableOpacity key={item.id} style={styles.userCircle} onPress={() => toggleStudentSelection(item.id)}>
                    <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={[styles.userAvatar, { borderColor: theme.colors.cardBorder }]} />
                    <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.full_name.split(' ')[0]}</Text>
                    <View style={styles.addBadge}><FontAwesomeIcon icon={faPlusCircle} size={12} color="#10b981" /></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.subLabel, { marginTop: 20 }]}>SELECTED MEMBERS ({selectedStudents.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {students.filter(s => selectedStudents.includes(s.id)).map(item => (
                  <TouchableOpacity key={item.id} style={styles.userCircle} onPress={() => toggleStudentSelection(item.id)}>
                    <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={[styles.userAvatar, { borderColor: theme.colors.primary }]} />
                    <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.full_name.split(' ')[0]}</Text>
                    <View style={styles.addBadge}><FontAwesomeIcon icon={faMinusCircle} size={12} color="#ef4444" /></View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <FontAwesomeIcon icon={faUser} size={32} color={theme.colors.placeholder} style={{ opacity: 0.2, marginBottom: 12 }} />
              <Text style={{ fontSize: 12, color: theme.colors.placeholder, fontWeight: '700', textAlign: 'center' }}>
                Please select a Target Grade above to see available students.
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20, minHeight: 400 }]}>
          <TimetableManager
            schedules={schedules}
            onSchedulesChange={setSchedules}
          />
        </View>

        <TouchableOpacity
          style={[styles.createBtnContainer, { marginTop: 30 }]}
          onPress={handleCreateClass}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#10b981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createBtn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} size={16} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.createBtnText}>Finish Registration</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>


    </View>
  );
}

export default React.memo(CreateClassScreen);

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
  iconBoxHero: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: { padding: 24, borderRadius: 32 },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, height: 56 },
  input: { flex: 1, fontSize: 15, fontWeight: '700' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, height: 48, marginBottom: 20 },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '600', marginLeft: 10 },
  subLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 12 },
  horizontalScroll: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4 },
  userCircle: { alignItems: 'center', marginRight: 20, width: 70 },
  userAvatar: { width: 54, height: 54, borderRadius: 20, borderWidth: 2, marginBottom: 8 },
  userName: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  addBadge: { position: 'absolute', top: -2, right: 4, backgroundColor: '#fff', borderRadius: 10, padding: 2, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
  scheduleItem: { flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 10, alignItems: 'center', justifyContent: 'space-between' },
  scheduleLeft: { flex: 1 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
  dateText: { fontSize: 10, fontWeight: '900', marginLeft: 6 },
  timeText: { fontSize: 14, fontWeight: '700' },
  createBtnContainer: { marginBottom: 20 },
  createBtn: { height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#555', marginTop: 10 },
  descriptionText: { fontSize: 12, color: '#777', marginBottom: 10, marginLeft: 5 },
  studentList: { maxHeight: 150, marginBottom: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
  studentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
  emptyText: { textAlign: 'center', padding: 10, color: '#666' },
  createClassButton: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  createClassButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scheduleList: { marginTop: 10 },
  scheduleText: { fontSize: 14 },
  scheduleInfoText: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 5 },
  subHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 5 },
  subHeaderDescription: { fontSize: 14, color: '#666', marginBottom: 10 },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  gradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  gradeChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterToggleText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  }
});
