import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchStudentExamSchedule } from '../services/examService';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faArrowLeft,
  faCalendarAlt,
  faClock,
  faMapMarkerAlt,
  faChair,
  faBookOpen,
  faGraduationCap,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

export default function MyExamsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { theme, isDarkTheme } = useTheme();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect parents to My Children page as that's where their child's exams are now
  useEffect(() => {
    if (profile?.role === 'parent') {
      navigation.replace('MyChildren', route.params);
    }
  }, [profile?.role, navigation, route.params]);

  const loadSchedule = async () => {
    try {
      if (user?.id) {
        const data = await fetchStudentExamSchedule(user.id);
        setSchedule(data);
      }
    } catch (error) {
      console.error('Error fetching exam schedule:', error);
      Alert.alert('Error', 'Failed to load exam schedule');
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
    <View style={[
      styles.examCard,
      {
        backgroundColor: theme.colors.card, // Use theme.colors.card (assuming context provides it, or fallback)
        borderColor: theme.colors?.cardBorder || theme.border,
        borderWidth: 1
      }
    ]}>
      {/* Left Side: Date Box / Icon */}
      <View style={[styles.cardIconBox, { backgroundColor: '#f59e0b15' }]}>
        <FontAwesomeIcon icon={faBookOpen} size={20} color="#f59e0b" />
      </View>

      {/* Right Side: Content */}
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.subjectName, { color: theme.text }]}>{item.subject_name}</Text>
            <Text style={[styles.paperCode, { color: theme.textSecondary }]}>
              {item.paper_code} • {item.duration_minutes} min
            </Text>
          </View>
          {/* Status Badge (Optional - added for completeness) */}
          <View style={[styles.statusBadge, { backgroundColor: '#ecfdf5' }]}>
            <Text style={[styles.statusText, { color: '#059669' }]}>Upcoming</Text>
          </View>
        </View>

        {/* Footer Grid */}
        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <View style={styles.footerItem}>
            <FontAwesomeIcon icon={faClock} size={12} color="#6366f1" />
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>{item.start_time.slice(0, 5)}</Text>
          </View>
          <View style={styles.footerItem}>
            <FontAwesomeIcon icon={faMapMarkerAlt} size={12} color="#e11d48" />
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>{item.venue_name || 'TBA'}</Text>
          </View>
          <View style={styles.footerItem}>
            <FontAwesomeIcon icon={faChair} size={12} color="#059669" />
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>Seat: {item.seat_label || '--'}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDateGroup = ({ item: date }) => (
    <View style={styles.dateGroup}>
      <Text style={[styles.groupDateTitle, { color: theme.textSecondary }]}>
        {new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Hero Section */}
      <LinearGradient
        colors={['#4f46e5', '#4338ca']}
        style={[styles.heroContainer, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              hitSlop={10}
            >
              <FontAwesomeIcon icon={faArrowLeft} size={20} color="#fff" />
            </TouchableOpacity>
            {profile?.number ? (
              <View style={styles.candBadge}>
                <FontAwesomeIcon icon={faGraduationCap} size={12} color="#fff" />
                <Text style={styles.candText}>NO: {profile.number}</Text>
              </View>
            ) : <View />}
          </View>

          <View style={styles.heroTitleContainer}>
            <Text style={styles.heroTitle}>My Exams</Text>
            <Text style={styles.heroSubtitle}>Your examination schedule and seat allocations.</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={Object.keys(groupedExams).sort((a, b) => new Date(a) - new Date(b))}
        renderItem={renderDateGroup}
        keyExtractor={item => item}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.border }]}>
              <FontAwesomeIcon icon={faBookOpen} size={40} color={theme.textSecondary} />
            </View>
            <Text style={[styles.emptyText, { color: theme.text }]}>No upcoming exams</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
              You don't have any exams scheduled at the moment.
            </Text>
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
  heroContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 4, // Keep shadow for hero
  },
  heroContent: {
    width: '100%',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  candBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  candText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitleContainer: {
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  dateGroup: {
    marginBottom: 24,
  },
  groupDateTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
    opacity: 0.8,
  },
  examItemWrapper: {
    marginBottom: 12,
  },
  examCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  paperCode: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    opacity: 0.3,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '70%',
    lineHeight: 20,
  },
});