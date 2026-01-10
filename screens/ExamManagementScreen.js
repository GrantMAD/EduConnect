import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchExamSessions, deleteExamSession } from '../services/examService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faCalendarAlt, faFileAlt, faChair, faTrash, faArrowLeft, faClipboardCheck, faGraduationCap, faChevronRight, faExclamationTriangle, faInfoCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';

const FAB = ({ onPress, theme }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.fab, { backgroundColor: '#0d9488', shadowColor: '#0d9488' }]}
    activeOpacity={0.8}
  >
    <FontAwesomeIcon icon={faPlus} size={20} color="white" />
  </TouchableOpacity>
);

export default function ExamManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await fetchExamSessions(profile?.school_id);
      setSessions(data);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    const unsubscribe = navigation.addListener('focus', loadSessions);
    return unsubscribe;
  }, [navigation, profile?.school_id]);

  const handleDelete = async (id) => {
    Alert.alert(
      "Delete Session",
      "Are you sure? This will delete all papers and allocations.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteExamSession(id);
              loadSessions();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const renderSessionItem = ({ item }) => {
    const totalAllocations = item.exam_papers?.reduce((acc, paper) => acc + (paper.exam_seat_allocations?.[0]?.count || 0), 0) || 0;
    
    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
        onPress={() => navigation.navigate('ExamSessionDetail', { sessionId: item.id, sessionName: item.name })}
        activeOpacity={0.7}
      >
        <View style={[styles.cardIconBox, { backgroundColor: '#0d948815' }]}>
          <FontAwesomeIcon icon={faFileAlt} size={18} color="#0d9488" />
        </View>

        <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#dcfce7' : '#f3f4f6' }]}>
                    <Text style={[styles.statusText, { color: item.is_active ? '#166534' : '#374151' }]}>
                    {item.is_active ? 'ACTIVE' : 'DRAFT'}
                    </Text>
                </View>
            </View>

            <View style={styles.dateContainer}>
                <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                </Text>
                {item.target_grade && (
                    <Text style={[styles.gradeText, { color: '#6366f1' }]}> • {item.target_grade}</Text>
                )}
            </View>

            <View style={styles.statusLine}>
                {totalAllocations === 0 ? (
                    <View style={[styles.miniStatus, { backgroundColor: '#fff7ed' }]}>
                        <FontAwesomeIcon icon={faExclamationTriangle} size={10} color="#f59e0b" />
                        <Text style={[styles.miniStatusText, { color: '#c2410c' }]}>Seats not assigned</Text>
                    </View>
                ) : !item.notifications_sent ? (
                    <View style={[styles.miniStatus, { backgroundColor: '#f0fdfa' }]}>
                        <FontAwesomeIcon icon={faInfoCircle} size={10} color="#0d9488" />
                        <Text style={[styles.miniStatusText, { color: '#0f766e' }]}>Seats Allocated • Ready to Notify</Text>
                    </View>
                ) : (
                    <View style={[styles.miniStatus, { backgroundColor: '#f0fdf4' }]}>
                        <FontAwesomeIcon icon={faCheckCircle} size={10} color="#10b981" />
                        <Text style={[styles.miniStatusText, { color: '#15803d' }]}>Seats Allocated • Notified</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardFooter}>
                <View style={styles.statsContainer}>
                    <View style={styles.stat}>
                        <FontAwesomeIcon icon={faFileAlt} size={12} color={theme.textSecondary} />
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>{item.exam_papers?.length || 0}</Text>
                    </View>
                    <View style={styles.stat}>
                        <FontAwesomeIcon icon={faChair} size={12} color={theme.textSecondary} />
                        <Text style={[styles.statText, { color: theme.textSecondary }]}>{totalAllocations}</Text>
                    </View>
                </View>
                
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <FontAwesomeIcon icon={faTrash} size={14} color={theme.error || '#ef4444'} />
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.chevron}>
            <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.border} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && sessions.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#0f766e', '#14b8a6']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <FontAwesomeIcon icon={faArrowLeft} size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.heroTitle}>Exam Sessions</Text>
                </View>
                <Text style={styles.heroDescription}>
                    Create and manage examination schedules and seating.
                </Text>
            </View>
            <View style={styles.iconBadge}>
                <FontAwesomeIcon icon={faClipboardCheck} size={24} color="rgba(255,255,255,0.9)" />
            </View>
        </View>
      </LinearGradient>

      <FlatList
        data={sessions}
        renderItem={renderSessionItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesomeIcon icon={faClipboardCheck} size={64} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No exam sessions found.</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>Tap the + button to create a new session.</Text>
          </View>
        }
      />

      <FAB onPress={() => navigation.navigate('CreateExamSession')} theme={theme} />
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
    padding: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 8,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
    marginLeft: 12,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 8,
    marginLeft: 4,
  },
  backButton: {
      padding: 4,
  },
  iconBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  cardIconBox: {
      width: 44,
      height: 44,
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
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  dateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  gradeText: {
      fontSize: 12,
      fontWeight: 'bold',
  },
  statusLine: {
      marginBottom: 12,
      flexDirection: 'row',
  },
  miniStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 6,
  },
  miniStatusText: {
      fontSize: 10,
      fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsContainer: {
      flexDirection: 'row',
      gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chevron: {
      marginLeft: 12,
      opacity: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    opacity: 0.5,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySubText: {
      fontSize: 14,
      marginTop: 8,
  },
  deleteButton: {
      padding: 6,
      backgroundColor: 'rgba(239, 68, 68, 0.05)',
      borderRadius: 6,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  }
});