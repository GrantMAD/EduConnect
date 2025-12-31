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
  RefreshControl
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
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
  faCircleInfo,
  faClock,
  faComment,
  faQuoteLeft
} from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MyChildrenScreenSkeleton, { ChildCardSkeleton } from '../components/skeletons/MyChildrenScreenSkeleton';
import { useGamification } from '../context/GamificationContext';

const { width } = Dimensions.get('window');
const defaultUserImage = require('../assets/user.png');

// --- Helper Components ---

const AttendancePill = ({ status, date, theme }) => {
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
};

const MarkRow = ({ mark, theme }) => {
  let displayValue = mark.mark;
  
  if (mark.score !== null && mark.total_possible !== null && mark.total_possible > 0) {
    displayValue = Math.round((mark.score / mark.total_possible) * 100) + '%';
  } else if (mark.mark && mark.mark.length > 5) {
    const parsed = parseFloat(mark.mark);
    if (!isNaN(parsed)) displayValue = Math.round(parsed) + '%';
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={[styles.markRow, { borderBottomColor: theme.colors.cardBorder }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.markAssessment, { color: theme.colors.text }]} numberOfLines={1}>
            {mark.assessment_name.includes(':') ? mark.assessment_name.split(':')[1].trim() : mark.assessment_name}
          </Text>
          <Text style={[styles.markType, { color: theme.colors.primary }]}>
            {mark.assessment_name.includes(':') ? mark.assessment_name.split(':')[0] : 'Assessment'}
          </Text>
          {(mark.score !== null && mark.total_possible !== null) && (
            <Text style={{ fontSize: 11, color: theme.colors.placeholder, marginTop: 2, fontWeight: '500' }}>
              Score: {mark.score}/{mark.total_possible}
            </Text>
          )}
        </View>
        <View style={[styles.markBadge, { backgroundColor: theme.colors.cardBorder + '40', width: 'auto', minWidth: 44, paddingHorizontal: 8 }]}>
          <Text style={[styles.markValue, { color: theme.colors.text, fontSize: 13 }]}>{displayValue}</Text>
        </View>
      </View>
      {mark.teacher_feedback && (
        <View style={styles.feedbackContainer}>
          <FontAwesomeIcon icon={faComment} size={10} color={theme.colors.primary} style={{ marginRight: 6, marginTop: 2 }} />
          <Text style={[styles.feedbackText, { color: theme.colors.placeholder }]}>
            {mark.teacher_feedback}
          </Text>
        </View>
      )}
    </View>
  );
};

const ClassCard = ({ classInfo, theme }) => {
  const [expanded, setExpanded] = useState(false);

  const attendanceStats = useMemo(() => classInfo.fullAttendance?.reduce((acc, curr) => {
    if (curr.status === 'present') acc.present++;
    if (curr.status !== 'unmarked') acc.total++;
    return acc;
  }, { present: 0, total: 0 }), [classInfo.fullAttendance]);

  const attendanceRate = attendanceStats?.total > 0
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : 0;

  const averageMark = useMemo(() => {
    if (!classInfo.marks?.length) return null;
    
    const validMarks = classInfo.marks.filter(m => 
      (m.score !== null && m.total_possible !== null && m.total_possible > 0) || 
      !isNaN(parseFloat(m.mark))
    );

    if (validMarks.length === 0) return null;

    const sum = validMarks.reduce((acc, curr) => {
      let pct = 0;
      if (curr.score !== null && curr.total_possible !== null && curr.total_possible > 0) {
        pct = (curr.score / curr.total_possible) * 100;
      } else {
        pct = parseFloat(curr.mark) || 0;
      }
      return acc + pct;
    }, 0);

    return Math.round(sum / validMarks.length);
  }, [classInfo.marks]);

  return (
    <View style={[styles.clsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.clsCardHeader}>
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
            <View style={[styles.avgBadge, { backgroundColor: averageMark >= 80 ? '#34C75920' : averageMark >= 60 ? '#FF950020' : '#FF3B3020' }]}>
              <Text style={[styles.avgBadgeText, { color: averageMark >= 80 ? '#34C759' : averageMark >= 60 ? '#FF9500' : '#FF3B30' }]}>
                {averageMark}%
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.clsFooter, { borderTopColor: theme.colors.cardBorder + '60' }]}>
          <View style={styles.footerStat}>
            <FontAwesomeIcon icon={faCalendarCheck} size={12} color={attendanceRate > 85 ? theme.colors.success : '#FF9500'} />
            <Text style={[styles.footerStatText, { color: theme.colors.placeholder }]}>{attendanceRate}% Attendance</Text>
          </View>
          <FontAwesomeIcon icon={expanded ? faChevronUp : faChevronDown} size={14} color={theme.colors.placeholder} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.clsExpanded, { backgroundColor: theme.colors.background + '50' }]}>
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
};

// --- Student Dashboard ---

const StudentDashboard = ({ student, theme, refreshTrigger }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassData = async () => {
      setLoading(true);
      try {
        const { data: classMembersData, error } = await supabase
          .from('class_members')
          .select('id, attendance, class_id, classes (id, name, teacher:users(full_name))')
          .eq('user_id', student.id);

        if (error) throw error;

        const processed = await Promise.all(classMembersData.map(async (member) => {
          const { data: schedules } = await supabase
            .from('class_schedules')
            .select('start_time')
            .eq('class_id', member.class_id)
            .lte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true });

          const { data: marks } = await supabase
            .from('student_marks')
            .select('assessment_name, mark, teacher_feedback, score, total_possible')
            .eq('student_id', student.id)
            .eq('class_id', member.class_id)
            .order('created_at', { ascending: false });

          const fullAttendance = (schedules || []).map(sch => {
            const date = sch.start_time.split('T')[0];
            const status = member.attendance?.[date];
            return {
              date,
              status: status === true ? 'present' : (status === false ? 'absent' : 'unmarked')
            };
          });

          return { ...member, fullAttendance, marks: marks || [] };
        }));

        setClasses(processed);
      } catch (err) {
        console.error('Error fetching student data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassData();
  }, [student.id, refreshTrigger]);

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

  if (loading) return <View style={{ marginTop: 40 }}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  if (classes.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <FontAwesomeIcon icon={faGraduationCap} size={48} color={theme.colors.placeholder + '40'} />
        <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Active Classes</Text>
        <Text style={[styles.emptyStateDesc, { color: theme.colors.placeholder }]}>This student is not enrolled in any classes yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.dashboardContainer}>
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <View style={[styles.statIcon, { backgroundColor: '#007AFF15' }]}><FontAwesomeIcon icon={faGraduationCap} color="#007AFF" size={14} /></View>
          <Text style={[styles.statVal, { color: theme.colors.text }]}>{stats.classes}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>Classes</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <View style={[styles.statIcon, { backgroundColor: '#34C75915' }]}><FontAwesomeIcon icon={faPercentage} color="#34C759" size={14} /></View>
          <Text style={[styles.statVal, { color: theme.colors.text }]}>{stats.avgAttendance}%</Text>
          <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>Attendance</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <View style={[styles.statIcon, { backgroundColor: '#AF52DE15' }]}><FontAwesomeIcon icon={faChartLine} color="#AF52DE" size={14} /></View>
          <Text style={[styles.statVal, { color: theme.colors.text }]}>{stats.marks}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>Assessments</Text>
        </View>
      </View>

      <Text style={[styles.sectionHeading, { color: theme.colors.text }]}>Subject Performance</Text>
      {classes.map((cls, idx) => <ClassCard key={idx} classInfo={cls} theme={theme} />)}
    </View>
  );
};

// --- Admin Components ---

const AdminFamilyCard = ({ parentData, onClick, theme }) => (
  <TouchableOpacity
    onPress={onClick}
    activeOpacity={0.9}
    style={[styles.adminCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
  >
    <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.adminCardHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <Image source={parentData.parent.avatar_url ? { uri: parentData.parent.avatar_url } : defaultUserImage} style={styles.adminAvatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.adminName} numberOfLines={1}>{parentData.parent.full_name}</Text>
        <Text style={styles.adminEmail} numberOfLines={1}>{parentData.parent.email}</Text>
      </View>
    </LinearGradient>
    <View style={styles.adminCardBody}>
      <Text style={styles.adminLabel}>LINKED STUDENTS</Text>
      <View style={styles.childPills}>
        {parentData.children.map(child => (
          <View key={child.id} style={[styles.childPill, { backgroundColor: theme.colors.background }]}>
            <Image source={child.avatar_url ? { uri: child.avatar_url } : defaultUserImage} style={styles.tinyAvatar} />
            <Text style={[styles.childPillText, { color: theme.colors.text }]}>{child.full_name.split(' ')[0]}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.viewAll, { color: '#4F46E5' }]}>View Family Overview →</Text>
    </View>
  </TouchableOpacity>
);

const AdminFamilyDetail = ({ parentData, onBack, theme }) => (
  <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
      <FontAwesomeIcon icon={faArrowLeft} color={theme.colors.placeholder} size={16} />
      <Text style={[styles.backText, { color: theme.colors.placeholder }]}>Back to Family List</Text>
    </TouchableOpacity>

    <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Image source={parentData.parent.avatar_url ? { uri: parentData.parent.avatar_url } : defaultUserImage} style={styles.heroAvatar} />
      <Text style={styles.heroName}>{parentData.parent.full_name}</Text>
      <Text style={styles.heroEmail}>{parentData.parent.email}</Text>
      <View style={styles.badgeRow}>
        <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>Parent Account</Text></View>
        <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{parentData.children.length} Students</Text></View>
      </View>
    </LinearGradient>

    <View style={{ padding: 20 }}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.titleIcon, { backgroundColor: '#4F46E515' }]}><FontAwesomeIcon icon={faGraduationCap} color="#4F46E5" size={16} /></View>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Student Overview</Text>
      </View>

      {parentData.children.map(child => (
        <View key={child.id} style={[styles.adminChildSection, { borderTopColor: theme.colors.cardBorder }]}>
          <View style={styles.adminChildHeader}>
            <Image source={child.avatar_url ? { uri: child.avatar_url } : defaultUserImage} style={styles.adminChildAvatar} />
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
);

// --- Main Page ---

export default function MyChildrenScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userRole, setUserRole] = useState(null);

  // Admin State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      setUserRole(profile?.role);

      if (profile?.role === 'admin') {
        const { data: relationships } = await supabase
          .from('parent_child_relationships')
          .select('parent:users!parent_id(id, full_name, email, avatar_url), child:users!child_id(id, full_name, email, avatar_url)');

        const parentMap = {};
        relationships?.forEach(rel => {
          if (!parentMap[rel.parent.id]) parentMap[rel.parent.id] = { parent: rel.parent, children: [] };
          parentMap[rel.parent.id].children.push(rel.child);
        });
        setParents(Object.values(parentMap));
      } else {
        const { data: rels } = await supabase
          .from('parent_child_relationships')
          .select('child_id')
          .eq('parent_id', user.id);

        if (rels?.length > 0) {
          const { data: students } = await supabase
            .from('users')
            .select('id, full_name, email, avatar_url')
            .in('id', rels.map(r => r.child_id));
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
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    fetchInitialData(true);
  }, []);

  if (loading) return <MyChildrenScreenSkeleton />;

  if (userRole === 'admin') {
    const filtered = parents.filter(p => p.parent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.parent.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {selectedParent ? (
          <AdminFamilyDetail parentData={selectedParent} onBack={() => setSelectedParent(null)} theme={theme} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.parent.id}
            renderItem={({ item }) => <AdminFamilyCard parentData={item} onClick={() => setSelectedParent(item)} theme={theme} />}
            contentContainerStyle={{ padding: 20, paddingTop: 30 }}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListHeaderComponent={
              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.pageTitle, { color: theme.colors.text }]}>Family Connections</Text>
                <Text style={[styles.pageDesc, { color: theme.colors.placeholder }]}>Manage school link accounts.</Text>
                <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
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
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <FontAwesomeIcon icon={faSearch} size={48} color={theme.colors.placeholder + '40'} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No families found matching your search.</Text>
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
        <View style={{ padding: 20, paddingTop: 30 }}>
          <Text style={[styles.pageTitle, { color: theme.colors.text }]}>My Children</Text>
          <Text style={[styles.pageDesc, { color: theme.colors.placeholder }]}>Academic performance overview.</Text>
        </View>

        {children.length === 0 ? (
          <View style={[styles.emptyState, { margin: 20, backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder, padding: 40 }]}>
            <FontAwesomeIcon icon={faUserPlus} size={48} color={theme.colors.primary + '40'} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No Students Linked</Text>
            <Text style={[styles.emptyStateDesc, { color: theme.colors.placeholder }]}>Link a student account to view their progress.</Text>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
              {children.map(child => (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChildId(child.id)}
                  style={[styles.childBtn, {
                    backgroundColor: selectedChildId === child.id ? theme.colors.primary : theme.colors.surface,
                    borderColor: selectedChildId === child.id ? theme.colors.primary : theme.colors.cardBorder
                  }]}
                >
                  <Image source={child.avatar_url ? { uri: child.avatar_url } : defaultUserImage} style={[styles.selectorAvatar, { borderColor: selectedChildId === child.id ? '#ffffff50' : theme.colors.cardBorder }]} />
                  <Text style={[styles.childBtnText, { color: selectedChildId === child.id ? '#FFFFFF' : theme.colors.text }]}>{child.full_name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {selectedChild && (
              <View style={{ padding: 20 }}>
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Image source={selectedChild.avatar_url ? { uri: selectedChild.avatar_url } : defaultUserImage} style={styles.heroAvatar} />
                  <View>
                    <Text style={styles.heroName}>{selectedChild.full_name}</Text>
                    <Text style={styles.heroEmail}>{selectedChild.email}</Text>
                    <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>Student</Text></View>
                  </View>
                </LinearGradient>

                <StudentDashboard student={selectedChild} theme={theme} refreshTrigger={refreshTrigger} />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  pageDesc: { fontSize: 15, marginTop: 4, marginBottom: 12 },
  selectorScroll: { paddingHorizontal: 20, marginBottom: 20 },
  childBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 8, paddingRight: 16, borderRadius: 30, borderWidth: 1, marginRight: 12 },
  selectorAvatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, marginRight: 10 },
  childBtnText: { fontSize: 14, fontWeight: '700' },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 24, marginBottom: 24 },
  heroAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#ffffff40', marginRight: 20 },
  heroName: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
  heroEmail: { fontSize: 14, color: '#E0E7FF', marginBottom: 8 },
  heroBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: '#ffffff20', borderWidth: 1, borderColor: '#ffffff30' },
  heroBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dashboardContainer: {},
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  statBox: { width: (width - 64) / 3, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  sectionHeading: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  clsCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  clsCardHeader: { padding: 16 },
  clsIconNameRow: { flexDirection: 'row', alignItems: 'center' },
  clsIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  clsName: { fontSize: 16, fontWeight: '800' },
  clsTeacher: { fontSize: 13, marginTop: 2 },
  avgBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  avgBadgeText: { fontSize: 12, fontWeight: '800' },
  clsFooter: { marginTop: 16, pt: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerStat: { flexDirection: 'row', alignItems: 'center' },
  footerStatText: { fontSize: 12, fontWeight: '600', marginLeft: 6 },
  clsExpanded: { padding: 16, borderTopWidth: 1, borderTopColor: '#00000005' },
  expandedTitle: { fontSize: 10, fontWeight: '800', color: '#8E8E93', letterSpacing: 1 },
  marksList: { marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  markRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  markAssessment: { fontSize: 14, fontWeight: '700' },
  markType: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  markBadge: { width: 40, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  markValue: { fontSize: 14, fontWeight: '900' },
  attScroll: { marginTop: 8, gap: 8 },
  attPill: { width: 70, alignItems: 'center', padding: 8, borderRadius: 12, borderWidth: 1 },
  attPillDay: { fontSize: 9, fontWeight: '800', marginBottom: 4 },
  attPillDate: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 32, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2 },
  emptyStateTitle: { fontSize: 18, fontWeight: '800', marginTop: 16 },
  emptyStateDesc: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  adminCard: { borderRadius: 24, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  adminCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  adminAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#ffffff30', marginRight: 16 },
  adminName: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  adminEmail: { fontSize: 13, color: '#E0E7FF' },
  adminCardBody: { padding: 16 },
  adminLabel: { fontSize: 10, fontWeight: '800', color: '#8E8E93', letterSpacing: 1, marginBottom: 12 },
  childPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  childPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  tinyAvatar: { width: 20, height: 20, borderRadius: 10, marginRight: 6 },
  childPillText: { fontSize: 12, fontWeight: '600' },
  viewAll: { fontSize: 12, fontWeight: '800', marginTop: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginTop: 16 },
  searchInput: { flex: 1, paddingVertical: 12, marginLeft: 10, fontSize: 15 },
  backBtn: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40 },
  backText: { fontSize: 14, fontWeight: '700', marginLeft: 10 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  heroEmail: { fontSize: 15, color: '#E0E7FF' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  titleIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  adminChildSection: { marginTop: 24, paddingTop: 24, borderTopWidth: 1 },
  adminChildHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  adminChildAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  adminChildName: { fontSize: 16, fontWeight: '800' },
  adminChildEmail: { fontSize: 13 },
  emptyContainer: { padding: 80, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', marginTop: 12, fontSize: 14 },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#007AFF08',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
    marginLeft: 4,
  },
  feedbackText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    flex: 1,
  },
});
