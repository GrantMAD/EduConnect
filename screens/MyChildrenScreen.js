import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Dimensions,
  RefreshControl,
  Modal
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { getAvatarUrl } from '../lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faUser,
  faChalkboardTeacher,
  faCheckCircle,
  faTimesCircle,
  faChevronRight,
  faGraduationCap,
  faCalendarCheck,
  faChartLine,
  faTrophy,
  faPercentage,
  faChevronDown,
  faChevronUp,
  faSearch,
  faArrowLeft,
  faEnvelope,
  faUserPlus,
  faChild,
  faCircleInfo,
  faClock,
  faComment,
  faQuoteLeft,
  faUserFriends,
  faFileSignature,
  faUserEdit,
  faCalendarAlt,
  faExclamationCircle,
  faMapMarkerAlt,
  faChair,
  faTimes,
  faIdCard,
  faBook,
  faBookOpen
} from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MyChildrenScreenSkeleton, { 
  ChildSelectorSkeleton, 
  ChildHeroSkeleton, 
  PerformanceDashboardSkeleton, 
  ExamsDashboardSkeleton 
} from '../components/skeletons/MyChildrenScreenSkeleton';
import { useGamification } from '../context/GamificationContext';
import { supabase } from '../lib/supabase';
import CreateManagedStudentModal from '../components/CreateManagedStudentModal';

// Import services
import { getCurrentUser } from '../services/authService';
import {
  getUserProfile,
  fetchParentChildren,
  fetchAllParentsWithChildren,
  fetchStudentMarks,
  fetchUsersByIdsWithPreferences
} from '../services/userService';
import {
  fetchClassMemberships,
  fetchClassSchedulesForAttendance,
  fetchClassInfo
} from '../services/classService';
import { fetchGradingCategories, fetchGradingCategoriesForClasses, calculateWeightedGrade } from '../services/gradebookService';
import { fetchStudentExamSchedule } from '../services/examService';

const { width } = Dimensions.get('window');

// --- Helper Components ---

const GradeDetailModal = React.memo(({ visible, onClose, mark, theme }) => {
  if (!mark) return null;

  let displayValue = mark.mark;
  let percentage = null;

  if (mark.score !== null && mark.total_possible !== null && mark.total_possible > 0) {
    percentage = Math.round((mark.score / mark.total_possible) * 100);
    displayValue = percentage + '%';
  } else if (mark.mark && mark.mark.length > 5) {
    const parsed = parseFloat(mark.mark);
    if (!isNaN(parsed)) {
      percentage = Math.round(parsed);
      displayValue = percentage + '%';
    }
  }

  const assessmentName = mark.assessment_name?.includes(':') ? mark.assessment_name.split(':')[1].trim() : (mark.assessment_name || 'Assessment');
  const assessmentType = mark.assessment_name?.includes(':') ? mark.assessment_name.split(':')[0] : 'Assessment';

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.cardBorder }]}>
            <View style={[styles.modalIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
              <FontAwesomeIcon icon={faFileSignature} size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Grade Details</Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.placeholder }]}>{assessmentType}</Text>
            </View>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.detailCard}>
              <Text style={[styles.detailLabel, { color: theme.colors.placeholder }]}>ASSESSMENT NAME</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{assessmentName}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.detailCard, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.detailLabel, { color: theme.colors.placeholder }]}>SCORE</Text>
                <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                  {mark.score !== null && mark.total_possible !== null ? `${mark.score} / ${mark.total_possible}` : mark.mark || 'N/A'}
                </Text>
              </View>
              <View style={[styles.detailCard, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.detailLabel, { color: theme.colors.placeholder }]}>PERCENTAGE</Text>
                <Text style={[styles.detailValue, { color: theme.colors.primary }]}>{displayValue}</Text>
              </View>
            </View>

            {mark.teacher_feedback && (
              <View style={[styles.detailCard, { backgroundColor: theme.colors.primary + '05', borderWidth: 1, borderColor: theme.colors.primary + '10' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <FontAwesomeIcon icon={faComment} size={14} color={theme.colors.primary} />
                  <Text style={[styles.detailLabel, { color: theme.colors.primary, marginLeft: 8, marginBottom: 0 }]}>TEACHER FEEDBACK</Text>
                </View>
                <Text style={[styles.feedbackTextLarge, { color: theme.colors.text }]}>"{mark.teacher_feedback}"</Text>
              </View>
            )}

            <View style={[styles.detailCard, { marginTop: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faCalendarAlt} size={14} color={theme.colors.placeholder} />
                <Text style={[styles.detailLabel, { color: theme.colors.placeholder, marginLeft: 8, marginBottom: 0 }]}>RECORDED ON</Text>
              </View>
              <Text style={[styles.dateText, { color: theme.colors.text, marginTop: 4 }]}>
                {new Date(mark.created_at || new Date()).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.modalCloseBtn, { backgroundColor: theme.colors.primary }]}
            onPress={onClose}
          >
            <Text style={styles.modalCloseBtnText}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
});

const StudentClassDetailModal = React.memo(({ isOpen, onClose, classInfo, studentName, theme }) => {
  if (!isOpen || !classInfo) return null;

  // Calculate stats
  const attendanceStats = classInfo.fullAttendance?.reduce((acc, curr) => {
    if (curr.status === 'present') acc.present++;
    if (curr.status !== 'unmarked') acc.total++;
    return acc;
  }, { present: 0, total: 0 });

  const attendanceRate = attendanceStats?.total > 0
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : 0;

  const averageMark = calculateWeightedGrade(classInfo.marks, classInfo.categories);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isOpen}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, padding: 0 }]}>
          {/* Header */}
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            style={[styles.modalHeader, { marginBottom: 0, padding: 24, borderBottomWidth: 0 }]}
          >
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { position: 'absolute', top: 20, right: 20, zIndex: 10 }]}>
              <FontAwesomeIcon icon={faTimes} size={20} color="#fff" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.modalIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900' }}>{classInfo.classes?.name?.charAt(0)}</Text>
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={[styles.modalTitle, { color: '#fff' }]}>{classInfo.classes?.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' }}>{studentName}'s Performance</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView style={{ padding: 20 }}>
            {/* Stats Row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={[styles.detailCard, { flex: 1, backgroundColor: '#ecfdf5', borderColor: '#10b98120', borderWidth: 1 }]}>
                <Text style={[styles.detailLabel, { color: '#059669' }]}>ATTENDANCE</Text>
                <Text style={[styles.detailValue, { color: '#065f46' }]}>{attendanceRate}%</Text>
              </View>
              <View style={[styles.detailCard, { flex: 1, backgroundColor: '#eef2ff', borderColor: '#4f46e520', borderWidth: 1 }]}>
                <Text style={[styles.detailLabel, { color: '#4f46e5' }]}>AVERAGE</Text>
                <Text style={[styles.detailValue, { color: '#3730a3' }]}>{averageMark || '--'}%</Text>
              </View>
            </View>

            <Text style={[styles.expandedTitle, { marginBottom: 12 }]}>INSTRUCTOR</Text>
            <View style={[styles.detailCard, { flexDirection: 'row', alignItems: 'center', marginBottom: 20 }]}>
              <View style={[styles.clsIconBox, { width: 32, height: 32, backgroundColor: theme.colors.primary + '15' }]}>
                <FontAwesomeIcon icon={faChalkboardTeacher} size={14} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '700', color: theme.colors.text }}>{classInfo.classes?.teacher?.full_name || 'N/A'}</Text>
              </View>
              {classInfo.classes?.class_resources?.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    navigation.navigate('StudentClassDashboard', {
                      classId: classInfo.class_id,
                      className: classInfo.classes?.name,
                      studentId: classInfo.user_id,
                      initialTab: 'resources'
                    });
                  }}
                  style={[styles.smallActionBtn, { backgroundColor: theme.colors.primary }]}
                >
                  <FontAwesomeIcon icon={faBookOpen} size={12} color="#fff" />
                  <Text style={styles.smallActionBtnText}>RESOURCES</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.expandedTitle, { marginBottom: 12 }]}>ACADEMIC HISTORY</Text>
            {classInfo.marks?.length > 0 ? (
              <View style={{ marginBottom: 20 }}>
                {classInfo.marks.map((mark, i) => <MarkRow key={i} mark={mark} theme={theme} />)}
              </View>
            ) : (
              <Text style={[styles.emptyDetails, { color: theme.colors.placeholder, marginBottom: 20 }]}>No grades recorded.</Text>
            )}

            <Text style={[styles.expandedTitle, { marginBottom: 12 }]}>ATTENDANCE LOG</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              {classInfo.fullAttendance?.slice().reverse().map((att, i) => (
                <AttendancePill key={i} status={att.status} date={att.date} theme={theme} />
              ))}
            </ScrollView>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

const AttendancePill = React.memo(({ status, date, theme }) => {
  const config = {
    present: { icon: faCheckCircle, color: theme.colors.success, bg: theme.colors.success + '15' },
    absent: { icon: faTimesCircle, color: theme.colors.error, bg: theme.colors.error + '15' },
    unmarked: { icon: faClock, color: theme.colors.placeholder, bg: theme.colors.cardBorder + '30' }
  }[status] || { icon: faClock, color: theme.colors.placeholder, bg: theme.colors.cardBorder + '30' };

  return (
    <View style={[styles.attPill, { backgroundColor: config.bg, borderColor: config.color + '40' }]}>
      <Text style={[styles.attPillDay, { color: theme.colors.placeholder }]}>
        {new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
      </Text>
      <FontAwesomeIcon icon={config.icon} size={14} color={config.color} />
      <Text style={[styles.attPillDate, { color: theme.colors.text }]}>
        {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
      </Text>
    </View>
  );
});

const MarkRow = React.memo(({ mark, theme }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const toggleModal = useCallback(() => setModalVisible(prev => !prev), []);

  let displayValue = mark.mark;

  if (mark.score !== null && mark.total_possible !== null && mark.total_possible > 0) {
    displayValue = Math.round((mark.score / mark.total_possible) * 100) + '%';
  } else if (mark.mark && mark.mark.length > 5) {
    const parsed = parseFloat(mark.mark);
    if (!isNaN(parsed)) displayValue = Math.round(parsed) + '%';
  }

  const assessmentName = mark.assessment_name?.includes(':') ? mark.assessment_name.split(':')[1].trim() : (mark.assessment_name || 'Assessment');
  const assessmentType = mark.category?.name || (mark.assessment_name?.includes(':') ? mark.assessment_name.split(':')[0] : 'Assessment');

  return (
    <>
      <TouchableOpacity
        style={[styles.markRowContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
        onPress={toggleModal}
        activeOpacity={0.7}
      >
        <View style={[styles.markTypeBadge, { backgroundColor: theme.colors.primary + '10' }]}>
          <Text style={[styles.markTypeText, { color: theme.colors.primary }]}>{assessmentType.substring(0, 4).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.markAssessment, { color: theme.colors.text }]} numberOfLines={1}>
            {assessmentName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <FontAwesomeIcon icon={faCalendarAlt} size={10} color={theme.colors.placeholder} />
            <Text style={{ fontSize: 11, color: theme.colors.placeholder, marginLeft: 4, fontWeight: '500' }}>
              {new Date(mark.assessment_date || mark.created_at || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
        <View style={[styles.markValueBadge, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.markValue, { color: theme.colors.text }]}>{displayValue}</Text>
          <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.placeholder} style={{ marginLeft: 8 }} />
        </View>
      </TouchableOpacity>

      <GradeDetailModal
        visible={modalVisible}
        onClose={toggleModal}
        mark={mark}
        theme={theme}
      />
    </>
  );
});

const ClassCard = React.memo(({ classInfo, theme, onPress }) => {
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = useCallback(() => setExpanded(prev => !prev), []);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(classInfo);
    } else {
      toggleExpanded();
    }
  }, [onPress, classInfo, toggleExpanded]);

  const attendanceStats = useMemo(() => classInfo.fullAttendance?.reduce((acc, curr) => {
    if (curr.status === 'present') acc.present++;
    if (curr.status !== 'unmarked') acc.total++;
    return acc;
  }, { present: 0, total: 0 }), [classInfo.fullAttendance]);

  const attendanceRate = attendanceStats?.total > 0
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : 0;

  const averageMark = useMemo(() => {
    return calculateWeightedGrade(classInfo.marks, classInfo.categories);
  }, [classInfo.marks, classInfo.categories]);

  return (
    <View style={[styles.clsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <TouchableOpacity onPress={handlePress} style={styles.clsCardHeader}>
        <View style={styles.clsIconNameRow}>
          <View style={[styles.clsIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
            <FontAwesomeIcon icon={faChalkboardTeacher} size={18} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.clsName, { color: theme.colors.text }]} numberOfLines={1}>
              {classInfo.classes?.name || 'Unknown Class'}
            </Text>
            <Text style={[styles.clsTeacher, { color: theme.colors.placeholder }]} numberOfLines={1}>
              {classInfo.classes?.teacher?.full_name || 'No Teacher Assigned'}
            </Text>
          </View>
          {averageMark !== null && (
            <View style={[styles.avgBadge, { backgroundColor: averageMark >= 80 ? '#ecfdf5' : averageMark >= 60 ? '#fffbeb' : '#fff1f2' }]}>
              <Text style={[styles.avgBadgeText, { color: averageMark >= 80 ? '#059669' : averageMark >= 60 ? '#d97706' : '#e11d48' }]}>
                {averageMark}%
              </Text>
            </View>
          )}
        </View>

          <View style={[styles.clsFooter, { borderTopColor: theme.colors.cardBorder, borderTopWidth: 1 }]}>
            <View style={{ flexDirection: 'column', gap: 4 }}>
              <View style={styles.footerStat}>
                <FontAwesomeIcon icon={faCalendarCheck} size={12} color={attendanceRate > 85 ? '#10b981' : '#f59e0b'} />
                <Text style={[styles.footerStatText, { color: theme.colors.placeholder }]}>{attendanceRate}% Attendance</Text>
              </View>
              <View style={styles.footerStat}>
                <FontAwesomeIcon icon={faBookOpen} size={12} color={classInfo.classes?.class_resources?.length > 0 ? '#6366f1' : '#94a3b8'} />
                <Text style={[styles.footerStatText, { color: classInfo.classes?.class_resources?.length > 0 ? '#6366f1' : theme.colors.placeholder, fontWeight: classInfo.classes?.class_resources?.length > 0 ? '700' : '500' }]}>
                  {classInfo.classes?.class_resources?.length > 0 
                    ? `${classInfo.classes.class_resources.length} Resource${classInfo.classes.class_resources.length === 1 ? '' : 's'}` 
                    : 'No resources linked'}
                </Text>
              </View>
            </View>
            <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} size={14} color={theme.colors.placeholder} />
          </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.clsExpanded, { backgroundColor: theme.colors.background }]}>
          <Text style={styles.expandedTitle}>RECENT GRADES</Text>
          {classInfo.marks?.length > 0 ? (
            <View style={styles.marksList}>
              {classInfo.marks.slice(0, 3).map((mark, i) => <MarkRow key={i} mark={mark} theme={theme} />)}
            </View>
          ) : (
            <Text style={[styles.emptyDetails, { color: theme.colors.placeholder }]}>No grades recorded yet.</Text>
          )}

          <Text style={[styles.expandedTitle, { marginTop: 16 }]}>SESSIONS</Text>
          {classInfo.fullAttendance?.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attScroll}>
              {classInfo.fullAttendance.slice(-5).reverse().map((att, i) => (
                <AttendancePill key={i} status={att.status} date={att.date} theme={theme} />
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.emptyDetails, { color: theme.colors.placeholder }]}>No attendance records.</Text>
          )}
        </View>
      )}
    </View>
  );
});

const CandidateInfoCard = React.memo(({ profile, examCount, theme }) => (
  <View style={[styles.candidateInfoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
    <View style={styles.candidateInfoLeft}>
      <View style={[styles.candidateAvatarBox, { borderColor: theme.colors.cardBorder }]}>
        <Image 
          source={getAvatarUrl(profile?.avatar_url, profile?.email, profile?.id)} 
          style={styles.candidateAvatar} 
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.candidateName, { color: theme.colors.text }]} numberOfLines={1}>{profile?.full_name}</Text>
        <View style={styles.candidateDataRow}>
          <Text style={[styles.candidateLabel, { color: theme.colors.placeholder }]}>NO: <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>{profile?.number || 'N/A'}</Text></Text>
          <Text style={[styles.candidateLabel, { color: theme.colors.placeholder, marginLeft: 12 }]}>GRADE: <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{profile?.grade || 'N/A'}</Text></Text>
        </View>
      </View>
    </View>
    <View style={[styles.examCountBadge, { backgroundColor: theme.colors.primary + '15' }]}>
      <Text style={[styles.examCountLabel, { color: theme.colors.primary }]}>EXAMS</Text>
      <Text style={[styles.examCountValue, { color: theme.colors.primary }]}>{examCount}</Text>
    </View>
  </View>
));

const StudentDashboard = React.memo(({ student, theme, refreshTrigger, initialTab = 'performance', onTabChange }) => {
  const navigation = useNavigation();
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [examSubTab, setExamSubTab] = useState('upcoming');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const handleClassPress = useCallback((cls) => {
    navigation.navigate('StudentClassDashboard', {
      classId: cls.class_id,
      className: cls.classes?.name,
      studentId: student.id
    });
  }, [navigation, student.id]);

  useEffect(() => {
    const fetchClassData = async () => {
      setLoading(true);
      try {
        const [memberships, examsData] = await Promise.all([
          fetchClassMemberships(student.id),
          fetchStudentExamSchedule(student.id)
        ]);

        setExams(examsData || []);

        if (!memberships || memberships.length === 0) {
          setClasses([]);
          return;
        }

        const classIds = memberships.map(m => m.class_id);

        const allSchedules = await fetchClassSchedulesForAttendance(classIds);
        const allMarks = await fetchStudentMarks(student.id, classIds);
        const allCategories = await fetchGradingCategoriesForClasses(classIds);

        const processed = memberships.map((member) => {
          const classSchedules = (allSchedules || []).filter(s => s.class_id === member.class_id);
          const classMarks = (allMarks || []).filter(m => m.class_id === member.class_id);
          const categories = (allCategories || []).filter(c => c.class_id === member.class_id);

          const fullAttendance = classSchedules.map(sch => {
            const date = sch.start_time?.split('T')[0] || '';
            const status = member.attendance?.[date];
            return {
              date,
              status: status === true ? 'present' : (status === false ? 'absent' : 'unmarked')
            };
          });

          return {
            ...member,
            fullAttendance,
            marks: classMarks,
            categories
          };
        });

        setClasses(processed);
      } catch (err) {
        console.error('Error fetching student data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [student.id, refreshTrigger]);

  const categorizedExams = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return {
      upcoming: exams.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date)),
      past: exams.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date))
    };
  }, [exams]);

  const displayExams = categorizedExams[examSubTab];

  const stats = useMemo(() => {
    if (!classes.length) return { classes: 0, marks: 0, avgAttendance: 0 };
    const totalClasses = classes.length;
    const totalMarks = classes.reduce((acc, c) => acc + (c.marks?.length || 0), 0);
    let totalRate = 0, count = 0;

    classes.forEach(c => {
      const att = c.fullAttendance?.reduce((a, cur) => {
        if (cur.status !== 'unmarked') a.total++;
        if (cur.status === 'present') a.present++;
        return a;
      }, { present: 0, total: 0 });
      if (att?.total > 0) { totalRate += (att.present / att.total); count++; }
    });

    return {
      classes: totalClasses,
      marks: totalMarks,
      avgAttendance: count > 0 ? Math.round((totalRate / count) * 100) : 0
    };
  }, [classes]);

  if (loading) {
    return (
      <View style={{ marginTop: 20 }}>
        {activeTab === 'performance' ? <PerformanceDashboardSkeleton /> : <ExamsDashboardSkeleton />}
      </View>
    );
  }

  return (
    <View style={styles.dashboardContainer}>
      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { borderBottomColor: theme.colors.cardBorder }]}>
        <TouchableOpacity
          onPress={() => handleTabChange('performance')}
          style={[styles.tabBtn, activeTab === 'performance' && { borderBottomColor: theme.colors.primary }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'performance' ? theme.colors.primary : theme.colors.placeholder }]}>PERFORMANCE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleTabChange('exams')}
          style={[styles.tabBtn, activeTab === 'exams' && { borderBottomColor: theme.colors.primary }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, { color: activeTab === 'exams' ? theme.colors.primary : theme.colors.placeholder }]}>EXAMS</Text>
            {categorizedExams.upcoming.length > 0 && (
              <View style={[styles.tabCount, { backgroundColor: activeTab === 'exams' ? theme.colors.primary : theme.colors.cardBorder }]}>
                <Text style={styles.tabCountText}>{categorizedExams.upcoming.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'performance' ? (
        classes.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, borderStyle: 'dashed' }]}>
            <FontAwesomeIcon icon={faGraduationCap} size={48} color={theme.colors.placeholder} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Active Classes</Text>
            <Text style={[styles.emptyStateDesc, { color: theme.colors.placeholder }]}>This student is not enrolled in any classes yet.</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#eef2ff' }]}>
                  <FontAwesomeIcon icon={faGraduationCap} color="#4f46e5" size={14} />
                </View>
                <Text style={[styles.statBigVal, { color: theme.colors.text }]}>{stats.classes}</Text>
                <Text style={styles.statSmallLabel}>ENROLLED</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#ecfdf5' }]}>
                  <FontAwesomeIcon icon={faPercentage} color="#10b981" size={14} />
                </View>
                <Text style={[styles.statBigVal, { color: theme.colors.text }]}>{stats.avgAttendance}%</Text>
                <Text style={styles.statSmallLabel}>ATTENDANCE</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#f5f3ff' }]}>
                  <FontAwesomeIcon icon={faChartLine} color="#8b5cf6" size={14} />
                </View>
                <Text style={[styles.statBigVal, { color: theme.colors.text }]}>{stats.marks}</Text>
                <Text style={styles.statSmallLabel}>GRADED</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitleLabel, { color: theme.colors.text }]}>Subject Performance</Text>
            {classes.map((cls, idx) => (
              <ClassCard
                key={idx}
                classInfo={cls}
                theme={theme}
                onPress={handleClassPress}
              />
            ))}
          </>
        )
      ) : (
        <View style={styles.examContainer}>
          <CandidateInfoCard profile={student} examCount={categorizedExams.upcoming.length} theme={theme} />
          
          {/* Sub-Tabs */}
          <View style={[styles.subTabContainer, { backgroundColor: theme.colors.cardBorder + '30' }]}>
            <TouchableOpacity
              onPress={() => setExamSubTab('upcoming')}
              style={[styles.subTabBtn, examSubTab === 'upcoming' && { backgroundColor: theme.colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
            >
              <Text style={[styles.subTabText, { color: examSubTab === 'upcoming' ? theme.colors.primary : theme.colors.placeholder }]}>UPCOMING</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setExamSubTab('past')}
              style={[styles.subTabBtn, examSubTab === 'past' && { backgroundColor: theme.colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }]}
            >
              <Text style={[styles.subTabText, { color: examSubTab === 'past' ? theme.colors.primary : theme.colors.placeholder }]}>PAST</Text>
            </TouchableOpacity>
          </View>

          {displayExams.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, borderStyle: 'dashed' }]}>
              <FontAwesomeIcon icon={faCalendarAlt} size={48} color={theme.colors.placeholder} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No {examSubTab} Exams</Text>
              <Text style={[styles.emptyStateDesc, { color: theme.colors.placeholder }]}>No {examSubTab} examination timetable has been found.</Text>
            </View>
          ) : (
            displayExams.map((exam, idx) => (
              <View key={idx} style={[styles.examCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, opacity: examSubTab === 'past' ? 0.7 : 1 }]}>
                <View style={styles.examDateBox}>
                  <Text style={styles.examMonth}>{new Date(exam.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
                  <Text style={[styles.examDay, { color: theme.colors.text }]}>{new Date(exam.date).getDate()}</Text>
                </View>
                <View style={styles.examMain}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <View style={[styles.paperCodeBadge, { backgroundColor: examSubTab === 'upcoming' ? theme.colors.primary + '15' : theme.colors.cardBorder + '50' }]}>
                      <Text style={[styles.paperCodeText, { color: examSubTab === 'upcoming' ? theme.colors.primary : theme.colors.placeholder }]}>{exam.paper_code}</Text>
                    </View>
                    <Text style={[styles.examTime, { color: theme.colors.placeholder }]}>
                      <FontAwesomeIcon icon={faClock} size={10} color={theme.colors.placeholder} /> {exam.start_time.slice(0, 5)}
                    </Text>
                  </View>
                  <Text style={[styles.examSubject, { color: theme.colors.text }]} numberOfLines={1}>{exam.subject_name}</Text>

                  <View style={[styles.examVenueRow, { borderTopColor: theme.colors.cardBorder }]}>
                    <View style={styles.venueStat}>
                      <FontAwesomeIcon icon={faMapMarkerAlt} size={10} color={examSubTab === 'upcoming' ? "#0d9488" : theme.colors.placeholder} />
                      <Text style={[styles.venueStatText, { color: examSubTab === 'upcoming' ? "#0d9488" : theme.colors.placeholder }]}>{exam.venue_name || 'TBA'}</Text>
                    </View>
                    <View style={styles.venueStat}>
                      <FontAwesomeIcon icon={faChair} size={10} color={examSubTab === 'upcoming' ? "#0d9488" : theme.colors.placeholder} />
                      <Text style={[styles.venueStatText, { color: examSubTab === 'upcoming' ? "#0d9488" : theme.colors.placeholder }]}>SEAT: {exam.seat_label || 'TBA'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <StudentClassDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedClass(null);
        }}
        classInfo={selectedClass}
        studentName={student.full_name}
        theme={theme}
      />
    </View>
  );
});

const AdminFamilyCard = React.memo(({ parentData, onClick, theme }) => (
  <TouchableOpacity
    onPress={onClick}
    activeOpacity={0.9}
    style={[styles.adminCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
  >
    <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.adminCardHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <Image source={getAvatarUrl(parentData.parent.avatar_url, parentData.parent.email, parentData.parent.id)} style={styles.adminAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.adminName} numberOfLines={1}>{parentData.parent.full_name}</Text>
        <Text style={styles.adminEmail} numberOfLines={1}>{parentData.parent.email}</Text>
      </View>
    </LinearGradient>
    <View style={styles.adminCardBody}>
      <Text style={styles.adminLabel}>LINKED STUDENTS</Text>
      <View style={styles.childPills}>
        {parentData.children.map(child => (
          <View key={child.id} style={[styles.childPill, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Image source={getAvatarUrl(child.avatar_url, child.email, child.id)} style={styles.tinyAvatar} />
            <Text style={[styles.childPillText, { color: theme.colors.text }]}>{child.full_name?.split(' ')[0] || 'Student'}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.viewAll, { color: '#4F46E5' }]}>View Family Overview →</Text>
    </View>
  </TouchableOpacity>
));

const AdminFamilyDetail = React.memo(({ parentData, onBack, theme }) => (
  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
      <FontAwesomeIcon icon={faArrowLeft} color={theme.colors.placeholder} size={16} />
      <Text style={[styles.backText, { color: theme.colors.placeholder }]}>Back to Family List</Text>
    </TouchableOpacity>

    <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Image source={getAvatarUrl(parentData.parent.avatar_url, parentData.parent.email, parentData.parent.id)} style={styles.heroAvatar} />
      <View>
        <Text style={styles.heroName}>{parentData.parent.full_name}</Text>
        <Text style={styles.heroEmail}>{parentData.parent.email}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>Parent Account</Text></View>
          <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{parentData.children.length} Students</Text></View>
        </View>
      </View>
    </LinearGradient>

    <View style={{ padding: 20 }}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.titleIcon, { backgroundColor: '#4F46E515' }]}><FontAwesomeIcon icon={faGraduationCap} color="#4F46E5" size={16} /></View>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Student Overview</Text>
      </View>

      {parentData.children.map(child => (
        <View key={child.id} style={[styles.adminChildSection, { borderTopColor: theme.colors.cardBorder, borderTopWidth: 1 }]}>
          <View style={styles.adminChildHeader}>
            <Image source={getAvatarUrl(child.avatar_url, child.email, child.id)} style={styles.adminChildAvatar} />
            <View>
              <Text style={[styles.adminChildName, { color: theme.colors.text }]}>{child.full_name}</Text>
              <Text style={[styles.adminChildEmail, { color: theme.colors.placeholder }]}>{child.email}</Text>
            </View>
          </View>
          <StudentDashboard student={child} theme={theme} />
        </View>
      ))}
    </View>
  </ScrollView>
));

const MyChildrenScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(route.params?.studentId || null);
  const [activeTab, setActiveTab] = useState(route.params?.activeTab || 'performance');
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userRole, setUserRole] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState(null);

  // Sync state with route params (for notifications)
  useEffect(() => {
    if (route.params?.studentId) {
      setSelectedChildId(route.params.studentId);
    }
  }, [route.params?.studentId]);

  const fetchInitialData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;

      const profile = await getUserProfile(authUser.id);
      setUserRole(profile?.role);

      if (profile?.role === 'admin') {
        const parentsData = await fetchAllParentsWithChildren();
        setParents(parentsData);
      } else {
        const childIds = await fetchParentChildren(authUser.id);

        if (childIds?.length > 0) {
          const { data: students } = await supabase
            .from('users')
            .select('id, full_name, email, avatar_url, grade, is_managed')
            .in('id', childIds);

          setChildren(students || []);
          if (students?.length > 0 && !selectedChildId) setSelectedChildId(students[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    fetchInitialData(true);
  }, [fetchInitialData]);

  const selectParent = useCallback((parent) => setSelectedParent(parent), []);
  const clearSelectedParent = useCallback(() => setSelectedParent(null), []);
  const selectChild = useCallback((childId) => setSelectedChildId(childId), []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroContainer}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>My Children</Text>
              <Text style={styles.heroDescription}>
                Academic performance and attendance overview.
              </Text>
            </View>
            <View style={[styles.heroActionBtn, { opacity: 0.5 }]}>
              <FontAwesomeIcon icon={faUserPlus} size={14} color="#4f46e5" />
            </View>
          </View>
        </LinearGradient>

        <MyChildrenScreenSkeleton />
      </View>
    );
  }

  if (userRole === 'admin') {
    const filtered = parents.filter(p => p.parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.parent.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {selectedParent ? (
          <AdminFamilyDetail parentData={selectedParent} onBack={clearSelectedParent} theme={theme} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.parent.id}
            renderItem={({ item }) => <AdminFamilyCard parentData={item} onClick={() => selectParent(item)} theme={theme} />}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListHeaderComponent={
              <View>
                <LinearGradient
                  colors={['#4f46e5', '#7c3aed']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroContainer}
                >
                  <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                      <Text style={styles.heroTitle}>Family Connections</Text>
                      <Text style={styles.heroDescription}>
                        Manage parent-child links across the school community.
                      </Text>
                    </View>
                    <View style={styles.statusBadge}>
                      <FontAwesomeIcon icon={faUserFriends} size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.statusBadgeValue}>{parents.length}</Text>
                    </View>
                  </View>
                </LinearGradient>

                <View style={{ paddingHorizontal: 20 }}>
                  <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faSearch} color={theme.colors.placeholder} size={16} />
                    <TextInput
                      style={[styles.searchInput, { color: theme.colors.text }]}
                      placeholder="Search parents..."
                      placeholderTextColor={theme.colors.placeholder}
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                    />
                  </View>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesomeIcon icon={faSearch} size={48} color={theme.colors.placeholder} style={{ opacity: 0.3 }} />
                <Text style={[styles.emptyText, { color: theme.colors.text }]}>No families found matching your search.</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        }
      >
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroContainer}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>My Children</Text>
              <Text style={styles.heroDescription}>
                Academic performance and attendance overview.
              </Text>
            </View>
            <TouchableOpacity style={styles.heroActionBtn} onPress={() => navigation.navigate('Search')}>
              <FontAwesomeIcon icon={faUserPlus} size={14} color="#4f46e5" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {children.length === 0 ? (
          <View style={[styles.emptyState, { margin: 20, backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, padding: 40, borderStyle: 'dashed' }]}>
            <FontAwesomeIcon icon={faUserPlus} size={48} color={theme.colors.placeholder} style={{ opacity: 0.3 }} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Students Linked</Text>
            <Text style={[styles.emptyStateDesc, { color: theme.colors.placeholder }]}>Link or create a child profile to track their progress.</Text>
            <View style={{ flexDirection: 'column', gap: 12, marginTop: 24, width: '100%' }}>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.modalCloseBtnText}>Link Existing Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: '#f97316' }]}
                onPress={() => setIsCreateModalOpen(true)}
              >
                <Text style={styles.modalCloseBtnText}>Create Child Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
              {children.map(child => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => selectChild(child.id)}
                  style={[styles.childBtn, {
                    backgroundColor: selectedChildId === child.id ? theme.colors.primary : theme.colors.card,
                    borderColor: selectedChildId === child.id ? theme.colors.primary : theme.colors.cardBorder
                  }]}
                >
                  <Image source={getAvatarUrl(child.avatar_url, child.email, child.id)} style={[styles.selectorAvatar, { borderColor: selectedChildId === child.id ? '#ffffff50' : theme.colors.cardBorder }]} />
                  <View>
                    <Text style={[styles.childBtnText, { color: selectedChildId === child.id ? '#FFFFFF' : theme.colors.text }]}>{child.full_name?.split(' ')[0] || 'Student'}</Text>
                    <Text style={{ fontSize: 8, color: selectedChildId === child.id ? '#ffffff80' : theme.colors.placeholder, fontWeight: '800' }}>{child.is_managed ? 'MANAGED' : 'ACCOUNT'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {/* Add child buttons */}
              <TouchableOpacity
                onPress={() => navigation.navigate('Search')}
                style={[styles.childBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderStyle: 'dashed', paddingRight: 12 }]}
              >
                <FontAwesomeIcon icon={faUserPlus} size={14} color={theme.colors.placeholder} style={{ marginRight: 0 }} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsCreateModalOpen(true)}
                style={[styles.childBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderStyle: 'dashed', paddingRight: 12 }]}
              >
                <FontAwesomeIcon icon={faChild} size={14} color={theme.colors.placeholder} style={{ marginRight: 0 }} />
              </TouchableOpacity>
            </ScrollView>

            {selectedChild && (
              <View style={{ padding: 20 }}>
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.childHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Image
                    source={getAvatarUrl(selectedChild.avatar_url, selectedChild.email, selectedChild.id)}
                    style={styles.heroAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.heroName}>{selectedChild.full_name || 'Unknown Student'}</Text>
                    <Text style={styles.heroEmail}>{selectedChild.email || 'No email provided'}</Text>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>Student</Text></View>
                      <TouchableOpacity 
                        onPress={() => setActiveTab('exams')}
                        style={styles.hallTicketBtn}
                      >
                        <FontAwesomeIcon icon={faIdCard} size={10} color="#4F46E5" />
                        <Text style={styles.hallTicketBtnText}>View Hall Ticket</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>

                <StudentDashboard
                  student={selectedChild}
                  theme={theme}
                  refreshTrigger={refreshTrigger}
                  initialTab={activeTab}
                  onTabChange={setActiveTab}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
      <CreateManagedStudentModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRefresh={onRefresh}
        user={user}
        profile={profile}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    padding: 24,
    paddingTop: 40,
    marginBottom: 20,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -1,
  },
  heroDescription: {
    color: '#e0e7ff',
    fontSize: 14,
    fontWeight: '500',
  },
  heroActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusBadgeValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  selectorScroll: { paddingHorizontal: 20, marginBottom: 24 },
  childBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 8, paddingRight: 16, borderRadius: 30, borderWidth: 1, marginRight: 12 },
  selectorAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, marginRight: 10 },
  childBtnText: { fontSize: 14, fontWeight: '700' },
  childHero: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 32, marginBottom: 24 },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 32, marginBottom: 24 },
  heroAvatar: { width: 70, height: 70, borderRadius: 24, borderWidth: 3, borderColor: '#ffffff40', marginRight: 20 },
  heroName: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  heroEmail: { fontSize: 14, color: '#E0E7FF', marginBottom: 8 },
  heroBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: '#ffffff20', borderWidth: 1, borderColor: '#ffffff30' },
  heroBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dashboardContainer: {},
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statItem: { flex: 1, padding: 16, borderRadius: 24, alignItems: 'center' },
  statIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statBigVal: { fontSize: 20, fontWeight: '900', marginBottom: 2 },
  statSmallLabel: { fontSize: 8, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  sectionTitleLabel: { fontSize: 18, fontWeight: '900', marginBottom: 16, letterSpacing: -0.5 },
  clsCard: { borderRadius: 24, marginBottom: 16, overflow: 'hidden' },
  clsCardHeader: { padding: 20 },
  clsIconNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  clsIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  clsName: { fontSize: 16, fontWeight: '800' },
  clsTeacher: { fontSize: 13, marginTop: 2 },
  avgBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  avgBadgeText: { fontSize: 12, fontWeight: '800' },
  clsFooter: { paddingVertical: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerStat: { flexDirection: 'row', alignItems: 'center' },
  footerStatText: { fontSize: 12, fontWeight: '600', marginLeft: 8 },
  clsExpanded: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  expandedTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 12 },
  marksList: { borderRadius: 16, overflow: 'hidden' },
  markRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  markAssessment: { fontSize: 14, fontWeight: '700' },
  markType: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', marginTop: 2, letterSpacing: 0.5 },
  markBadge: { borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  markValue: { fontWeight: '900' },
  attScroll: { gap: 10, paddingVertical: 4 },
  attPill: { width: 70, alignItems: 'center', padding: 10, borderRadius: 16, borderWidth: 1 },
  attPillDay: { fontSize: 8, fontWeight: '900', marginBottom: 6, letterSpacing: 0.5 },
  attPillDate: { fontSize: 10, fontWeight: '800', marginTop: 6 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, borderRadius: 32 },
  emptyStateTitle: { fontSize: 18, fontWeight: '900', marginTop: 16 },
  emptyStateDesc: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  adminCard: { borderRadius: 32, marginBottom: 16, overflow: 'hidden' },
  adminCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  adminAvatar: { width: 50, height: 50, borderRadius: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', marginRight: 16 },
  adminName: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  adminEmail: { fontSize: 13, color: '#E0E7FF' },
  adminCardBody: { padding: 20 },
  adminLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 12 },
  childPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  childPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  tinyAvatar: { width: 20, height: 20, borderRadius: 10, marginRight: 8 },
  childPillText: { fontSize: 12, fontWeight: '700' },
  viewAll: { fontSize: 12, fontWeight: '900', marginTop: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginTop: 12, marginBottom: 20 },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 12, fontSize: 15, fontWeight: '500' },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40 },
  backText: { fontSize: 14, fontWeight: '700', marginLeft: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  titleIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  adminChildSection: { marginTop: 24, paddingTop: 24 },
  adminChildHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  adminChildAvatar: { width: 48, height: 48, borderRadius: 16, marginRight: 16 },
  adminChildName: { fontSize: 18, fontWeight: '900' },
  adminChildEmail: { fontSize: 13, fontWeight: '500' },
  emptyContainer: { padding: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 12, fontSize: 16, fontWeight: '600' },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  feedbackText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    flex: 1,
  },
  subTabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  subTabText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  smallActionBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  // New Styles
  markRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  markTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 45,
    alignItems: 'center',
  },
  markTypeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  markValueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  modalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  modalBody: {
    marginBottom: 20,
  },
  detailCard: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  feedbackTextLarge: {
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '500',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCloseBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  tabBtn: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tabCount: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tabCountText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
  },
  examContainer: {
    gap: 12,
  },
  examCard: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
  },
  examDateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    marginRight: 16,
  },
  examMonth: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
  },
  examDay: {
    fontSize: 20,
    fontWeight: '900',
  },
  examMain: {
    flex: 1,
  },
  paperCodeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  paperCodeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  examTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  examSubject: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  examVenueRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 16,
  },
  venueStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueStatText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  hallTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  hallTicketBtnText: {
    color: '#4F46E5',
    fontSize: 10,
    fontWeight: '800',
  },
  candidateInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  candidateInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  candidateAvatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    marginRight: 12,
    overflow: 'hidden',
  },
  candidateAvatar: {
    width: '100%',
    height: '100%',
  },
  candidateName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  candidateDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  candidateLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  examCountBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 70,
  },
  examCountLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  examCountValue: {
    fontSize: 18,
    fontWeight: '900',
  }
});

export default React.memo(MyChildrenScreen);
