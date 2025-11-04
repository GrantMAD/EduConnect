import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faCalendarAlt, faClock, faChevronDown, faChevronUp, faBook } from '@fortawesome/free-solid-svg-icons';

export default function CalendarScreen() {
  const [schedules, setSchedules] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [dropdowns, setDropdowns] = useState({});
  const [dayModalSchedules, setDayModalSchedules] = useState([]);
  const [isDayModalVisible, setDayModalVisible] = useState(false);

  const dotColors = ['#007AFF', '#28a745', '#ff9500', '#ff3b30', '#5856d6', '#34c759', '#af52de', '#ffcc00'];

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
            .select('role')
            .eq('id', user.id)
            .single();
          if (userError) throw userError;

          const userRole = userData.role;
          let classIds = [];

          // Admins and teachers can see all classes
          if (userRole === 'teacher' || userRole === 'admin') {
            const { data: allClasses, error: allClassesError } = await supabase
              .from('classes')
              .select('id');
            if (allClassesError) throw allClassesError;
            classIds = allClasses.map(c => c.id);
          } else {
            // Regular users see only their classes
            const { data: userClasses, error: classesError } = await supabase
              .from('classes')
              .select('id')
              .contains('users', [user.id]);
            if (classesError) throw classesError;
            classIds = userClasses.map(c => c.id);
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
            if (!formattedMarkedDates[date]) formattedMarkedDates[date] = { dots: [] };
            if (!formattedMarkedDates[date].dots.some(dot => dot.key === schedule.class_id)) {
              formattedMarkedDates[date].dots.push({ key: `${schedule.class_id}`, color });
            }
          });

          // Prepare colored and descriptive schedules
          const coloredSchedules = classSchedules.map(s => ({
            ...s,
            color: classColorMap[s.class_id] || '#007AFF',
            badgeColor: classColorMap[s.class_id] || '#007AFF',
            description: s.description || '',
            class_info: s.class_info || '',
          }));

          setSchedules(coloredSchedules);
          setMarkedDates(formattedMarkedDates);
        } catch (error) {
          console.error('Error fetching schedules:', error.message);
          Alert.alert('Error', 'Failed to fetch schedules.');
        } finally {
          setLoading(false);
        }
      };

      fetchSchedules();
    }, [])
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
      style={styles.dayCard}
    >
      <View style={styles.infoRow}>
        <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#007AFF" style={styles.icon} />
        <Text style={styles.scheduleDate}>{new Date(schedule.start_time).toLocaleDateString()}</Text>
      </View>
      <View style={styles.infoRow}>
        <FontAwesomeIcon icon={faClock} size={14} color="#007AFF" style={styles.icon} />
        <Text style={styles.scheduleTime}>
          {new Date(schedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(schedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={styles.tapText}>Tap to view class details</Text>
    </TouchableOpacity>
  );

  const renderClassDropdown = (title, schedulesArray) => {
    const isOpen = dropdowns[title];
    return (
      <View key={title} style={styles.dropdownContainer}>
        <TouchableOpacity onPress={() => toggleDropdown(title)} style={styles.dropdownHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.colorStripe, { backgroundColor: schedulesArray[0].color }]} />
            <FontAwesomeIcon icon={faBook} size={18} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={styles.scheduleTitle}>{title}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {schedulesArray[0].description ? (
              <View style={[styles.badgeContainer, { backgroundColor: schedulesArray[0].badgeColor }]}>
                <Text style={styles.badgeText}>{schedulesArray[0].description}</Text>
              </View>
            ) : null}
            <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} size={18} color="#007AFF" style={{ marginLeft: 8 }} />
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.header}>Class Calendar</Text>
      <Text style={styles.descriptionText}>View all your scheduled classes and tap on class days for more details.</Text>

      <Calendar
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType="multi-dot"
      />

      <Text style={styles.listHeader}>Upcoming Classes</Text>
      {Object.keys(upcomingGrouped).length === 0 ? (
        <Text style={styles.emptyText}>You have no upcoming classes.</Text>
      ) : Object.entries(upcomingGrouped).map(([title, scheds]) => renderClassDropdown(title, scheds))}

      <Text style={styles.listHeader}>Past Classes</Text>
      {Object.keys(pastGrouped).length === 0 ? (
        <Text style={styles.emptyText}>No past classes yet.</Text>
      ) : Object.entries(pastGrouped).map(([title, scheds]) => renderClassDropdown(title, scheds))}

      {/* Class Detail Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setModalVisible(false)}
        style={styles.centeredModal}
      >
        {selectedSchedule && (
          <View style={styles.modalContent}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
              <FontAwesomeIcon icon={faTimes} size={20} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalHeader}>{selectedSchedule.title}</Text>
            <Text style={styles.modalDescription}>Here is the detailed information for this class.</Text>

            {selectedSchedule.description ? (
              <Text style={styles.modalDescriptionBadge}>{selectedSchedule.description}</Text>
            ) : null}

            <View style={styles.infoRow}>
              <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#007AFF" style={styles.icon} />
              <Text style={styles.scheduleDate}>{new Date(selectedSchedule.start_time).toLocaleDateString()}</Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesomeIcon icon={faClock} size={14} color="#007AFF" style={styles.icon} />
              <Text style={styles.scheduleTime}>
                {new Date(selectedSchedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSchedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {selectedSchedule.class_info ? (
              <Text style={styles.classInfo}>{selectedSchedule.class_info}</Text>
            ) : null}
          </View>
        )}
      </Modal>

      {/* Day Modal */}
      <Modal
        isVisible={isDayModalVisible}
        onBackdropPress={() => setDayModalVisible(false)}
        style={styles.centeredModal}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={() => setDayModalVisible(false)} style={styles.modalCloseButton}>
            <FontAwesomeIcon icon={faTimes} size={20} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalHeader}>Classes for selected day</Text>
          <Text style={styles.modalDescription}>Tap a class to view its details.</Text>
          {dayModalSchedules.map(renderDayCard)}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 24 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  descriptionText: { fontSize: 14, color: '#666', marginBottom: 15 },
  listHeader: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 5, color: '#333' },

  dropdownContainer: { marginBottom: 15 },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#f0f4f8', borderRadius: 10 },
  scheduleTitle: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  colorStripe: { width: 6, height: '100%', marginRight: 6, borderRadius: 3 },
  badgeContainer: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  dayCard: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 8 },
  tapText: { fontSize: 12, color: '#666', marginTop: 4, fontStyle: 'italic' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  icon: { marginRight: 8, width: 18, textAlign: 'center' },
  scheduleDate: { fontSize: 14, color: '#666' },
  scheduleTime: { fontSize: 14, color: '#666' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#666', fontSize: 16 },

  centeredModal: { justifyContent: 'center', alignItems: 'center', margin: 0 },
  modalContent: { backgroundColor: 'white', padding: 22, borderRadius: 15, width: '90%' },
  modalHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalDescription: { fontSize: 14, color: '#666', marginBottom: 10, textAlign: 'center' },
  modalDescriptionBadge: { fontSize: 14, color: '#fff', backgroundColor: '#007AFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'center', marginBottom: 10 },
  classInfo: { fontSize: 14, color: '#444', marginTop: 10 },
  modalCloseButton: { position: 'absolute', top: 10, right: 10, padding: 5, zIndex: 1 },
});
