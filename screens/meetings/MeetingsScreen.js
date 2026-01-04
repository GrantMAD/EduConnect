import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faPlus,
  faUser,
  faHandshake,
  faTrash,
  faChevronRight,
  faInfoCircle,
  faVideo,
  faMapMarkerAlt,
  faPhone,
  faGraduationCap,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import ManagementListSkeleton from '../../components/skeletons/ManagementListSkeleton';
import CreatePTMSlotsModal from '../../components/PTM/CreatePTMSlotsModal';
import BookPTMModal from '../../components/PTM/BookPTMModal';
import MeetingDetailModal from '../../components/PTM/MeetingDetailModal';
import LinearGradient from 'react-native-linear-gradient';

const defaultUserImage = require('../../assets/user.png');

const EmptyState = React.memo(({ icon, title, description, theme }) => {
  return (
    <View style={styles.emptyContainer}>
      <FontAwesomeIcon icon={icon} size={48} color={theme.colors.placeholder} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.emptyDescription, { color: theme.colors.placeholder }]}>{description}</Text>
    </View>
  );
});

const UpcomingMeetingsView = React.memo(({ bookings, isTeacher, onCancel, onView, theme }) => {
  if (bookings.length === 0) {
    return <EmptyState icon={faHandshake} title="No meetings" description="Your upcoming sessions will appear here." theme={theme} />;
  }

  return (
    <View style={styles.grid}>
      {bookings.map(booking => {
        const startTime = new Date(booking.slot?.start_time);
        const otherParty = isTeacher ? booking.parent : booking.slot?.teacher;

        return (
          <TouchableOpacity
            key={booking.id}
            onPress={() => onView(booking)}
            style={[styles.meetingCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
          >
            <View style={[styles.cardHeader, { borderBottomColor: theme.colors.cardBorder }]}>
              <View>
                <Text style={[styles.cardDate, { color: theme.colors.text }]}>
                  {startTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text style={[styles.cardTime, { color: theme.colors.placeholder }]}>
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                <Text style={[styles.typeBadgeText, { color: theme.colors.primary }]}>{booking.slot?.meeting_type?.replace('_', ' ')}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.personRow}>
                <Image
                  source={otherParty?.avatar_url ? { uri: otherParty.avatar_url } : defaultUserImage}
                  style={styles.smallAvatar}
                />
                <View>
                  <Text style={[styles.personRole, { color: theme.colors.placeholder }]}>{isTeacher ? 'Parent' : 'Teacher'}</Text>
                  <Text style={[styles.personName, { color: theme.colors.text }]}>{otherParty?.full_name}</Text>
                </View>
              </View>
              <View style={styles.personRow}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
                  <FontAwesomeIcon icon={faUser} size={12} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.personRole, { color: theme.colors.placeholder }]}>Student</Text>
                  <Text style={[styles.personName, { color: theme.colors.text }]}>{booking.student?.full_name}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <TouchableOpacity onPress={() => onCancel(booking)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel Meeting</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const TeacherAvailabilityView = React.memo(({ slots, onDelete, theme }) => {
  if (slots.length === 0) {
    return <EmptyState icon={faCalendarAlt} title="No availability" description="Set your slots for parents to book." theme={theme} />;
  }

  return (
    <View style={styles.list}>
      {slots.map(slot => (
        <View key={slot.id} style={[styles.slotItem, { backgroundColor: theme.colors.cardBackground, borderBottomColor: theme.colors.cardBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.slotDate, { color: theme.colors.text }]}>
              {new Date(slot.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Text style={[styles.slotTime, { color: theme.colors.placeholder }]}>
              {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.slotStatus}>
            {slot.is_booked ? (
              <Text style={styles.bookedText}>Booked</Text>
            ) : (
              <Text style={[styles.availableText, { color: theme.colors.placeholder }]}>Available</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => onDelete(slot.id)}
            disabled={slot.is_booked}
            style={styles.deleteBtn}
          >
            <FontAwesomeIcon icon={faTrash} color={slot.is_booked ? theme.colors.placeholder : '#FF3B30'} size={16} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
});

const ParentBrowseView = React.memo(({ teachers, onSelect, theme }) => {
  if (teachers.length === 0) {
    return <EmptyState icon={faGraduationCap} title="No teachers" description="We couldn't find any teachers for your children." theme={theme} />;
  }

  return (
    <View style={styles.grid}>
      {teachers.map(teacher => (
        <TouchableOpacity
          key={teacher.id}
          onPress={() => onSelect(teacher)}
          style={[styles.teacherCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
        >
          <View style={styles.teacherInfoContainer}>
            <Image
              source={teacher.avatar_url ? { uri: teacher.avatar_url } : defaultUserImage}
              style={styles.teacherAvatar}
            />
            <Text style={[styles.teacherName, { color: theme.colors.text }]}>{teacher.full_name}</Text>
            <Text style={[styles.teacherEmail, { color: theme.colors.placeholder }]}>{teacher.email}</Text>
          </View>
          <View style={[styles.bookBtn, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.bookBtnText}>View Slots</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
});

const MeetingsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const { showToast } = useToast();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past' | 'availability' | 'browse'

  useEffect(() => {
    const getAuthData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setProfile(profileData);
      }
    };
    getAuthData();
  }, []);

  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [childrenTeachers, setChildrenTeachers] = useState([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';
  const isParent = profile?.role === 'parent';

  const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    return bookings.reduce((acc, booking) => {
      const startTime = new Date(booking.slot?.start_time);
      if (startTime < now) {
        acc.pastBookings.push(booking);
      } else {
        acc.upcomingBookings.push(booking);
      }
      return acc;
    }, { upcomingBookings: [], pastBookings: [] });
  }, [bookings]);

  const fetchTeacherData = useCallback(async () => {
    if (!user) return;
    const { data: slotsData } = await supabase
      .from('ptm_slots')
      .select('*')
      .eq('teacher_id', user.id)
      .order('start_time', { ascending: true });
    setSlots(slotsData || []);

    const { data: bookingsData } = await supabase
      .from('ptm_bookings')
      .select(`
                *,
                slot:ptm_slots(*),
                parent:users!parent_id(full_name, email, avatar_url),
                student:users!student_id(full_name, avatar_url)
            `)
      .eq('ptm_slots.teacher_id', user.id)
      .order('created_at', { ascending: false });
    setBookings(bookingsData || []);
  }, [user]);

  const fetchParentData = useCallback(async () => {
    if (!user) return;
    const { data: bookingsData } = await supabase
      .from('ptm_bookings')
      .select(`
                *,
                slot:ptm_slots(*, teacher:users!teacher_id(full_name, email, avatar_url)),
                student:users!student_id(full_name, avatar_url)
            `)
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false });
    setBookings(bookingsData || []);

    const { data: relationships } = await supabase
      .from('parent_child_relationships')
      .select('child_id')
      .eq('parent_id', user.id);

    if (relationships && relationships.length > 0) {
      const childIds = relationships.map(r => r.child_id);
      const { data: teachersData } = await supabase
        .from('class_members')
        .select(`
                    class_id,
                    classes!inner(
                        id, name,
                        teacher:users!teacher_id(id, full_name, email, avatar_url)
                    )
                `)
        .in('user_id', childIds);

      const uniqueTeachers = [];
      const teacherIds = new Set();
      teachersData?.forEach(item => {
        const teacher = item.classes?.teacher;
        if (teacher && !teacherIds.has(teacher.id)) {
          teacherIds.add(teacher.id);
          uniqueTeachers.push(teacher);
        }
      });
      setChildrenTeachers(uniqueTeachers);
    }
  }, [user]);

  const fetchInitialData = useCallback(async () => {
    if (!user || !profile) return;
    try {
      if (isTeacher) {
        await fetchTeacherData();
      } else if (isParent) {
        await fetchParentData();
      }
    } catch (error) {
      console.error('Error fetching PTM data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, profile, isTeacher, isParent, fetchTeacherData, fetchParentData]);

  useEffect(() => {
    if (user && profile) {
      fetchInitialData();
    }
  }, [user, profile, activeTab, fetchInitialData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInitialData();
  }, [fetchInitialData]);

  const handleDeleteSlot = useCallback(async (slotId) => {
    Alert.alert(
      'Remove Slot',
      'Are you sure? Any existing booking for it will also be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: existingBooking } = await supabase
                .from('ptm_bookings')
                .select('parent_id, student:users!student_id(full_name)')
                .eq('slot_id', slotId)
                .maybeSingle();

              const { error } = await supabase.from('ptm_slots').delete().eq('id', slotId);
              if (error) throw error;

              if (existingBooking) {
                await supabase.from('notifications').insert([{
                  user_id: existingBooking.parent_id,
                  type: 'ptm_cancellation',
                  title: 'Meeting Cancelled',
                  message: `The teacher has cancelled the meeting session regarding ${existingBooking.student.full_name}.`,
                  related_user_id: user.id,
                  is_read: false
                }]);
              }
              setSlots(prev => prev.filter(s => s.id !== slotId));
              showToast('Slot removed', 'success');
            } catch (e) {
              showToast('Failed to delete slot', 'error');
            }
          }
        }
      ]
    );
  }, [user, showToast]);

  const handleCancelBooking = useCallback(async (booking) => {
    Alert.alert(
      'Cancel Meeting',
      'Are you sure you want to cancel this meeting?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('ptm_bookings').delete().eq('id', booking.id);
              if (error) throw error;

              const notifyUserId = isTeacher ? booking.parent_id : booking.slot.teacher_id;
              await supabase.from('notifications').insert([{
                user_id: notifyUserId,
                type: 'ptm_cancellation',
                title: 'Meeting Cancelled',
                message: `${profile.full_name} has cancelled the scheduled meeting regarding ${booking.student.full_name}.`,
                related_user_id: user.id,
                is_read: false
              }]);

              setBookings(prev => prev.filter(b => b.id !== booking.id));
              showToast('Meeting cancelled', 'success');
              onRefresh(); 
            } catch (e) {
              showToast('Failed to cancel meeting', 'error');
            }
          }
        }
      ]
    );
  }, [user, profile, isTeacher, showToast, onRefresh]);

  const renderTabButton = useCallback((id, label, icon) => (
    <TouchableOpacity
      onPress={() => setActiveTab(id)}
      style={[
        styles.tabButton,
        activeTab === id && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }
      ]}
    >
      <FontAwesomeIcon icon={icon} size={14} color={activeTab === id ? theme.colors.primary : theme.colors.placeholder} style={{ marginRight: 8 }} />
      <Text style={[styles.tabText, { color: activeTab === id ? theme.colors.primary : theme.colors.placeholder }]}>{label}</Text>
    </TouchableOpacity>
  ), [activeTab, theme.colors]);

  const handleViewBooking = useCallback((b) => {
    setSelectedBooking(b);
    setIsDetailModalOpen(true);
  }, []);

  const handleSelectTeacher = useCallback((t) => {
    setSelectedTeacher(t);
    setIsBookModalOpen(true);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#0891b2', '#1d4ed8']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.heroTitle}>Meetings</Text>
                </View>
                <Text style={styles.heroDescription}>
                    Coordinate and manage check-ins between parents and teachers.
                </Text>
            </View>
            {isTeacher && (
                <TouchableOpacity
                    style={styles.heroButton}
                    onPress={() => setIsCreateModalOpen(true)}
                >
                    <FontAwesomeIcon icon={faPlus} size={14} color="#0891b2" />
                    <Text style={styles.heroButtonText}>Slots</Text>
                </TouchableOpacity>
            )}
        </View>
      </LinearGradient>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {renderTabButton('upcoming', 'Upcoming', faHandshake)}
          {renderTabButton('past', 'Past', faCalendarAlt)}
          {isTeacher && renderTabButton('availability', 'Availability', faCalendarAlt)}
          {isParent && renderTabButton('browse', 'Book', faPlus)}
        </ScrollView>
      </View>

      <View style={styles.scrollContent}>
        {loading ? (
          <ManagementListSkeleton />
        ) : (
          <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'upcoming' && (
              <UpcomingMeetingsView
                bookings={upcomingBookings}
                isTeacher={isTeacher}
                onCancel={handleCancelBooking}
                onView={handleViewBooking}
                theme={theme}
              />
            )}
            {activeTab === 'past' && (
              <UpcomingMeetingsView
                bookings={pastBookings}
                isTeacher={isTeacher}
                onCancel={() => {}} // Past meetings usually can't be cancelled in the same way, or maybe just hidden
                onView={handleViewBooking}
                theme={theme}
              />
            )}
            {activeTab === 'availability' && isTeacher && (
              <TeacherAvailabilityView
                slots={slots}
                onDelete={handleDeleteSlot}
                theme={theme}
              />
            )}
            {activeTab === 'browse' && isParent && (
              <ParentBrowseView
                teachers={childrenTeachers}
                onSelect={handleSelectTeacher}
                theme={theme}
              />
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        )}
      </View>

      <CreatePTMSlotsModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRefresh={fetchTeacherData}
      />

      <BookPTMModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setSelectedTeacher(null);
        }}
        teacher={selectedTeacher}
        onRefresh={fetchParentData}
      />

      <MeetingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        isTeacher={isTeacher}
      />
    </View>
  );
}

export default React.memo(MeetingsScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: {
    padding: 20,
    marginBottom: 0,
    elevation: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  heroContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  heroTextContainer: {
      flex: 1,
      paddingRight: 10,
  },
  heroTitle: {
      color: '#fff',
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 6,
  },
  heroDescription: {
      color: '#cffafe',
      fontSize: 14,
  },
  heroButton: {
      backgroundColor: '#fff',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
  },
  heroButtonText: {
      color: '#0891b2',
      fontWeight: 'bold',
      marginLeft: 6,
      fontSize: 14,
  },
  backButton: { marginRight: 8 },
  tabsContainer: { borderBottomWidth: 1, borderBottomColor: '#eee', marginTop: 12 },
  tabButton: { paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  tabText: { fontWeight: 'bold', fontSize: 13 },
  scrollContent: { flex: 1, padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  meetingCard: { width: '100%', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDate: { fontWeight: 'bold', fontSize: 16 },
  cardTime: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  cardBody: { padding: 16 },
  personRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  personRole: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  personName: { fontSize: 14, fontWeight: 'bold' },
  cardFooter: { padding: 12, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)' },
  cancelBtnText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 12 },
  list: { width: '100%' },
  slotItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  slotDate: { fontWeight: 'bold', fontSize: 14 },
  slotTime: { fontSize: 12 },
  bookedText: { color: '#34C759', fontWeight: 'bold', fontSize: 12 },
  availableText: { fontSize: 12 },
  deleteBtn: { padding: 8 },
  teacherCard: { width: '48%', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 16, minHeight: 200, justifyContent: 'space-between' },
  teacherInfoContainer: { alignItems: 'center', width: '100%' },
  teacherAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 12 },
  teacherName: { fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  teacherEmail: { fontSize: 11, textAlign: 'center', marginBottom: 16 },
  bookBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, width: '100%' },
  bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptyDescription: { fontSize: 14, textAlign: 'center', marginTop: 8 }
});