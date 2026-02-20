import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import CalendarScreenSkeleton, { SkeletonPiece } from '../components/skeletons/CalendarScreenSkeleton';
import { faTimes, faCalendarAlt, faClock, faChevronDown, faChevronUp, faBook, faHandshake, faChevronRight, faChevronLeft, faFootballBall, faFileAlt, faEdit, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext'; // Import useTheme
import StandardBottomModal from '../components/StandardBottomModal';
import LinearGradient from 'react-native-linear-gradient';
import HomeworkDetailModal from '../components/HomeworkDetailModal';
import AssignmentDetailModal from '../components/AssignmentDetailModal';
import ExamDetailModal from '../components/ExamDetailModal';
import PTMDetailModal from '../components/PTMDetailModal';
import AnnouncementDetailModal from '../components/AnnouncementDetailModal';

// Import services
import { getCurrentUser } from '../services/authService';
import { getUserProfile } from '../services/userService';
import { fetchCalendarEvents } from '../services/calendarService';

const EventCard = React.memo(({ item, theme, onPress }) => {
  const isMeeting = item.eventType === 'meeting';
  const isHomework = item.eventType === 'homework';
  const isAssignment = item.eventType === 'assignment';
  const isExam = item.eventType === 'exam';
  const isClub = item.class?.subject === 'Extracurricular';

  const start = new Date(item.start_time);

  const handlePress = React.useCallback(() => {
    if (onPress) onPress(item);
  }, [onPress, item]);

  const getEventColor = () => {
    if (isMeeting) return theme.colors.warning;
    if (isHomework) return '#6366f1'; // Indigo
    if (isAssignment) return '#3b82f6'; // Blue
    if (isExam) return '#f43f5e'; // Rose
    if (isClub) return '#AF52DE';
    return theme.colors.primary;
  };

  const eventColor = getEventColor();

  const getIcon = () => {
    if (isMeeting) return faHandshake;
    if (isHomework) return faEdit;
    if (isAssignment) return faFileAlt;
    if (isExam) return faGraduationCap;
    if (isClub) return faFootballBall;
    return faBook;
  };

  const getBadgeText = () => {
    if (isMeeting) return 'PTM';
    if (isHomework) return 'Homework';
    if (isAssignment) return 'Assignment';
    if (isExam) return 'Exam';
    if (isClub) return 'Club';
    return 'Class';
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.eventCard,
        { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
        (isMeeting || isClub || isHomework || isAssignment || isExam) && { borderLeftColor: eventColor, borderLeftWidth: 4 }
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
            {item.title || 'Untitled'}
          </Text>
          <View style={[styles.eventBadge, { backgroundColor: eventColor + '20' }]}>
            <Text style={[styles.eventBadgeText, { color: eventColor }]}>
              {getBadgeText()}
            </Text>
          </View>
        </View>

        <View style={styles.eventDetailsRow}>
          <FontAwesomeIcon
            icon={getIcon()}
            size={12}
            color={theme.colors.placeholder}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.eventDescription, { color: theme.colors.placeholder }]} numberOfLines={1}>
            {item.description || 'No details provided'}
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
  const [isHomeworkModalVisible, setHomeworkModalVisible] = useState(false);
  const [isAssignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [isExamModalVisible, setExamModalVisible] = useState(false);
  const [isPTMModalVisible, setPTMModalVisible] = useState(false);
  const [isAnnouncementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

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

      const allEvents = await fetchCalendarEvents(user, userData);

      const classColorMap = {};
      const uniqueIds = [...new Set(allEvents.map(e => e.class_id || e.id))];
      uniqueIds.forEach((id, index) => {
        classColorMap[id] = dotColors[index % dotColors.length];
      });

      const formattedMarkedDates = {};
      allEvents.forEach(event => {
        const date = event.start_time.split('T')[0];
        const isClub = event.class?.subject === 'Extracurricular';

        let color = classColorMap[event.class_id || event.id];
        if (event.eventType === 'meeting') color = theme.colors.warning;
        else if (isClub) color = '#AF52DE';
        else if (event.eventType === 'homework') color = '#6366f1';
        else if (event.eventType === 'assignment') color = '#3b82f6';
        else if (event.eventType === 'exam') color = '#f43f5e';

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
        let color = classColorMap[e.class_id || e.id] || theme.colors.primary;
        if (e.eventType === 'meeting') color = theme.colors.warning;
        else if (isClub) color = '#AF52DE';
        else if (e.eventType === 'homework') color = '#6366f1';
        else if (e.eventType === 'assignment') color = '#3b82f6';
        else if (e.eventType === 'exam') color = '#f43f5e';

        return {
          ...e,
          color: color,
          badgeColor: color,
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

  const sortedEvents = useMemo(() => {
    return [...schedules].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [schedules]);

  const upcomingEvents = useMemo(() => sortedEvents.filter(s => new Date(s.start_time) >= new Date().setHours(0, 0, 0, 0)), [sortedEvents]);
  const pastEvents = useMemo(() => sortedEvents.filter(s => new Date(s.start_time) < new Date().setHours(0, 0, 0, 0)), [sortedEvents]);

  const openScheduleModal = useCallback((schedule) => {
    if (schedule.eventType === 'meeting') {
      setSelectedSchedule(schedule);
      setPTMModalVisible(true);
    } else if (schedule.class?.subject === 'Extracurricular') {
      navigation.navigate('ClubDetail', { clubId: schedule.class_id });
    } else if (schedule.eventType === 'homework') {
      setSelectedSchedule(schedule);
      setHomeworkModalVisible(true);
    } else if (schedule.eventType === 'assignment') {
      setSelectedSchedule(schedule);
      setAssignmentModalVisible(true);
    } else if (schedule.eventType === 'exam') {
      setSelectedSchedule(schedule);
      setExamModalVisible(true);
    } else if (schedule.eventType === 'event' && schedule.announcement_id) {
      // In calendarService, announcement_id is mapped from generic events
      // We need the full announcement object for the modal or at least title/message
      // For now, if we have originalData with announcement info, we can use it
      if (schedule.originalData?.announcements) {
        setSelectedAnnouncement(schedule.originalData.announcements);
        setAnnouncementModalVisible(true);
      } else {
        navigation.navigate('Announcements', { openAnnouncementId: schedule.announcement_id });
      }
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

  const getModalIcon = (eventType, subject) => {
    if (eventType === 'meeting') return faHandshake;
    if (subject === 'Extracurricular') return faFootballBall;
    if (eventType === 'homework') return faEdit;
    if (eventType === 'assignment') return faFileAlt;
    if (eventType === 'exam') return faGraduationCap;
    return faBook;
  };

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
          <Text style={styles.heroTitle}>Academic Calendar</Text>
          <Text style={styles.heroDescription}>
            Unified view of classes, exams, homework, and meetings.
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

          <View style={styles.section}>
            <View style={styles.headerRow}>
              <Text style={[styles.listHeader, { color: theme.colors.text, marginBottom: 0 }]}>Upcoming Events</Text>
              {upcomingEvents.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Text style={[styles.countText, { color: theme.colors.primary }]}>{upcomingEvents.length} TOTAL</Text>
                </View>
              )}
            </View>
            {upcomingEvents.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.colors.cardBackground }]}>
                <FontAwesomeIcon icon={faCalendarAlt} size={32} color={theme.colors.cardBorder} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No activities scheduled for the coming days.</Text>
              </View>
            ) : upcomingEvents.slice(0, 10).map(renderEventCard)}
          </View>

          <View style={styles.section}>
            <Text style={[styles.listHeader, { color: theme.colors.text }]}>Past Events</Text>
            {pastEvents.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No past events yet.</Text>
            ) : pastEvents.reverse().slice(0, 5).map(renderEventCard)}
          </View>
        </View>
      )}

      {/* Class Detail Modal */}
      <StandardBottomModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        title={selectedSchedule?.title || 'Event Details'}
        icon={selectedSchedule ? getModalIcon(selectedSchedule.eventType, selectedSchedule.class?.subject) : faBook}
        hideHeader={true}
      >
        {selectedSchedule && (
          <View>
            {/* Hero Section */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.modalIconBox, { backgroundColor: selectedSchedule.color + '20' }]}>
                <FontAwesomeIcon
                  icon={getModalIcon(selectedSchedule.eventType, selectedSchedule.class?.subject)}
                  size={24}
                  color={selectedSchedule.color}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                  {selectedSchedule.title || 'Untitled Event'}
                </Text>
                <View style={[styles.modalBadge, { backgroundColor: selectedSchedule.color + '20', alignSelf: 'flex-start', marginTop: 6 }]}>
                  <Text style={[styles.modalBadgeText, { color: selectedSchedule.color }]}>
                    {selectedSchedule.eventType}
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
                {selectedSchedule.description || 'No detailed description provided for this event.'}
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

      <HomeworkDetailModal
        visible={isHomeworkModalVisible}
        onClose={() => setHomeworkModalVisible(false)}
        homework={selectedSchedule?.originalData}
      />

      <AssignmentDetailModal
        visible={isAssignmentModalVisible}
        onClose={() => setAssignmentModalVisible(false)}
        assignment={selectedSchedule?.originalData}
      />

      <ExamDetailModal
        visible={isExamModalVisible}
        onClose={() => setExamModalVisible(false)}
        exam={selectedSchedule}
      />

      <PTMDetailModal
        visible={isPTMModalVisible}
        onClose={() => setPTMModalVisible(false)}
        ptm={selectedSchedule}
      />

      <AnnouncementDetailModal
        visible={isAnnouncementModalVisible}
        onClose={() => setAnnouncementModalVisible(false)}
        announcement={selectedAnnouncement}
      />
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