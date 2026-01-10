import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchStudentExamSchedule } from '../services/examService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function MyExamsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSchedule = async () => {
    try {
      if (user?.id) {
        const data = await fetchStudentExamSchedule(user.id);
        setSchedule(data);
      }
    } catch (error) {
      console.error('Error fetching exam schedule:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  const upcomingExams = schedule.filter(exam => new Date(exam.date) >= new Date().setHours(0, 0, 0, 0));
  
  // Group exams by date for better display
  const groupedExams = upcomingExams.reduce((groups, exam) => {
    const date = exam.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(exam);
    return groups;
  }, {});

  const renderExamItem = ({ item }) => (
    <View style={[styles.examCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.examHeader}>
        <View style={styles.subjectContainer}>
          <Text style={[styles.paperCode, { color: theme.primary }]}>{item.paper_code}</Text>
          <Text style={[styles.subjectName, { color: theme.text }]} numberOfLines={1}>{item.subject_name}</Text>
        </View>
        <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                {item.start_time.slice(0, 5)} ({item.duration_minutes}m)
            </Text>
        </View>
      </View>
      
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.examDetails}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>VENUE</Text>
          <View style={styles.detailValueContainer}>
            <Ionicons name="location-outline" size={16} color={theme.primary} />
            <Text style={[styles.detailValue, { color: theme.text }]}>{item.venue_name || 'TBA'}</Text>
          </View>
        </View>

        <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />

        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>SEAT NO</Text>
          <View style={styles.detailValueContainer}>
            <Ionicons name="tablet-landscape-outline" size={16} color={theme.primary} />
            <Text style={[styles.detailValue, { color: theme.text, fontSize: 18 }]}>{item.seat_label || 'TBA'}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDateGroup = ({ item: date }) => (
    <View style={styles.dateGroup}>
      <View style={styles.dateHeader}>
        <Text style={[styles.dateDay, { color: theme.text }]}>
          {new Date(date).getDate()}
        </Text>
        <View>
            <Text style={[styles.dateMonth, { color: theme.textSecondary }]}>
            {new Date(date).toLocaleString('default', { month: 'short' }).toUpperCase()}
            </Text>
            <Text style={[styles.dateWeekday, { color: theme.textSecondary }]}>
            {new Date(date).toLocaleString('default', { weekday: 'long' })}
            </Text>
        </View>
      </View>
      {groupedExams[date].map((exam, index) => (
        <View key={index} style={styles.examItemWrapper}>
            {renderExamItem({ item: exam })}
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Exams</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.profileCard, { backgroundColor: theme.cardBackground }]}>
          <View>
            <Text style={[styles.profileName, { color: theme.text }]}>{profile?.full_name}</Text>
            <Text style={[styles.profileInfo, { color: theme.textSecondary }]}>Candidate No: {profile?.number || 'N/A'}</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.countText, { color: theme.primary }]}>{upcomingExams.length} Upcoming</Text>
          </View>
      </View>

      <FlatList
        data={Object.keys(groupedExams).sort((a, b) => new Date(a) - new Date(b))}
        renderItem={renderDateGroup}
        keyExtractor={item => item}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No upcoming exams scheduled.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileInfo: {
    fontSize: 14,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: 'bold',
    marginRight: 12,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  dateWeekday: {
    fontSize: 14,
    lineHeight: 18,
  },
  examItemWrapper: {
    marginBottom: 12,
  },
  examCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subjectContainer: {
    flex: 1,
    marginRight: 12,
  },
  paperCode: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    opacity: 0.8,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 12,
  },
  examDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 1,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  verticalDivider: {
    width: 1,
    height: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});
