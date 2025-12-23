import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Image, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../context/SchoolContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlusCircle, faMinusCircle, faUser, faClock, faArrowLeft, faUsersCog, faCalendarAlt, faSearch, faCheckCircle, faFootballBall } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';
import { useToast } from '../../context/ToastContext';
const defaultUserImage = require('../../assets/user.png');
import ClassScheduleModal from '../../components/ClassScheduleModal';

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

      // Sync Members
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
          
          // Notifications
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

      // Sync RLS parity array
      await supabase.from('classes').update({ users: selectedUserIds }).eq('id', clubId);

      // Sync Schedules
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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background, paddingBottom: 40 + insets.bottom }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <FontAwesomeIcon icon={faArrowLeft} size={20} color={theme.colors.primary} />
        <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>Cancel</Text>
      </TouchableOpacity>
      
      <View style={styles.header}>
          <FontAwesomeIcon icon={faFootballBall} size={32} color="#AF52DE" />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{clubToEdit ? 'Edit Club' : 'Create New Club'}</Text>
      </View>

      <Text style={[styles.label, { color: theme.colors.text }]}>Club Name</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.cardBorder }]} 
        value={name} 
        onChangeText={setName} 
        placeholder="e.g., Soccer Team or Chess Club" 
        placeholderTextColor={theme.colors.placeholder} 
      />

      <Text style={[styles.label, { color: theme.colors.text }]}>Recruit Members</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.cardBorder }]} 
        value={searchQuery} 
        onChangeText={setSearchQuery} 
        placeholder="Search users..." 
        placeholderTextColor={theme.colors.placeholder} 
      />

      <View style={styles.userListContainer}>
          <Text style={[styles.subLabel, { color: theme.colors.placeholder }]}>Available ({availableUsers.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {availableUsers.map(item => (
                  <TouchableOpacity key={item.id} style={styles.userCircle} onPress={() => toggleUserSelection(item.id)}>
                      <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={styles.userAvatar} />
                      <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.full_name.split(' ')[0]}</Text>
                      <View style={styles.addBadge}><FontAwesomeIcon icon={faPlusCircle} size={12} color="#28a745" /></View>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      <View style={styles.userListContainer}>
          <Text style={[styles.subLabel, { color: theme.colors.placeholder }]}>Selected Members ({selectedUsers.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {selectedUsers.map(item => (
                  <TouchableOpacity key={item.id} style={styles.userCircle} onPress={() => toggleUserSelection(item.id)}>
                      <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={styles.userAvatar} />
                      <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.full_name.split(' ')[0]}</Text>
                      <View style={styles.addBadge}><FontAwesomeIcon icon={faMinusCircle} size={12} color="#dc3545" /></View>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      </View>

      <Text style={[styles.label, { color: theme.colors.text, marginTop: 20 }]}>Meeting Schedule</Text>
      <Calendar 
        onDayPress={handleDayPress} 
        theme={{
            calendarBackground: theme.colors.card,
            textSectionTitleColor: theme.colors.placeholder,
            dayTextColor: theme.colors.text,
            todayTextColor: '#AF52DE',
            selectedDayBackgroundColor: '#AF52DE',
            monthTextColor: theme.colors.text,
            arrowColor: '#AF52DE',
        }}
        markedDates={schedules.reduce((acc, s) => ({...acc, [s.date]: {marked: true, dotColor: '#AF52DE'}}), {})} 
      />

      <View style={styles.scheduleList}>
        {schedules.map((item, index) => (
          <View key={index} style={[styles.scheduleItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <View>
              <Text style={[styles.scheduleText, { color: theme.colors.text }]}>{new Date(item.date).toLocaleDateString()} at {item.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              {item.info ? <Text style={[styles.scheduleInfo, { color: theme.colors.placeholder }]}>{item.info}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => handleRemoveSchedule(index)}>
              <FontAwesomeIcon icon={faMinusCircle} size={20} color="#dc3545" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <ClassScheduleModal visible={isModalVisible} onClose={() => setModalVisible(false)} selectedDate={selectedDate} onSave={handleSaveSchedule} />

      <TouchableOpacity style={[styles.submitButton, { backgroundColor: '#AF52DE' }]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>{clubToEdit ? 'Save Changes' : 'Create Club'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButtonText: { marginLeft: 8, fontSize: 16, fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', marginLeft: 15 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 20 },
  userListContainer: { marginBottom: 15 },
  horizontalScroll: { flexDirection: 'row' },
  userCircle: { alignItems: 'center', marginRight: 15, width: 60 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, marginBottom: 4 },
  userName: { fontSize: 10, textAlign: 'center' },
  addBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: 'white', borderRadius: 10 },
  scheduleList: { marginTop: 15 },
  scheduleItem: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scheduleText: { fontSize: 14, fontWeight: '600' },
  scheduleInfo: { fontSize: 12, fontStyle: 'italic' },
  submitButton: { padding: 16, borderRadius: 15, alignItems: 'center', marginTop: 30, shadowColor: '#AF52DE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  submitButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
