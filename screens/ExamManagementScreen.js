import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  fetchExamSessions,
  deleteExamSession,
} from '../services/examService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faPlus,
  faFileAlt,
  faChair,
  faTrash,
  faArrowLeft,
  faClipboardCheck,
  faChevronRight,
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import ExamManagementScreenSkeleton from '../components/skeletons/ExamManagementScreenSkeleton';

const FAB = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.fab}
    activeOpacity={0.8}
  >
    <FontAwesomeIcon icon={faPlus} size={20} color="white" />
  </TouchableOpacity>
);

export default function ExamManagementScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
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
      'Delete Session',
      'Are you sure? This will delete all papers and allocations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExamSession(id);
              loadSessions();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderSessionItem = ({ item }) => {
    const totalAllocations =
      item.exam_papers?.reduce(
        (acc, paper) => acc + (paper.exam_seat_allocations?.[0]?.count || 0),
        0
      ) || 0;

    const totalInvigilators =
      item.exam_papers?.reduce(
        (acc, paper) => acc + (paper.exam_invigilators?.[0]?.count || 0),
        0
      ) || 0;

    const unsentPapers = item.exam_papers?.filter(p => !p.notifications_sent) || [];
    const unsentCount = unsentPapers.length;

    return (
      <View style={styles.glowWrapper}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: theme.cardBackground }]}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('ExamSessionDetail', {
              sessionId: item.id,
              sessionName: item.name,
            })
          }
        >
          {/* LEFT ICON */}
          <LinearGradient
            colors={['#14b8a6', '#0d9488']}
            style={styles.iconBadge}
          >
            <FontAwesomeIcon icon={faFileAlt} size={18} color="#fff" />
          </LinearGradient>

          {/* MAIN CONTENT */}
          <View style={styles.cardBody}>
            {/* TITLE */}
            <View style={styles.titleRow}>
              <Text
                style={[styles.cardTitle, { color: theme.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: item.is_active ? '#dcfce7' : '#f3f4f6' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: item.is_active ? '#166534' : '#374151' },
                  ]}
                >
                  {item.is_active ? 'ACTIVE' : 'DRAFT'}
                </Text>
              </View>
            </View>

            {/* META */}
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {new Date(item.start_date).toLocaleDateString()} –{' '}
              {new Date(item.end_date).toLocaleDateString()}
              {item.target_grade ? ` • ${item.target_grade}` : ''}
            </Text>

            {/* BADGES */}
            <View style={styles.badgeRow}>
              {totalAllocations === 0 && (
                <View style={[styles.alertBadge, { backgroundColor: '#fff1f2' }]}>
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    size={10}
                    color="#e11d48"
                  />
                  <Text style={[styles.alertText, { color: '#be123c' }]}>
                    Seats Missing
                  </Text>
                </View>
              )}

              {totalInvigilators === 0 && (
                <View style={[styles.alertBadge, { backgroundColor: '#fff7ed' }]}>
                  <FontAwesomeIcon
                    icon={faExclamationTriangle}
                    size={10}
                    color="#f59e0b"
                  />
                  <Text style={[styles.alertText, { color: '#c2410c' }]}>
                    Staff Missing
                  </Text>
                </View>
              )}

              {totalAllocations > 0 && (
                unsentCount > 0 ? (
                  <View style={[styles.alertBadge, { backgroundColor: '#f0fdfa' }]}>
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      size={10}
                      color="#0d9488"
                    />
                    <Text style={[styles.alertText, { color: '#0f766e' }]}>
                      {unsentCount} to Notify
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.alertBadge, { backgroundColor: '#f0fdf4' }]}>
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      size={10}
                      color="#16a34a"
                    />
                    <Text style={[styles.alertText, { color: '#166534' }]}>
                      Notified
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* FOOTER */}
            <View style={styles.footerRow}>
              <View style={styles.statPill}>
                <FontAwesomeIcon
                  icon={faFileAlt}
                  size={10}
                  color={theme.textSecondary}
                />
                <Text
                  style={[styles.statText, { color: theme.textSecondary }]}
                >
                  {item.exam_papers?.length || 0} Papers
                </Text>
              </View>

              <View style={styles.statPill}>
                <FontAwesomeIcon
                  icon={faChair}
                  size={10}
                  color={theme.textSecondary}
                />
                <Text
                  style={[styles.statText, { color: theme.textSecondary }]}
                >
                  {totalAllocations} Seats
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                hitSlop={10}
                style={styles.deleteGhost}
              >
                <FontAwesomeIcon icon={faTrash} size={12} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* CHEVRON */}
          <FontAwesomeIcon
            icon={faChevronRight}
            size={12}
            color={theme.border}
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <LinearGradient
        colors={['#0d9488', '#14b8a6']}
        style={[
          styles.heroContainer,
          { paddingTop: insets.top + 20 },
        ]}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backRow}
            >
              <FontAwesomeIcon
                icon={faArrowLeft}
                size={12}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.backText}>
                Back to Management Hub
              </Text>
            </TouchableOpacity>

            <Text style={styles.heroTitle}>Exam Hub</Text>
            <Text style={styles.heroDescription}>
              Coordinate schedules, seating plans, and staff
              invigilation.
            </Text>
          </View>

          <View style={styles.roleBadge}>
            <FontAwesomeIcon
              icon={faClipboardCheck}
              size={16}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.roleText}>EXAMS</Text>
          </View>
        </View>
      </LinearGradient>

      {loading && sessions.length === 0 ? (
        <ExamManagementScreenSkeleton />
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSessionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>EXAM SESSIONS</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesomeIcon icon={faClipboardCheck} size={64} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No exam sessions found.</Text>
              <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>Tap the + button to create a new session.</Text>
            </View>
          }
        />
      )}

      <FAB
        onPress={() => navigation.navigate('CreateExamSession')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  heroContainer: {
    padding: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heroTextContainer: { flex: 1 },

  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -1,
  },

  heroDescription: {
    color: '#e0f2f1',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  backText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },

  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    alignSelf: 'center',
  },

  roleText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginTop: 24,
  },

  listContent: {
    padding: 20,
    paddingBottom: 100,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.1)',
  },

  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  cardBody: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },

  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },

  statusText: {
    fontSize: 9,
    fontWeight: '900',
  },

  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 10,
  },

  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  alertText: {
    fontSize: 10,
    fontWeight: '700',
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },

  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },

  statText: {
    fontSize: 11,
    fontWeight: '700',
  },

  deleteGhost: {
    marginLeft: 'auto',
    padding: 6,
  },

  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },

  glowWrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 2,

    // iOS glow
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,

    // Android glow
    elevation: 4,
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
});