import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import CalendarScreenSkeleton from '../components/skeletons/CalendarScreenSkeleton';
import { faTimes, faCalendarAlt, faClock, faChevronDown, faChevronUp, faBook } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext'; // Import useTheme
import StandardBottomModal from '../components/StandardBottomModal';

export default function CalendarScreen() {
  const [schedules, setSchedules] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [dropdowns, setDropdowns] = useState({});
  const [dayModalSchedules, setDayModalSchedules] = useState([]);
  const [isDayModalVisible, setDayModalVisible] = useState(false);
  const { showToast } = useToast();
  const { theme } = useTheme(); // Use the theme hook

  const dotColors = [theme.colors.primary, theme.colors.success, theme.colors.warning, theme.colors.error, '#5856d6', '#34c759', '#af52de', '#ffcc00'];

  useFocusEffect(
    useCallback(() => {
      const fetchSchedules = async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Fetch user's role
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, school_id')
            .eq('id', user.id)
            .single();
          if (userError) throw userError;

          const userRole = userData.role;
          const userSchoolId = userData.school_id;
          let classIds = [];

          if (userRole === 'teacher' || userRole === 'admin') {
            const { data: allClasses, error: allClassesError } = await supabase
              .from('classes')
              .select('id')
              .eq('school_id', userSchoolId); // Filter by school_id
            if (allClassesError) throw allClassesError;
            classIds = allClasses.map(c => c.id);
          } else {
            // Fetch classes the user is directly a member of (student, parent, etc.)
            const { data: directClasses, error: directClassesError } = await supabase
              .from('class_members')
              .select('class_id')
              .eq('user_id', user.id);
            if (directClassesError) throw directClassesError;
            classIds = directClasses.map(c => c.class_id);

            // If the user is a parent, also fetch their children's classes
            if (userRole === 'parent') {
              const { data: relationships, error: relError } = await supabase
                .from('parent_child_relationships')
                .select('child_id')
                .eq('parent_id', user.id);
              if (relError) throw relError;

              const childIds = relationships.map(rel => rel.child_id);

              if (childIds.length > 0) {
                const { data: childrenClasses, error: childrenClassesError } = await supabase
                  .from('class_members')
                  .select('class_id')
                  .in('user_id', childIds);
                if (childrenClassesError) throw childrenClassesError;

                const childrenClassIds = childrenClasses.map(c => c.class_id);
                classIds = [...new Set([...classIds, ...childrenClassIds])]; // Combine and remove duplicates
              }
            }
          }

          if (classIds.length === 0) {
            setSchedules([]);
            setMarkedDates({});
            setLoading(false);
            return;
          }

          // Fetch schedules for the visible classes
          const { data: classSchedules, error: schedulesError } = await supabase
            .from('class_schedules')
            .select('*')
            .in('class_id', classIds)
            .order('start_time', { ascending: true });
          if (schedulesError) throw schedulesError;


          // Assign colors to classes
          const classColorMap = {};
          classIds.forEach((id, index) => {
            classColorMap[id] = dotColors[index % dotColors.length];
          });

          // Build marked dates for the calendar
          const formattedMarkedDates = {};
          classSchedules.forEach(schedule => {
            const date = schedule.start_time.split('T')[0];
            const color = classColorMap[schedule.class_id];
            if (!formattedMarkedDates[date]) formattedMarkedDates[date] = { periods: [] };
            // Avoid duplicate bars for the same class on the same day
            const existingPeriod = formattedMarkedDates[date].periods.find(p => p.color === color);
            if (!existingPeriod) {
              formattedMarkedDates[date].periods.push({ startingDay: true, endingDay: true, color });
            }
          });

          // Prepare colored and descriptive schedules
          const coloredSchedules = classSchedules.map(s => ({
            ...s,
            color: classColorMap[s.class_id] || theme.colors.primary,
            badgeColor: classColorMap[s.class_id] || theme.colors.primary,
            description: s.description || '',
            class_info: s.class_info || '',
          }));

          setSchedules(coloredSchedules);
          setMarkedDates(formattedMarkedDates);
        } catch (error) {
          console.error('Error fetching schedules:', error.message);
          showToast('Failed to fetch schedules.', 'error');
        } finally {
          setLoading(false);
        }
      };

      fetchSchedules();
    }, [theme.colors.primary, theme.colors.success, theme.colors.warning, theme.colors.error])
  );

  const upcomingSchedules = schedules.filter(s => new Date(s.start_time) >= new Date());
  const pastSchedules = schedules.filter(s => new Date(s.start_time) < new Date());

  const toggleDropdown = (title) => {
    setDropdowns(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const openScheduleModal = (schedule) => {
    setSelectedSchedule(schedule);
    setModalVisible(true);
  };

  const onDayPress = (day) => {
    const daySchedules = schedules.filter(s => s.start_time.startsWith(day.dateString));
    if (daySchedules.length > 0) {
      setDayModalSchedules(daySchedules);
      setDayModalVisible(true);
    }
  };

  const renderDayCard = (schedule) => (
    <TouchableOpacity
      key={schedule.id}
      onPress={() => openScheduleModal(schedule)}
      style={[styles.dayCard, { backgroundColor: theme.colors.cardBackground }]}
    >
      <View style={styles.infoRow}>
        <FontAwesomeIcon icon={faCalendarAlt} size={14} color={theme.colors.primary} style={styles.icon} />
        <Text style={[styles.scheduleDate, { color: theme.colors.text }]}>{new Date(schedule.start_time).toLocaleDateString()}</Text>
      </View>
      <View style={styles.infoRow}>
        <FontAwesomeIcon icon={faClock} size={14} color={theme.colors.primary} style={styles.icon} />
        <Text style={[styles.scheduleTime, { color: theme.colors.text }]}>
          {new Date(schedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(schedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={[styles.tapText, { color: theme.colors.placeholder }]}>Tap to view class details</Text>
    </TouchableOpacity>
  );

  const renderClassDropdown = (title, schedulesArray) => {
    const isOpen = dropdowns[title];
    return (
      <View key={title} style={styles.dropdownContainer}>
        <TouchableOpacity onPress={() => toggleDropdown(title)} style={[styles.dropdownHeader, { backgroundColor: theme.colors.inputBackground }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.colorStripe, { backgroundColor: schedulesArray[0].color }]} />
            <FontAwesomeIcon icon={faBook} size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.scheduleTitle, { color: theme.colors.primary }]}>{title}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {schedulesArray[0].description ? (
              <View style={[styles.badgeContainer, { backgroundColor: schedulesArray[0].badgeColor }]}>
                <Text style={[styles.badgeText, { color: theme.colors.buttonPrimaryText }]}>{schedulesArray[0].description}</Text>
              </View>
            ) : null}
            <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} size={18} color={theme.colors.primary} style={{ marginLeft: 8 }} />
          </View>
        </TouchableOpacity>
        {isOpen && (
          <View style={{ marginTop: 8 }}>
            {schedulesArray.map(renderDayCard)}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <CalendarScreenSkeleton />;
  }

  const groupSchedulesByTitle = (arr) => {
    const grouped = {};
    arr.forEach(s => {
      if (!grouped[s.title]) grouped[s.title] = [];
      grouped[s.title].push(s);
    });
    return grouped;
  };

  const upcomingGrouped = groupSchedulesByTitle(upcomingSchedules);
  const pastGrouped = groupSchedulesByTitle(pastSchedules);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.header, { color: theme.colors.text }]}>Class Calendar</Text>
      <Text style={[styles.descriptionText, { color: theme.colors.text }]}>View all your scheduled classes and tap on class days for more details.</Text>

      <Calendar
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType="multi-period"
        theme={{
          backgroundColor: theme.colors.background,
          calendarBackground: theme.colors.background,
          dayTextColor: theme.colors.text,
          textDisabledColor: theme.colors.placeholder,
          monthTextColor: theme.colors.text,
          textSectionTitleColor: theme.colors.text,
          selectedDayBackgroundColor: theme.colors.primary,
          selectedDayTextColor: theme.colors.buttonPrimaryText,
          todayTextColor: theme.colors.primary,
          arrowColor: theme.colors.primary,
          dotColor: theme.colors.primary,
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontWeight: '300',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '500',
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 13,
        }}
      />

      <Text style={[styles.listHeader, { color: theme.colors.text }]}>Upcoming Classes</Text>
      {Object.keys(upcomingGrouped).length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>You have no upcoming classes.</Text>
      ) : Object.entries(upcomingGrouped).map(([title, scheds]) => renderClassDropdown(title, scheds))}

      <Text style={[styles.listHeader, { color: theme.colors.text }]}>Past Classes</Text>
      {Object.keys(pastGrouped).length === 0 ? (
        <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No past classes yet.</Text>
      ) : Object.entries(pastGrouped).map(([title, scheds]) => renderClassDropdown(title, scheds))}

      {/* Class Detail Modal */}
      <StandardBottomModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        title={selectedSchedule?.title || 'Class Details'}
        icon={faBook}
      >
        {selectedSchedule && (
          <View>
            <Text style={[styles.modalDescription, { color: theme.colors.text }]}>Here is the detailed information for this class.</Text>

            {selectedSchedule.description ? (
              <Text style={[styles.modalDescriptionBadge, { backgroundColor: theme.colors.primary, color: theme.colors.buttonPrimaryText }]}>{selectedSchedule.description}</Text>
            ) : null}

            <View style={styles.infoRow}>
              <FontAwesomeIcon icon={faCalendarAlt} size={14} color={theme.colors.primary} style={styles.icon} />
              <Text style={[styles.scheduleDate, { color: theme.colors.text }]}>{new Date(selectedSchedule.start_time).toLocaleDateString()}</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesomeIcon icon={faClock} size={14} color={theme.colors.primary} style={styles.icon} />
              <Text style={[styles.scheduleTime, { color: theme.colors.text }]}>
                {new Date(selectedSchedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSchedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {selectedSchedule.class_info ? (
              <Text style={[styles.classInfo, { color: theme.colors.text }]}>{selectedSchedule.class_info}</Text>
            ) : null}
          </View>
        )}
      </StandardBottomModal>

      {/* Day Modal */}
      <StandardBottomModal
        visible={isDayModalVisible}
        onClose={() => setDayModalVisible(false)}
        title="Classes for selected day"
        icon={faCalendarAlt}
      >
        <View>
          <Text style={[styles.modalDescription, { color: theme.colors.text }]}>Tap a class to view its details.</Text>
          {dayModalSchedules.map(renderDayCard)}
        </View>
      </StandardBottomModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  descriptionText: { fontSize: 14, marginBottom: 15 },
  listHeader: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 5 },

  dropdownContainer: { marginBottom: 15 },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  scheduleTitle: { fontSize: 18, fontWeight: 'bold' },
  colorStripe: { width: 6, height: '100%', marginRight: 6, borderRadius: 3 },
  badgeContainer: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  dayCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  tapText: { fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  icon: { marginRight: 8, width: 18, textAlign: 'center' },
  scheduleDate: { fontSize: 14 },
  scheduleTime: { fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },

  centeredModal: { justifyContent: 'center', alignItems: 'center', margin: 0 },
  modalDescription: { fontSize: 14, marginBottom: 10, textAlign: 'center' },
  modalDescriptionBadge: { fontSize: 14, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'center', marginBottom: 10 },
  classInfo: { fontSize: 14, marginTop: 10 },
});
