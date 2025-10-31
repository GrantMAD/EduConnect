import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faCalendarAlt, faClock } from '@fortawesome/free-solid-svg-icons';

export default function CalendarScreen() {
  const [schedules, setSchedules] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDaySchedules, setSelectedDaySchedules] = useState([]);
  const [isModalVisible, setModalVisible] = useState(false);

  // Define fixed color palette for classes
  const dotColors = ['#007AFF', '#28a745', '#ff9500', '#ff3b30', '#5856d6', '#34c759', '#af52de', '#ffcc00'];

  useFocusEffect(
    useCallback(() => {
      const fetchSchedules = async () => {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          if (userError) throw userError;

          const userRole = userData.role;

          let classIds = [];
          if (userRole === 'teacher') {
            const { data: allClasses, error: allClassesError } = await supabase
              .from('classes')
              .select('id');
            if (allClassesError) throw allClassesError;
            classIds = allClasses.map(c => c.id);
          } else {
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

          const { data: classSchedules, error: schedulesError } = await supabase
            .from('class_schedules')
            .select('*')
            .in('class_id', classIds)
            .order('start_time', { ascending: true });
          if (schedulesError) throw schedulesError;

          // Assign a consistent color to each class_id
          const classColorMap = {};
          classIds.forEach((id, index) => {
            classColorMap[id] = dotColors[index % dotColors.length];
          });

          // Build markedDates for calendar
          const formattedMarkedDates = {};
          classSchedules.forEach((schedule) => {
            const date = schedule.start_time.split('T')[0];
            const color = classColorMap[schedule.class_id];

            if (!formattedMarkedDates[date]) {
              formattedMarkedDates[date] = { dots: [] };
            }

            // Add a dot only if one for that class_id doesn't already exist for the date
            if (!formattedMarkedDates[date].dots.some(dot => dot.key === schedule.class_id)) {
              formattedMarkedDates[date].dots.push({ key: `${schedule.class_id}`, color });
            }
          });

          // Add classColor property to each schedule for use in cards
          const coloredSchedules = classSchedules.map(s => ({
            ...s,
            color: classColorMap[s.class_id] || '#007AFF',
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

  const onDayPress = (day) => {
    const daySchedules = schedules.filter(schedule => schedule.start_time.startsWith(day.dateString));
    if (daySchedules.length > 0) {
      setSelectedDaySchedules(daySchedules);
      setModalVisible(true);
    }
  };

  const handleCardPress = (item) => {
    const dateString = item.start_time.split('T')[0];
    onDayPress({ dateString });
  };

  const renderScheduleItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleCardPress(item)} style={[styles.scheduleCard, { borderLeftColor: item.color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.scheduleTitle}>{item.title}</Text>
        {item.description && (
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{item.description}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoRow}>
        <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#007AFF" style={styles.icon} />
        <Text style={styles.scheduleLabel}>Date: </Text>
        <Text style={styles.scheduleDate}>
          {new Date(item.start_time).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <FontAwesomeIcon icon={faClock} size={14} color="#007AFF" style={styles.icon} />
        <Text style={styles.scheduleLabel}>Time: </Text>
        <Text style={styles.scheduleTime}>
          {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.header}>Class Calendar</Text>
      <Text style={styles.descriptionText}>View all your scheduled classes and tap on dates for more details.</Text>

      <Calendar
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType="multi-dot"
        theme={{ todayTextColor: '#007AFF' }}
      />

      <Text style={styles.listHeader}>Upcoming Classes</Text>
      <Text style={styles.descriptionText}>Here is a list of all your upcoming classes.</Text>

      <FlatList
        data={schedules}
        keyExtractor={(item) => item.id}
        renderItem={renderScheduleItem}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no upcoming classes.</Text>}
        style={{ marginTop: 10 }}
        scrollEnabled={false}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setModalVisible(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
            <FontAwesomeIcon icon={faTimes} size={20} color="#666" />
          </TouchableOpacity>
          <Text style={styles.modalHeader}>Classes for {selectedDaySchedules.length > 0 ? new Date(selectedDaySchedules[0].start_time).toLocaleDateString() : ''}</Text>
          <FlatList
            data={selectedDaySchedules}
            keyExtractor={(item) => item.id}
            renderItem={renderScheduleItem}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 24 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#333', paddingHorizontal: 16, marginTop: 8 },
  listHeader: { fontSize: 20, fontWeight: 'bold', marginTop: 20, marginBottom: 5, color: '#333', paddingHorizontal: 16 },
  descriptionText: { fontSize: 14, color: '#666', marginBottom: 15, paddingHorizontal: 16 },

  scheduleCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderLeftWidth: 6, // colored bar on the left
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scheduleTitle: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', flexShrink: 1, marginRight: 10 },
  badgeContainer: { backgroundColor: '#28a745', borderRadius: 15, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  icon: { marginRight: 8, width: 18, textAlign: 'center' },
  scheduleLabel: { fontSize: 14, color: '#444', fontWeight: '600', marginRight: 4 },
  scheduleDate: { fontSize: 14, color: '#666' },
  scheduleTime: { fontSize: 14, color: '#666' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#666', fontSize: 16 },
  modal: { justifyContent: 'flex-end', margin: 0 },
  modalContent: { backgroundColor: 'white', padding: 22, paddingTop: 40, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '50%' },
  modalHeader: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalCloseButton: { position: 'absolute', top: 15, right: 15, padding: 5, zIndex: 1 },
});
