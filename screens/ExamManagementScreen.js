import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNModal from 'react-native-modal';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import {
  fetchExamSessions,
  deleteExamSession,
  createExamVenue,
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
  faMapMarkerAlt,
  faTimes,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import ExamManagementScreenSkeleton from '../components/skeletons/ExamManagementScreenSkeleton';
import Button from '../components/Button';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateExamSession } from '../services/examService';

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
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Venue state
  const [showVenueModal, setShowVenueModal] = useState(false);
  const [venueName, setVenueName] = useState('');
  const [venueCapacity, setVenueCapacity] = useState('');
  const [venueRows, setVenueRows] = useState('10');
  const [venueCols, setVenueCols] = useState('10');
  const [creatingVenue, setCreatingVenue] = useState(false);

  // Edit Session state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState(new Date());
  const [editTargetGrade, setEditTargetGrade] = useState('');
  const [editIsActive, setEditIsActive] = useState(false);
  const [updatingSession, setUpdatingSession] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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

  const handleCreateVenue = async () => {
    if (!venueName || !venueCapacity) {
      Alert.alert('Error', 'Please fill in name and capacity.');
      return;
    }

    setCreatingVenue(true);
    try {
      await createExamVenue({
        school_id: profile.school_id,
        name: venueName,
        capacity: parseInt(venueCapacity),
        rows: parseInt(venueRows),
        columns: parseInt(venueCols),
      });
      setShowVenueModal(false);
      setVenueName('');
      setVenueCapacity('');
      showToast('Venue created successfully', 'success');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setCreatingVenue(false);
    }
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setEditName(session.name);
    setEditStartDate(new Date(session.start_date));
    setEditEndDate(new Date(session.end_date));
    setEditTargetGrade(session.target_grade || '');
    setEditIsActive(session.is_active);
    setShowEditModal(true);
  };

  const handleUpdateSession = async () => {
    if (!editName) {
      Alert.alert('Error', 'Please enter a session name.');
      return;
    }

    setUpdatingSession(true);
    try {
      await updateExamSession(editingSession.id, {
        name: editName,
        start_date: editStartDate.toISOString().split('T')[0],
        end_date: editEndDate.toISOString().split('T')[0],
        target_grade: editTargetGrade,
        is_active: editIsActive,
      });
      setShowEditModal(false);
      showToast('Session updated successfully', 'success');
      loadSessions();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdatingSession(false);
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

    const isAdmin = profile?.role === 'admin';

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

              {isAdmin && (
                <View style={{ flexDirection: 'row', marginLeft: 'auto', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => handleEditSession(item)}
                    hitSlop={10}
                  >
                    <FontAwesomeIcon icon={faEdit} size={12} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    hitSlop={10}
                  >
                    <FontAwesomeIcon icon={faTrash} size={12} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
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
            <View>
              {profile?.role === 'admin' && (
                <TouchableOpacity 
                  style={[styles.venueButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => setShowVenueModal(true)}
                >
                  <View style={[styles.venueIconBox, { backgroundColor: '#8b5cf6' }]}>
                    <FontAwesomeIcon icon={faMapMarkerAlt} color="white" size={14} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.venueBtnTitle, { color: theme.text }]}>Manage Venues</Text>
                    <Text style={[styles.venueBtnSub, { color: theme.textSecondary }]}>Add halls or classrooms for exams</Text>
                  </View>
                  <FontAwesomeIcon icon={faPlus} color={theme.textSecondary} size={12} />
                </TouchableOpacity>
              )}
              <Text style={styles.sectionTitle}>EXAM SESSIONS</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesomeIcon icon={faClipboardCheck} size={64} color={theme.border} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No exam sessions found.</Text>
              {profile?.role === 'admin' && (
                <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>Tap the + button to create a new session.</Text>
              )}
            </View>
          }
        />
      )}

      {profile?.role === 'admin' && (
        <FAB
          onPress={() => navigation.navigate('CreateExamSession')}
        />
      )}

      {/* Edit Session Modal */}
      <RNModal
        isVisible={showEditModal}
        onBackdropPress={() => setShowEditModal(false)}
        onSwipeComplete={() => setShowEditModal(false)}
        swipeDirection={['down']}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        propagateSwipe
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface || '#ffffff', paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalDragIndicator} />
          
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Exam Session</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeIconBtn}>
              <FontAwesomeIcon icon={faTimes} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>SESSION NAME *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Mid-Year 2026"
                placeholderTextColor={theme.textSecondary}
                value={editName}
                onChangeText={setEditName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>TARGET GRADE (Optional)</Text>
              <View style={[styles.pickerContainer, { backgroundColor: theme.colors.background, borderColor: theme.border }]}>
                <Picker
                  selectedValue={editTargetGrade}
                  onValueChange={(itemValue) => setEditTargetGrade(itemValue)}
                  style={{ color: theme.text }}
                  dropdownIconColor={theme.text}
                >
                  <Picker.Item label="General / All Grades" value="" />
                  {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                    <Picker.Item key={g} label={g} value={g} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>START DATE *</Text>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.border }]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={{ color: theme.text }}>{editStartDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>END DATE *</Text>
                <TouchableOpacity
                  style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.border }]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={{ color: theme.text }}>{editEndDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Active Session</Text>
                <Text style={[styles.switchSub, { color: theme.textSecondary }]}>Visible to students and parents</Text>
              </View>
              <Switch
                value={editIsActive}
                onValueChange={setEditIsActive}
                trackColor={{ false: '#767577', true: '#0d9488' }}
                thumbColor={editIsActive ? '#fff' : '#f4f3f4'}
              />
            </View>

            {showStartPicker && (
              <DateTimePicker value={editStartDate} mode="date" display="default" onChange={(e, d) => { setShowStartPicker(false); if (d) setEditStartDate(d); }} />
            )}
            {showEndPicker && (
              <DateTimePicker value={editEndDate} mode="date" display="default" onChange={(e, d) => { setShowEndPicker(false); if (d) setEditEndDate(d); }} />
            )}

            <View style={{ marginTop: 24 }}>
              <Button title="Update Session" onPress={handleUpdateSession} loading={updatingSession} />
            </View>
          </ScrollView>
        </View>
      </RNModal>

      {/* Create Venue Modal */}
      <RNModal
        isVisible={showVenueModal}
        onBackdropPress={() => setShowVenueModal(false)}
        onSwipeComplete={() => setShowVenueModal(false)}
        swipeDirection={['down']}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        propagateSwipe
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface || '#ffffff', paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalDragIndicator} />
          
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Exam Venue</Text>
            <TouchableOpacity onPress={() => setShowVenueModal(false)} style={styles.closeIconBtn}>
              <FontAwesomeIcon icon={faTimes} size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>VENUE NAME *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Main Hall"
                placeholderTextColor={theme.textSecondary}
                value={venueName}
                onChangeText={setVenueName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>TOTAL CAPACITY *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. 200"
                placeholderTextColor={theme.textSecondary}
                value={venueCapacity}
                onChangeText={setVenueCapacity}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>ROWS</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="10"
                  placeholderTextColor={theme.textSecondary}
                  value={venueRows}
                  onChangeText={setVenueRows}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>COLUMNS</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                  placeholder="10"
                  placeholderTextColor={theme.textSecondary}
                  value={venueCols}
                  onChangeText={setVenueCols}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={{ marginTop: 24 }}>
              <Button title="Create Venue" onPress={handleCreateVenue} loading={creatingVenue} />
            </View>
          </ScrollView>
        </View>
      </RNModal>
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
  venueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 8,
    gap: 16,
  },
  venueIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  venueBtnSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  closeIconBtn: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
});