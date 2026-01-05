import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faArrowLeft, faPaperPlane, faUsers, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../services/authService';
import { 
  fetchAllClasses, 
  fetchClassInfo 
} from '../services/classService';
import { 
  createAnnouncement as createAnnouncementService 
} from '../services/announcementService';
import { 
  fetchUsersBySchoolWithPreferences, 
  fetchClassMembersIds, 
  fetchParentsOfStudents, 
  fetchUsersByIdsWithPreferences 
} from '../services/userService';
import { sendBatchNotifications } from '../services/notificationService';

const { width } = Dimensions.get('window');

const CreateAnnouncementScreen = ({ route }) => {
  const { fromDashboard, classId: initialClassId } = route.params || {};
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isClassSpecific, setIsClassSpecific] = useState(!!initialClassId);
  const [selectedClass, setSelectedClass] = useState(initialClassId || null);
  const [classes, setClasses] = useState([]);
  const [targetRoles, setTargetRoles] = useState({
    teacher: true,
    student: true,
    parent: true,
  });

  const navigation = useNavigation();
  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchClassesData = async () => {
      if (!schoolId) return;
      try {
        const data = await fetchAllClasses(schoolId);
        setClasses(data || []);
        if (data.length > 0 && !selectedClass) {
          setSelectedClass(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };
    fetchClassesData();
  }, [schoolId, selectedClass]);

  const handleCreate = useCallback(async () => {
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
      const user = await getCurrentUser();
      if (!user) throw new Error('No user logged in');

      const announcementType = isClassSpecific ? 'class' : 'general';

      const newAnnouncement = await createAnnouncementService({
        school_id: schoolId,
        title,
        message,
        type: announcementType,
        class_id: isClassSpecific ? selectedClass : null,
        posted_by: user.id,
      });

      if (!isClassSpecific) {
        const users = await fetchUsersBySchoolWithPreferences(schoolId);

        if (users) {
          const rolesToInclude = [];
          if (targetRoles.teacher) rolesToInclude.push('teacher', 'admin');
          if (targetRoles.student) rolesToInclude.push('student');
          if (targetRoles.parent) rolesToInclude.push('parent');

          const recipients = users.filter(u => {
            if (u.id === user.id) return false;
            if (!rolesToInclude.includes(u.role)) return false;
            const prefs = u.notification_preferences;
            return !prefs || prefs.announcements !== false;
          });

          const notifications = recipients.map(recipient => ({
            user_id: recipient.id,
            type: 'new_general_announcement',
            title: 'New School Announcement',
            message: `A new announcement has been posted: "${newAnnouncement.title}"`,
            data: { announcement_id: newAnnouncement.id },
            created_by: user.id,
            related_user_id: user.id,
            is_read: false
          }));

          if (notifications.length > 0) {
            await sendBatchNotifications(notifications);
          }
        }
      } else {
        const classInfo = await fetchClassInfo(selectedClass);
        const studentIds = await fetchClassMembersIds(selectedClass, 'student');

        if (studentIds && studentIds.length > 0) {
          const parentIds = await fetchParentsOfStudents(studentIds);
          const recipientIds = [...new Set([...studentIds, ...parentIds])];

          const recipientsData = await fetchUsersByIdsWithPreferences(recipientIds);

          if (recipientsData) {
            const finalRecipients = recipientsData.filter(u => {
              if (u.id === user.id) return false;
              const prefs = u.notification_preferences;
              return !prefs || prefs.announcements !== false;
            });

            const notifications = finalRecipients.map(recipient => ({
              user_id: recipient.id,
              type: 'new_class_announcement',
              title: `New Announcement in ${classInfo?.name || 'Class'}`,
              message: `A new announcement has been posted: "${newAnnouncement.title}"`,
              data: { announcement_id: newAnnouncement.id },
              created_by: user.id,
              is_read: false
            }));

            if (notifications.length > 0) {
              await sendBatchNotifications(notifications);
            }
          }
        }
      }

      showToast('Announcement posted successfully!', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating announcement:', error.message);
      showToast('Failed to create announcement.', 'error');
    } finally {
      setLoading(false);
    }
  }, [title, message, isClassSpecific, selectedClass, schoolId, targetRoles, showToast, navigation]);

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
                    <Text style={styles.heroTitle}>New Announcement</Text>
                </View>
                <Text style={styles.heroDescription}>
                    Broadcast news and updates to your school community.
                </Text>
            </View>
            <View style={styles.iconBoxHero}>
                <FontAwesomeIcon icon={faBullhorn} size={24} color="rgba(255,255,255,0.7)" />
            </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Text style={styles.cardSectionLabel}>ANNOUNCEMENT DETAILS</Text>
            
            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>TITLE</Text>
                    <Text style={styles.charCount}>{title.length}/100</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="Enter a descriptive title..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>MESSAGE CONTENT</Text>
                    <Text style={styles.charCount}>{message.length}/1000</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, height: 150, alignItems: 'flex-start', paddingTop: 12 }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, height: 130 }]}
                        placeholder="Write your announcement message here..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        textAlignVertical="top"
                        maxLength={1000}
                    />
                </View>
            </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
            <Text style={styles.cardSectionLabel}>TARGET AUDIENCE</Text>
            
            <View style={styles.switchRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.smallIconBox, { backgroundColor: '#eef2ff' }]}>
                        <FontAwesomeIcon icon={faUsers} size={14} color="#4f46e5" />
                    </View>
                    <Text style={[styles.switchLabel, { color: theme.colors.text }]}>Specific Class or Club</Text>
                </View>
                <Switch
                    value={isClassSpecific}
                    onValueChange={setIsClassSpecific}
                    trackColor={{ false: "#e2e8f0", true: theme.colors.primary }}
                    thumbColor="#fff"
                />
            </View>

            {isClassSpecific ? (
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.inputLabel}>SELECT DESTINATION</Text>
                    <View style={[styles.pickerWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                        <Picker
                            selectedValue={selectedClass}
                            onValueChange={(itemValue) => setSelectedClass(itemValue)}
                            style={{ color: theme.colors.text }}
                            dropdownIconColor={theme.colors.placeholder}
                        >
                            <Picker.Item label="Choose a class or club..." value={null} />
                            {classes.map((cls) => (
                                <Picker.Item key={cls.id} label={cls.name} value={cls.id} />
                            ))}
                        </Picker>
                    </View>
                </View>
            ) : (
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.inputLabel}>BROADCAST TO ROLES</Text>
                    <View style={styles.rolesRow}>
                        {Object.keys(targetRoles).map((role) => (
                        <TouchableOpacity
                            key={role}
                            style={[
                                styles.roleChip,
                                { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 },
                                targetRoles[role] && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                            ]}
                            onPress={() => setTargetRoles(prev => ({ ...prev, [role]: !prev[role] }))}
                        >
                            <Text style={[
                                styles.roleChipText,
                                { color: theme.colors.text },
                                targetRoles[role] && { color: '#fff' }
                            ]}>
                                {role.toUpperCase()}S
                            </Text>
                        </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>

        <TouchableOpacity 
            style={[styles.createBtnContainer, { marginTop: 30 }]} 
            onPress={handleCreate} 
            disabled={loading}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createBtn}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <FontAwesomeIcon icon={faPaperPlane} size={16} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.createBtnText}>Post Announcement</Text>
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default React.memo(CreateAnnouncementScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  iconBoxHero: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  card: {
      padding: 24,
      borderRadius: 32,
  },
  cardSectionLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: '#94a3b8',
      letterSpacing: 1.5,
      marginBottom: 20,
  },
  inputGroup: {
      marginBottom: 20,
  },
  labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingHorizontal: 4,
  },
  inputLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: '#94a3b8',
      letterSpacing: 1,
  },
  charCount: {
      fontSize: 10,
      fontWeight: '700',
      color: '#cbd5e1',
  },
  inputWrapper: {
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
      justifyContent: 'center',
  },
  input: {
      fontSize: 15,
      fontWeight: '600',
  },
  switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  smallIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  switchLabel: {
      fontSize: 15,
      fontWeight: '700',
  },
  pickerWrapper: {
      borderRadius: 16,
      marginTop: 8,
      overflow: 'hidden',
  },
  rolesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
  },
  roleChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
  },
  roleChipText: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 0.5,
  },
  createBtnContainer: {
      marginBottom: 20,
  },
  createBtn: {
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  subLabel: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 10,
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