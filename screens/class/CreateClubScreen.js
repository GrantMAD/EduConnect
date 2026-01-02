import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../context/SchoolContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlusCircle, faMinusCircle, faUser, faClock, faArrowLeft, faUsersCog, faCalendarAlt, faSearch, faCheckCircle, faFootballBall, faChevronLeft, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';
import { useToast } from '../../context/ToastContext';
const defaultUserImage = require('../../assets/user.png');
import ClassScheduleModal from '../../components/ClassScheduleModal';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

export default function CreateClubScreen({ navigation, route }) {
  const { clubToEdit = null } = route.params || {};
  const [name, setName] = useState(clubToEdit?.name || '');
  const [loading, setLoading] = useState(false);
  
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingUsers, setFetchingUsers] = useState(false);

  const [schedules, setSchedules] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (schoolId) {
      fetchUsers();
      if (clubToEdit) {
          fetchExistingMembers(clubToEdit.id);
          fetchExistingSchedules(clubToEdit.id);
      }
    }
  }, [schoolId]);

  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, role')
        .eq('school_id', schoolId)
        .in('role', ['student', 'teacher']);

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error.message);
      showToast('Failed to fetch users.', 'error');
    } finally {
      setFetchingUsers(false);
    }
  };

  const fetchExistingMembers = async (clubId) => {
      try {
          const { data } = await supabase
              .from('class_members')
              .select('user_id')
              .eq('class_id', clubId);
          if (data) {
              setSelectedUserIds(data.map(m => m.user_id));
          }
      } catch (e) { console.error(e); }
  };

  const fetchExistingSchedules = async (clubId) => {
      try {
          const { data } = await supabase
              .from('class_schedules')
              .select('*')
              .eq('class_id', clubId);
          if (data) {
              setSchedules(data.map(s => ({
                  id: s.id,
                  date: s.start_time.split('T')[0],
                  startTime: new Date(s.start_time),
                  endTime: new Date(s.end_time),
                  info: s.class_info || ''
              })));
          }
      } catch (e) { console.error(e); }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
  };

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const handleSaveSchedule = (startTimeStr, endTimeStr, infoStr) => {
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

    const startTime = new Date(selectedDate);
    startTime.setHours(startHours, startMinutes);
    const endTime = new Date(selectedDate);
    endTime.setHours(endHours, endMinutes);

    if (startTime >= endTime) {
      showToast('End time must be after start time.', 'error');
      return;
    }

    setSchedules([...schedules, { date: selectedDate, startTime, endTime, info: infoStr }]);
    setModalVisible(false);
  };

  const handleRemoveSchedule = (index) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name) return showToast('Please enter a club name.', 'error');

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !schoolId) throw new Error('Auth session invalid');

      let clubId = clubToEdit?.id;
      const subject = 'Extracurricular';

      if (clubToEdit) {
          const { error } = await supabase
              .from('classes')
              .update({ name, subject })
              .eq('id', clubToEdit.id);
          if (error) throw error;
      } else {
          const { data, error } = await supabase
              .from('classes')
              .insert({ name, subject, school_id: schoolId, teacher_id: user.id })
              .select().single();
          if (error) throw error;
          clubId = data.id;
      }

      const { data: currentMembers } = await supabase.from('class_members').select('user_id').eq('class_id', clubId);
      const currentIds = currentMembers?.map(m => m.user_id) || [];
      
      const toAdd = selectedUserIds.filter(id => !currentIds.includes(id));
      if (toAdd.length > 0) {
          await supabase.from('class_members').insert(toAdd.map(id => ({
              class_id: clubId,
              user_id: id,
              school_id: schoolId,
              role: allUsers.find(u => u.id === id)?.role || 'student'
          })));
          
          await supabase.from('notifications').insert(toAdd.map(id => ({
              user_id: id,
              type: 'added_to_club',
              title: 'New Club Membership',
              message: `You have been added to the club: ${name}`,
              related_user_id: user.id
          })));
      }

      const toRemove = currentIds.filter(id => !selectedUserIds.includes(id));
      if (toRemove.length > 0) {
          await supabase.from('class_members').delete().eq('class_id', clubId).in('user_id', toRemove);
      }

      await supabase.from('classes').update({ users: selectedUserIds }).eq('id', clubId);

      await supabase.from('class_schedules').delete().eq('class_id', clubId);
      if (schedules.length > 0) {
          await supabase.from('class_schedules').insert(schedules.map(s => ({
              class_id: clubId,
              start_time: s.startTime.toISOString(),
              end_time: s.endTime.toISOString(),
              title: name,
              description: 'Extracurricular Session',
              class_info: s.info,
              school_id: schoolId,
              created_by: user.id
          })));
      }

      showToast(`Club '${name}' saved successfully!`, 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving club:', error.message);
      showToast('Failed to save club.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = allUsers.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()));
  const availableUsers = filteredUsers.filter(u => !selectedUserIds.includes(u.id));
  const selectedUsers = allUsers.filter(u => selectedUserIds.includes(u.id));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#9333ea', '#4f46e5']} 
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
                    <Text style={styles.heroTitle}>{clubToEdit ? 'Edit Club' : 'Create Club'}</Text>
                </View>
                <Text style={styles.heroDescription}>
                    Establish an extracurricular activity or a sports team.
                </Text>
            </View>
            <View style={styles.iconBoxHero}>
                <FontAwesomeIcon icon={faFootballBall} size={24} color="rgba(255,255,255,0.7)" />
            </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Text style={styles.cardSectionLabel}>CLUB IDENTITY</Text>
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>OFFICIAL NAME</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="e.g. Soccer Team or Chess Club"
                        placeholderTextColor={theme.colors.placeholder}
                        value={name}
                        onChangeText={setName}
                    />
                </View>
            </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
            <Text style={styles.cardSectionLabel}>RECRUIT MEMBERS</Text>
            
            <View style={[styles.searchWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} />
                <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search users to add..."
                    placeholderTextColor={theme.colors.placeholder}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <Text style={styles.subLabel}>AVAILABLE ({availableUsers.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {availableUsers.map(item => (
                    <TouchableOpacity key={item.id} style={styles.userCircle} onPress={() => toggleUserSelection(item.id)}>
                        <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={[styles.userAvatar, { borderColor: theme.colors.cardBorder }]} />
                        <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.full_name.split(' ')[0]}</Text>
                        <View style={styles.addBadge}><FontAwesomeIcon icon={faPlusCircle} size={12} color="#10b981" /></View>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={[styles.subLabel, { marginTop: 20 }]}>SELECTED ({selectedUsers.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {selectedUsers.map(item => (
                    <TouchableOpacity key={item.id} style={styles.userCircle} onPress={() => toggleUserSelection(item.id)}>
                        <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={[styles.userAvatar, { borderColor: '#9333ea' }]} />
                        <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.full_name.split(' ')[0]}</Text>
                        <View style={styles.addBadge}><FontAwesomeIcon icon={faMinusCircle} size={12} color="#ef4444" /></View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
            <Text style={styles.cardSectionLabel}>MEETING SCHEDULE</Text>
            <Calendar 
                onDayPress={handleDayPress} 
                markedDates={schedules.reduce((acc, s) => ({...acc, [s.date]: {marked: true, dotColor: '#9333ea'}}), {})}
                theme={{
                    backgroundColor: theme.colors.card,
                    calendarBackground: theme.colors.card,
                    textSectionTitleColor: theme.colors.placeholder,
                    selectedDayBackgroundColor: '#9333ea',
                    todayTextColor: '#9333ea',
                    dayTextColor: theme.colors.text,
                    monthTextColor: theme.colors.text,
                    arrowColor: '#9333ea',
                }}
                style={{ borderRadius: 16 }}
            />

            {schedules.length > 0 && (
                <View style={{ marginTop: 20 }}>
                    {schedules.map((item, index) => (
                        <View key={index} style={[styles.scheduleItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <View style={styles.scheduleLeft}>
                                <View style={[styles.dateBadge, { backgroundColor: '#9333ea15' }]}>
                                    <FontAwesomeIcon icon={faClock} size={12} color="#9333ea" />
                                    <Text style={[styles.dateText, { color: '#9333ea' }]}>{item.date}</Text>
                                </View>
                                <Text style={[styles.timeText, { color: theme.colors.text }]}>
                                    {item.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {item.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => handleRemoveSchedule(index)}>
                                <FontAwesomeIcon icon={faTrash} size={16} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </View>

        <TouchableOpacity 
            style={[styles.createBtnContainer, { marginTop: 30 }]} 
            onPress={handleSubmit} 
            disabled={loading}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#9333ea', '#4f46e5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createBtn}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <>
                        <FontAwesomeIcon icon={faSave} size={16} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.createBtnText}>{clubToEdit ? 'Save Changes' : 'Create Club'}</Text>
                    </>
                )}
            </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <ClassScheduleModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        selectedDate={selectedDate}
        onSave={handleSaveSchedule}
      />
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
      color: '#f5f3ff',
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
  horizontalScroll: { flexDirection: 'row' },
  userCircle: { alignItems: 'center', marginRight: 16, width: 64 },
  userAvatar: { width: 50, height: 50, borderRadius: 18, borderWidth: 2, marginBottom: 6 },
  userName: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  addBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 10, padding: 2 },
  scheduleItem: { flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 10, alignItems: 'center', justifyContent: 'space-between' },
  scheduleLeft: { flex: 1 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 },
  dateText: { fontSize: 10, fontWeight: '900', marginLeft: 6 },
  timeText: { fontSize: 14, fontWeight: '700' },
  createBtnContainer: { marginBottom: 20 },
  createBtn: { height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButtonText: { marginLeft: 8, fontSize: 16, fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginLeft: 15 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  userListContainer: { marginBottom: 15 },
  scheduleList: { marginTop: 15 },
  scheduleText: { fontSize: 14, fontWeight: '600' },
  scheduleInfo: { fontSize: 12, fontStyle: 'italic' },
  submitButton: { padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 30, shadowColor: '#AF52DE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
