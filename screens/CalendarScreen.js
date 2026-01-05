import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import CalendarScreenSkeleton, { SkeletonPiece } from '../components/skeletons/CalendarScreenSkeleton';
import { faTimes, faCalendarAlt, faClock, faChevronDown, faChevronUp, faBook, faHandshake, faChevronRight, faChevronLeft, faFootballBall } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext'; // Import useTheme
import StandardBottomModal from '../components/StandardBottomModal';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../services/authService';
import { getUserProfile } from '../services/userService';
import { fetchClassIds, fetchClassSchedules } from '../services/classService';
import { fetchPTMBookings } from '../services/ptmService';

const EventCard = React.memo(({ item, theme, onPress }) => {
    const isMeeting = item.eventType === 'meeting';
    const isClub = item.class?.subject === 'Extracurricular';
    const start = new Date(item.start_time);
    const eventColor = isMeeting ? theme.colors.warning : isClub ? '#AF52DE' : theme.colors.primary;

    return (
      <TouchableOpacity
        onPress={() => onPress(item)}
        style={[
          styles.eventCard,
          { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
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
});

const CalendarScreen = ({ navigation, route }) => {
  const [schedules, setSchedules] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [dropdowns, setDropdowns] = useState({});
  const [dayModalSchedules, setDayModalSchedules] = useState([]);
  const [isDayModalVisible, setDayModalVisible] = useState(false);
  const { showToast } = useToast();
  const { theme } = useTheme(); // Use the theme hook

  const dotColors = useMemo(() => [theme.colors.primary, theme.colors.success, theme.colors.warning, theme.colors.error, '#5856d6', '#34c759', '#af52de', '#ffcc00'], [theme.colors]);

  const fetchSchedules = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const userData = await getUserProfile(user.id);
      if (!userData) return;

      const userRole = userData.role;
      const userSchoolId = userData.school_id;
      
      const classIds = await fetchClassIds(user.id, userRole, userSchoolId);

      const allEvents = [];

      if (classIds.length > 0) {
        const classSchedules = await fetchClassSchedules(classIds);
        allEvents.push(...classSchedules.map(s => ({ ...s, eventType: 'class' })));
      }

      const isParent = userRole === 'parent';
      const ptmData = await fetchPTMBookings(user.id, userRole);

      if (ptmData) {
        allEvents.push(...ptmData.map(b => ({
          id: b.id,
          start_time: b.slot.start_time,
          end_time: b.slot.end_time,
          title: `PTM: ${isParent ? b.slot.teacher.full_name : b.parent.full_name}`,
          description: `Meeting regarding ${b.student.full_name}`,
          eventType: 'meeting',
          originalData: b,
          class_id: b.slot.id
        })));
      }

      const classColorMap = {};
      const uniqueIds = [...new Set(allEvents.map(e => e.class_id || e.id))];
      uniqueIds.forEach((id, index) => {
        classColorMap[id] = dotColors[index % dotColors.length];
      });

      const formattedMarkedDates = {};
      allEvents.forEach(event => {
        const date = event.start_time.split('T')[0];
        const isClub = event.class?.subject === 'Extracurricular';
        const color = event.eventType === 'meeting' ? theme.colors.warning : isClub ? '#AF52DE' : classColorMap[event.class_id || event.id];
        if (!formattedMarkedDates[date]) formattedMarkedDates[date] = { periods: [] };

        const existingPeriod = formattedMarkedDates[date].periods.find(p => p.color === color);
        if (!existingPeriod) {
          formattedMarkedDates[date].periods.push({
            startingDay: true,
            endingDay: true,
            color: color
          });
        }
      });

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
      setRefreshing(false);
    }
  }, [theme.colors, dotColors, showToast]);

  useEffect(() => {
    if (route.params?.openScheduleId && schedules.length > 0) {
      const targetSchedule = schedules.find(s => s.id === route.params.openScheduleId);
      if (targetSchedule) {
        setSelectedSchedule(targetSchedule);
        setModalVisible(true);
        navigation.setParams({ openScheduleId: null });
      }
    }
  }, [route.params?.openScheduleId, schedules, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchSchedules();
    }, [fetchSchedules])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSchedules(true);
  }, [fetchSchedules]);

  const upcomingClasses = useMemo(() => schedules.filter(s => s.eventType === 'class' && new Date(s.start_time) >= new Date()), [schedules]);
  const pastEvents = useMemo(() => schedules.filter(s => new Date(s.start_time) < new Date()), [schedules]);
  const upcomingMeetings = useMemo(() => schedules.filter(s => s.eventType === 'meeting' && new Date(s.start_time) >= new Date()), [schedules]);

  const toggleDropdown = useCallback((title) => {
    setDropdowns(prev => ({ ...prev, [title]: !prev[title] }));
  }, []);

  const openScheduleModal = useCallback((schedule) => {
    if (schedule.eventType === 'meeting') {
      navigation.navigate('Meetings');
    } else if (schedule.class?.subject === 'Extracurricular') {
      navigation.navigate('ClubDetail', { clubId: schedule.class_id });
    } else {
      setSelectedSchedule(schedule);
      setModalVisible(true);
    }
  }, [navigation]);

  const onDayPress = useCallback((day) => {
    const daySchedules = schedules.filter(s => s.start_time.startsWith(day.dateString));
    if (daySchedules.length > 0) {
      setDayModalSchedules(daySchedules.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
      setDayModalVisible(true);
    }
  }, [schedules]);

  const renderEventCard = useCallback((item) => {
    return <EventCard key={item.id} item={item} theme={theme} onPress={openScheduleModal} />;
  }, [theme, openScheduleModal]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
      }
    >
      <LinearGradient
        colors={['#4f46e5', '#4338ca']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Class Calendar</Text>
            <Text style={styles.heroDescription}>
                Stay updated with your daily schedule and upcoming school activities.
            </Text>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ marginTop: -40, paddingHorizontal: 20 }}>
          <SkeletonPiece style={{ width: '100%', height: 380, borderRadius: 32, marginBottom: 20, elevation: 4 }} />
          <SkeletonPiece style={{ width: '50%', height: 20, borderRadius: 4, marginBottom: 15 }} />
          <SkeletonPiece style={{ width: '100%', height: 80, borderRadius: 12, marginBottom: 10 }} />
        </View>
      ) : (
        <View style={{ marginTop: -40, paddingHorizontal: 20 }}>
          <View style={[styles.calendarCard, { backgroundColor: theme.colors.surface, shadowColor: '#000' }]}>
            <Calendar
              onDayPress={onDayPress}
              markedDates={markedDates}
              markingType="multi-period"
              hideExtraDays={true}
              renderArrow={(direction) => (
                <View style={[styles.arrowBox, { backgroundColor: theme.colors.primary + '10' }]}>
                  <FontAwesomeIcon 
                    icon={direction === 'left' ? faChevronLeft : faChevronRight} 
                    size={14} 
                    color={theme.colors.primary} 
                  />
                </View>
              )}
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                dayTextColor: theme.colors.text,
                textDisabledColor: theme.colors.placeholder + '40',
                monthTextColor: theme.colors.text,
                textSectionTitleColor: theme.colors.placeholder,
                selectedDayBackgroundColor: theme.colors.primary,
                selectedDayTextColor: '#fff',
                todayTextColor: theme.colors.primary,
                textDayFontWeight: '600',
                textMonthFontWeight: '900',
                textDayHeaderFontWeight: '800',
                textDayFontSize: 15,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 12,
                'stylesheet.calendar.header': {
                  header: {
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingLeft: 10,
                    paddingRight: 10,
                    marginTop: 6,
                    alignItems: 'center',
                    marginBottom: 10,
                  },
                  monthText: {
                    fontSize: 18,
                    fontWeight: '900',
                    color: theme.colors.text,
                    margin: 10,
                    letterSpacing: -0.5,
                  },
                  dayHeader: {
                    marginTop: 2,
                    marginBottom: 7,
                    width: 32,
                    textAlign: 'center',
                    fontSize: 11,
                    fontWeight: '900',
                    color: theme.colors.placeholder,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  },
                },
              }}
            />
          </View>

          {upcomingMeetings.length > 0 && (
            <View style={styles.section}>
              <View style={styles.headerRow}>
                <Text style={[styles.listHeader, { color: theme.colors.text, marginBottom: 0 }]}>Meetings</Text>
                <View style={[styles.countBadge, { backgroundColor: theme.colors.warning + '15' }]}>
                  <Text style={[styles.countText, { color: theme.colors.warning }]}>{upcomingMeetings.length} PENDING</Text>
                </View>
              </View>
              {upcomingMeetings.slice(0, 5).map(renderEventCard)}
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.headerRow}>
              <Text style={[styles.listHeader, { color: theme.colors.text, marginBottom: 0 }]}>Schedule</Text>
              {upcomingClasses.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Text style={[styles.countText, { color: theme.colors.primary }]}>{upcomingClasses.length} TOTAL</Text>
                </View>
              )}
            </View>
            {upcomingClasses.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.colors.cardBackground }]}>
                <FontAwesomeIcon icon={faCalendarAlt} size={32} color={theme.colors.cardBorder} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No classes scheduled for the coming days.</Text>
              </View>
            ) : upcomingClasses.slice(0, 5).map(renderEventCard)}
          </View>

          <View style={styles.section}>
            <Text style={[styles.listHeader, { color: theme.colors.text }]}>Past Events</Text>
            {pastEvents.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No past events yet.</Text>
            ) : pastEvents.slice(0, 5).map(renderEventCard)}
          </View>
        </View>
      )}

      {/* Class Detail Modal */}
      <StandardBottomModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        title={selectedSchedule?.title || 'Class Details'}
        icon={faBook}
        hideHeader={true}
      >
        {selectedSchedule && (
          <View>
            {/* Hero Section */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.modalIconBox, { backgroundColor: selectedSchedule.color + '20' }]}>
                <FontAwesomeIcon
                  icon={selectedSchedule.eventType === 'meeting' ? faHandshake : selectedSchedule.class?.subject === 'Extracurricular' ? faFootballBall : faBook}
                  size={24}
                  color={selectedSchedule.color}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {selectedSchedule.class?.name || selectedSchedule.title || 'Untitled Event'}
                </Text>
                <View style={[styles.modalBadge, { backgroundColor: selectedSchedule.color + '20', alignSelf: 'flex-start', marginTop: 6 }]}>
                  <Text style={[styles.modalBadgeText, { color: selectedSchedule.color }]}>
                    {selectedSchedule.eventType === 'meeting' ? 'Meeting' : selectedSchedule.class?.subject === 'Extracurricular' ? 'Club' : 'Class'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 8 }}>
                <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
              </TouchableOpacity>
            </View>

            {/* Info Grid */}
            <View style={styles.modalGrid}>
              <View style={[styles.modalGridItem, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <FontAwesomeIcon icon={faCalendarAlt} size={16} color={theme.colors.placeholder} style={{ marginBottom: 8 }} />
                <Text style={[styles.gridLabel, { color: theme.colors.placeholder }]}>Date</Text>
                <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                  {new Date(selectedSchedule.start_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' })}
                </Text>
              </View>
              <View style={[styles.modalGridItem, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <FontAwesomeIcon icon={faClock} size={16} color={theme.colors.placeholder} style={{ marginBottom: 8 }} />
                <Text style={[styles.gridLabel, { color: theme.colors.placeholder }]}>Time</Text>
                <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                  {new Date(selectedSchedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            {/* Description / Topic */}
            <View style={[styles.descriptionBox, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
              <Text style={[styles.boxLabel, { color: theme.colors.placeholder }]}>TOPIC / DESCRIPTION</Text>
              <Text style={[styles.boxText, { color: theme.colors.text }]}>
                {selectedSchedule.description || selectedSchedule.class_info || 'No detailed description provided for this session.'}
              </Text>
            </View>
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

export default React.memo(CalendarScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 0, paddingBottom: 40 }, // padding 0 for hero to touch edges
  
  heroContainer: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 80,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
      marginBottom: 0,
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
      lineHeight: 20,
  },
  calendarCard: {
    borderRadius: 32,
    padding: 16,
    paddingBottom: 24,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  arrowBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: { 
    marginTop: 24,
    paddingHorizontal: 0, 
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  listHeader: { 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 12, 
    fontSize: 13, 
    fontWeight: '600',
    lineHeight: 20,
  },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 0,
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

  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 14, fontStyle: 'italic', paddingHorizontal: 16 },

  modalIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  modalGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  modalGridItem: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  gridLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  gridValue: { fontSize: 15, fontWeight: 'bold' },
  descriptionBox: { padding: 20, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed' },
  boxLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  boxText: { fontSize: 15, lineHeight: 22 },
});