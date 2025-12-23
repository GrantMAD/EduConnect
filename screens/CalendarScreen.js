import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import CalendarScreenSkeleton, { SkeletonPiece } from '../components/skeletons/CalendarScreenSkeleton';
import { faTimes, faCalendarAlt, faClock, faChevronDown, faChevronUp, faBook, faHandshake, faChevronRight, faFootballBall } from '@fortawesome/free-solid-svg-icons';
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

          const allEvents = [];

          // 1. Fetch Class Schedules
          if (classIds.length > 0) {
            const { data: classSchedules, error: schedulesError } = await supabase
              .from('class_schedules')
              .select('*, class:classes(id, name, subject)')
              .in('class_id', classIds)
              .order('start_time', { ascending: true });
            if (schedulesError) throw schedulesError;
            allEvents.push(...classSchedules.map(s => ({ ...s, eventType: 'class' })));
          }

          // 2. Fetch PTM Bookings
          const isParent = userRole === 'parent';
          let ptmQuery = supabase
            .from('ptm_bookings')
            .select(`
                *,
                slot:ptm_slots!inner(*, teacher:users!teacher_id(full_name)),
                parent:users!parent_id(full_name),
                student:users!student_id(full_name)
            `);

          if (isParent) {
            ptmQuery = ptmQuery.eq('parent_id', user.id);
          } else {
            ptmQuery = ptmQuery.eq('ptm_slots.teacher_id', user.id);
          }

          const { data: ptmData, error: ptmError } = await ptmQuery;

          if (!ptmError && ptmData) {
            allEvents.push(...ptmData.map(b => ({
              id: b.id,
              start_time: b.slot.start_time,
              end_time: b.slot.end_time,
              title: `PTM: ${isParent ? b.slot.teacher.full_name : b.parent.full_name}`,
              description: `Meeting regarding ${b.student.full_name}`,
              eventType: 'meeting',
              originalData: b,
              class_id: b.slot.id // Use slot id as a dummy class_id for coloring
            })));
          }

          // Assign colors
          const classColorMap = {};
          const uniqueIds = [...new Set(allEvents.map(e => e.class_id || e.id))];
          uniqueIds.forEach((id, index) => {
            classColorMap[id] = dotColors[index % dotColors.length];
          });

          // Build marked dates for the calendar
          const formattedMarkedDates = {};
          allEvents.forEach(event => {
            const date = event.start_time.split('T')[0];
            const isClub = event.class?.subject === 'Extracurricular';
            const color = event.eventType === 'meeting' ? theme.colors.warning : isClub ? '#AF52DE' : classColorMap[event.class_id || event.id];
            if (!formattedMarkedDates[date]) formattedMarkedDates[date] = { periods: [] };
            
            // Avoid duplicate bars for the same category on the same day
            const existingPeriod = formattedMarkedDates[date].periods.find(p => p.color === color);
            if (!existingPeriod) {
              formattedMarkedDates[date].periods.push({ 
                startingDay: true, 
                endingDay: true, 
                color: color 
              });
            }
          });

          // Prepare colored and descriptive schedules
          const coloredSchedules = allEvents.map(e => {
            const isClub = e.class?.subject === 'Extracurricular';
            const color = e.eventType === 'meeting' ? theme.colors.warning : isClub ? '#AF52DE' : (classColorMap[e.class_id || e.id] || theme.colors.primary);
            return {
              ...e,
              color: color,
              badgeColor: color,
              description: e.description || '',
              class_info: e.class_info || '',
            };
          });

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

  const upcomingClasses = schedules.filter(s => s.eventType === 'class' && new Date(s.start_time) >= new Date());
  const pastEvents = schedules.filter(s => new Date(s.start_time) < new Date());
  const upcomingMeetings = schedules.filter(s => s.eventType === 'meeting' && new Date(s.start_time) >= new Date());

  const toggleDropdown = (title) => {
    setDropdowns(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const openScheduleModal = (schedule) => {
    if (schedule.eventType === 'meeting') {
      navigation.navigate('Meetings');
    } else if (schedule.class?.subject === 'Extracurricular') {
      navigation.navigate('ClubDetail', { clubId: schedule.class_id });
    } else {
      setSelectedSchedule(schedule);
      setModalVisible(true);
    }
  };

  const onDayPress = (day) => {
    const daySchedules = schedules.filter(s => s.start_time.startsWith(day.dateString));
    if (daySchedules.length > 0) {
      setDayModalSchedules(daySchedules.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
      setDayModalVisible(true);
    }
  };

  const renderEventCard = (item) => {
    const isMeeting = item.eventType === 'meeting';
    const isClub = item.class?.subject === 'Extracurricular';
    const start = new Date(item.start_time);
    const eventColor = isMeeting ? theme.colors.warning : isClub ? '#AF52DE' : theme.colors.primary;
    
    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => openScheduleModal(item)}
        style={[
          styles.eventCard, 
          { backgroundColor: theme.colors.cardBackground },
          (isMeeting || isClub) && { borderLeftColor: eventColor, borderLeftWidth: 4 }
        ]}
      >
        <View style={styles.eventCardLeft}>
          <View style={[styles.timeBox, { backgroundColor: eventColor + '15' }]}>
            <Text style={[styles.timeText, { color: eventColor }]}>
              {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
        
        <View style={styles.eventCardContent}>
          <View style={styles.eventHeaderRow}>
            <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {isMeeting ? item.title : (item.class?.name || item.title || 'Untitled Class')}
            </Text>
            <View style={[styles.eventBadge, { backgroundColor: eventColor + '20' }]}>
              <Text style={[styles.eventBadgeText, { color: eventColor }]}>
                {isMeeting ? 'PTM' : isClub ? 'Club' : 'Class'}
              </Text>
            </View>
          </View>
          
          <View style={styles.eventDetailsRow}>
            <FontAwesomeIcon 
              icon={isMeeting ? faHandshake : isClub ? faFootballBall : faBook} 
              size={12} 
              color={theme.colors.placeholder} 
              style={{ marginRight: 6 }} 
            />
            <Text style={[styles.eventDescription, { color: theme.colors.placeholder }]} numberOfLines={1}>
              {item.description || item.class_info || 'No details provided'}
            </Text>
          </View>
        </View>
        
        <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.colors.cardBorder} />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
        <FontAwesomeIcon icon={faCalendarAlt} size={24} color={theme.colors.primary} style={{ marginRight: 10 }} />
        <Text style={[styles.header, { color: theme.colors.text }]}>Class Calendar</Text>
      </View>
      <Text style={[styles.descriptionText, { color: theme.colors.placeholder }]}>View all your scheduled classes and tap on class days for more details.</Text>

      {loading ? (
        <>
          <SkeletonPiece style={{ width: '100%', height: 370, borderRadius: 10, marginBottom: 20 }} />
          <SkeletonPiece style={{ width: '50%', height: 20, borderRadius: 4, marginBottom: 15 }} />
          <SkeletonPiece style={{ width: '100%', height: 80, borderRadius: 12, marginBottom: 10 }} />
          <SkeletonPiece style={{ width: '100%', height: 80, borderRadius: 12 }} />
        </>
      ) : (
        <>
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

          {upcomingMeetings.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.listHeader, { color: theme.colors.text }]}>Upcoming Meetings</Text>
              {upcomingMeetings.slice(0, 5).map(renderEventCard)}
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.listHeader, { color: theme.colors.text }]}>Upcoming Classes</Text>
            {upcomingClasses.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No upcoming classes found.</Text>
            ) : upcomingClasses.slice(0, 5).map(renderEventCard)}
          </View>

          <View style={styles.section}>
            <Text style={[styles.listHeader, { color: theme.colors.text }]}>Past Events</Text>
            {pastEvents.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No past events yet.</Text>
            ) : pastEvents.slice(0, 5).map(renderEventCard)}
          </View>
        </>
      )}

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
        title="Events for selected day"
        icon={faCalendarAlt}
      >
        <View style={{ paddingBottom: 20 }}>
          <Text style={[styles.modalDescription, { color: theme.colors.placeholder }]}>Tap an event to view its details.</Text>
          {dayModalSchedules.map(renderEventCard)}
        </View>
      </StandardBottomModal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  descriptionText: { fontSize: 14, marginBottom: 20 },
  listHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 12, marginLeft: 4 },
  section: { marginBottom: 8 },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eventCardLeft: {
    marginRight: 12,
  },
  timeBox: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 65,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  eventCardContent: {
    flex: 1,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  eventBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  eventDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDescription: {
    fontSize: 12,
    flex: 1,
  },

  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 14, fontStyle: 'italic' },

  centeredModal: { justifyContent: 'center', alignItems: 'center', margin: 0 },
  modalDescription: { fontSize: 14, marginBottom: 15, textAlign: 'center' },
  modalDescriptionBadge: { fontSize: 14, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'center', marginBottom: 10 },
  classInfo: { fontSize: 14, marginTop: 10 },
});
