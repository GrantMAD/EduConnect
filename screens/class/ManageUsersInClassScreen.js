import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Image,
  Switch,
  Dimensions
} from "react-native";
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../context/SchoolContext';
import { useRoute } from "@react-navigation/native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ManageUsersInClassScreenSkeleton, { SkeletonPiece } from '../../components/skeletons/ManageUsersInClassScreenSkeleton';
import {
  faPlusCircle,
  faMinusCircle,
  faEdit,
  faClock,
  faUserGraduate,
  faCalendarAlt,
  faUserPlus,
  faArrowLeft,
  faClipboardList,
  faFileAlt,
  faTag,
  faGraduationCap,
  faCheckCircle,
  faTimesCircle,
  faQuestionCircle,
  faComment,
  faChevronLeft,
  faPlus,
  faChevronRight,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Calendar } from "react-native-calendars";
import MarksModal from '../../components/MarksModal';
import ManageMarksModal from '../../components/ManageMarksModal';
import { useGamification } from '../../context/GamificationContext';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');
const defaultUserImage = require("../../assets/user.png");

const getDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ManageUsersInClassScreen({ navigation }) {
  const route = useRoute();
  const { classId, className } = route.params;

  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const { user } = useAuth();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const insets = useSafeAreaInsets();

  const [classMembers, setClassMembers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [classSchedules, setClassSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(null);
  const [isMarksModalVisible, setMarksModalVisible] = useState(false);
  const [expandedStudents, setExpandedStudents] = useState({});
  const [studentMarks, setStudentMarks] = useState({});
  const [isManageMarksModalVisible, setManageMarksModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [tempStartTime, setTempStartTime] = useState("");
  const [tempEndTime, setTempEndTime] = useState("");
  const [tempClassInfo, setTempClassInfo] = useState("");

  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState(null);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newClassInfo, setNewClassInfo] = useState('');
  const [classSubject, setClassSubject] = useState('');

  const classStudentIds = classMembers.map((member) => member.users.id);
  const availableStudents = allStudents.filter(
    (student) => !classStudentIds.includes(student.id)
  );

  const fetchClassMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("class_members")
        .select("id, role, attendance, users (id, full_name, email, avatar_url)")
        .eq("class_id", classId)
        .eq("role", "student");

      if (error) throw error;
      setClassMembers(data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch class details.", 'error');
    }
  }, [classId, showToast]);

  const fetchClassSchedules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("class_schedules")
        .select("id, start_time, end_time, class_info")
        .eq("class_id", classId)
        .order("start_time", { ascending: true });
      if (error) throw error;
      setClassSchedules(data || []);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch class schedules.", 'error');
    }
  }, [classId, showToast]);

  const fetchClassDetails = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('subject')
        .eq('id', classId)
        .single();

      if (error) throw error;
      if (data) {
        setClassSubject(data.subject);
      }
    } catch (error) {
      console.error("Failed to fetch class subject:", error);
    }
  }, [classId, showToast]);

  useEffect(() => {
    setLoading(true);
    if (schoolId && classId) {
      Promise.all([
        fetchClassMembers(),
        fetchAllStudents(),
        fetchClassSchedules(),
        fetchClassDetails(),
      ]).finally(() => setLoading(false));
    }
  }, [schoolId, classId, fetchClassMembers, fetchClassSchedules, fetchClassDetails]);

  const fetchAllStudents = async () => {
    setFetchingStudents(true);
    try {
      let query = supabase
        .from("users")
        .select("id, full_name, email, avatar_url")
        .eq("school_id", schoolId)
        .eq("role", "student");
      if (searchQuery) query = query.ilike("full_name", `%${searchQuery}%`);

      const { data, error } = await query;
      if (error) throw error;

      setAllStudents(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingStudents(false);
    }
  };

  const fetchStudentMarks = async (studentId, classId) => {
    try {
      const { data, error } = await supabase
        .from('student_marks')
        .select('*')
        .eq('student_id', studentId)
        .eq('class_id', classId);

      if (error) throw error;

      setStudentMarks(prevMarks => ({
        ...prevMarks,
        [studentId]: data,
      }));
    } catch (error) {
      console.error("Error fetching student marks:", error);
    }
  };

  const addStudentToClass = async (studentId) => {
    setSaving(true);
    try {
      const { error } = await supabase.from("class_members").insert([
        {
          class_id: classId,
          user_id: studentId,
          school_id: schoolId,
          role: "student",
        },
      ]);
      if (error) throw error;
      fetchClassMembers();
      showToast("Student added to class.", 'success');
    } catch (error) {
      console.error(error);
      showToast("Failed to add student.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeStudentFromClass = async (studentId) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("class_members")
        .delete()
        .eq("class_id", classId)
        .eq("user_id", studentId);
      if (error) throw error;
      fetchClassMembers();
      showToast("Student removed from class.", 'success');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAttendanceChange = async (member, status) => {
    if (!selectedScheduleDate) return;
    const { id: memberId, attendance, users: student } = member;

    const updatedMembers = classMembers.map((m) =>
      m.id === memberId
        ? {
          ...m,
          attendance: {
            ...m.attendance,
            [selectedScheduleDate]: status,
          },
        }
        : m
    );
    setClassMembers(updatedMembers);

    const newAttendance = { ...attendance, [selectedScheduleDate]: status };
    try {
      const { error } = await supabase
        .from("class_members")
        .update({ attendance: newAttendance })
        .eq("id", memberId);

      if (error) {
        showToast("Failed to save attendance.", 'error');
        setClassMembers(classMembers);
        throw error;
      }

      if (status === false) {
        try {
          const studentName = student?.full_name || 'Your child';
          const studentId = student?.id;
          const sessionDate = selectedScheduleDate;

          let parentIds = [];
          const { data: rpcParents, error: rpcError } = await supabase
            .rpc('get_parents_of_students', { p_student_ids: [studentId] });

          if (!rpcError && rpcParents) {
            parentIds = rpcParents.map(rp => rp.parent_id);
          } else {
            const { data: relationships } = await supabase
              .from('parent_child_relationships')
              .select('parent_id')
              .eq('child_id', studentId);
            if (relationships) parentIds = relationships.map(r => r.parent_id);
          }

          if (parentIds.length > 0) {
            const notifications = parentIds.map(pid => ({
              user_id: pid,
              type: 'student_absence',
              title: 'Attendance Alert',
              message: `${studentName} was marked absent from ${className} today (${sessionDate}).`,
              data: { student_id: studentId, class_id: classId, date: sessionDate },
              related_user_id: user.id,
              created_by: user.id,
              is_read: false
            }));

            await supabase.from('notifications').insert(notifications);
          }
        } catch (e) { }
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

  const handleEditTimeChange = (text, isStart) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let newText = cleaned;
    if (cleaned.length > 2) {
      newText = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
    }
    if (isStart) setTempStartTime(newText);
    else setTempEndTime(newText);
  };

  const handleNewTimeChange = (text, isStart) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let newText = cleaned;
    if (cleaned.length > 2) {
      newText = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
    }
    if (isStart) setNewStartTime(newText);
    else setNewEndTime(newText);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setTempStartTime(formatTime(schedule.start_time));
    setTempEndTime(formatTime(schedule.end_time));
    setTempClassInfo(schedule.class_info || "");
    setEditModalVisible(true);
  };

  const handleUpdateSchedule = async () => {
    if (!selectedSchedule) return;

    const [startHours, startMinutes] = tempStartTime.split(":").map(Number);
    const [endHours, endMinutes] = tempEndTime.split(":").map(Number);
    if ([startHours, startMinutes, endHours, endMinutes].some(isNaN)) {
      return showToast("Enter a valid time in HH:MM format.", 'error');
    }

    const startTime = new Date(selectedSchedule.start_time);
    startTime.setHours(startHours, startMinutes);
    const endTime = new Date(selectedSchedule.end_time);
    endTime.setHours(endHours, endMinutes);

    if (startTime >= endTime) return showToast("End time must be after start time.", 'error');

    setSaving(true);
    try {
      const { error } = await supabase
        .from("class_schedules")
        .update({ start_time: startTime.toISOString(), end_time: endTime.toISOString(), class_info: tempClassInfo })
        .eq("id", selectedSchedule.id);
      if (error) throw error;

      fetchClassSchedules();
      setEditModalVisible(false);
      showToast("Schedule updated successfully.", 'success');
    } catch (error) {
      console.error(error);
      showToast("Failed to update schedule.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const openAddScheduleModal = () => {
    setNewScheduleDate(null);
    setNewStartTime('');
    setNewEndTime('');
    setNewClassInfo('');
    setAddModalVisible(true);
  }

  const handleDayPress = (day) => {
    setNewScheduleDate(day.dateString);
  };

  const handleAddSchedule = async () => {
    if (!newScheduleDate || !newStartTime || !newEndTime) {
      return showToast("Please select a date and enter start/end times.", 'error');
    }

    const [startHours, startMinutes] = newStartTime.split(":").map(Number);
    const [endHours, endMinutes] = newEndTime.split(":").map(Number);

    if ([startHours, startMinutes, endHours, endMinutes].some(isNaN)) {
      return showToast("Enter a valid time in HH:MM format.", 'error');
    }

    const startTime = new Date(newScheduleDate);
    startTime.setHours(startHours, startMinutes);
    const endTime = new Date(newScheduleDate);
    endTime.setHours(endHours, endMinutes);

    if (startTime >= endTime) {
      return showToast("End time must be after start time.", 'error');
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !schoolId) throw new Error('Session invalid');

      const { error } = await supabase.from("class_schedules").insert({
        class_id: classId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        title: className,
        description: classSubject,
        class_info: newClassInfo,
        school_id: schoolId,
        created_by: user.id,
      });

      if (error) throw error;

      fetchClassSchedules();
      setAddModalVisible(false);
      showToast("New session added successfully.", 'success');
    } catch (error) {
      console.error(error);
      showToast("Failed to add new session.", 'error');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = async () => {
    if (!selectedScheduleDate) return;
    setSaving(true);
    try {
      const updates = classMembers.map(member => {
        const currentAttendance = member.attendance || {};
        return {
          ...member,
          attendance: {
            ...currentAttendance,
            [selectedScheduleDate]: true
          }
        };
      });

      setClassMembers(updates);

      const promises = updates.map(member =>
        supabase
          .from('class_members')
          .update({ attendance: member.attendance })
          .eq('id', member.id)
      );

      await Promise.all(promises);
      awardXP('attendance_submission', 15);
      showToast('All students marked present. +15 XP', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update attendance.', 'error');
      fetchClassMembers();
    } finally {
      setSaving(false);
    }
  };

  const handleCloseMarksModal = () => {
    setMarksModalVisible(false);
  };

  const handleOpenManageMarksModal = (member) => {
    setSelectedStudent(member.users);
    setManageMarksModalVisible(true);
    fetchStudentMarks(member.users.id, classId);
  };

  const handleCloseManageMarksModal = () => {
    setManageMarksModalVisible(false);
    setSelectedStudent(null);
  };

  const renderSchedule = ({ item }) => (
    <TouchableOpacity
      style={[styles.sessionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
      activeOpacity={0.7}
      onPress={() => setSelectedScheduleDate(getDateString(item.start_time))}
    >
      <View style={styles.sessionLeft}>
        <View style={[styles.sessionIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
          <FontAwesomeIcon icon={faClock} size={16} color={theme.colors.primary} />
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={[styles.sessionDate, { color: theme.colors.text }]}>{new Date(item.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
          <Text style={[styles.sessionTime, { color: theme.colors.placeholder }]}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleEditSchedule(item)} style={styles.sessionEditBtn}>
        <FontAwesomeIcon icon={faEdit} size={16} color={theme.colors.placeholder} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderStudent = ({ item }) => {
    const student = item.users;
    const attendanceStatus = item.attendance?.[selectedScheduleDate] ?? null;
    const isExpanded = expandedStudents[student.id];

    return (
      <View style={[styles.studentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
        <TouchableOpacity onPress={() => setExpandedStudents(prev => ({ ...prev, [student.id]: !prev[student.id] }))}>
          <View style={styles.studentHeader}>
            <Image source={student.avatar_url ? { uri: student.avatar_url } : defaultUserImage} style={styles.studentAvatar} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.studentName, { color: theme.colors.text }]}>{student.full_name}</Text>
              <Text style={[styles.studentEmail, { color: theme.colors.placeholder }]}>{student.email}</Text>
            </View>

            <View style={styles.attGrid}>
              <TouchableOpacity
                onPress={() => handleAttendanceChange(item, true)}
                style={[styles.attBtn, attendanceStatus === true && { backgroundColor: '#10b981' }]}
              >
                <FontAwesomeIcon icon={faCheckCircle} size={14} color={attendanceStatus === true ? '#fff' : '#10b981'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleAttendanceChange(item, false)}
                style={[styles.attBtn, attendanceStatus === false && { backgroundColor: '#ef4444' }]}
              >
                <FontAwesomeIcon icon={faTimesCircle} size={14} color={attendanceStatus === false ? '#fff' : '#ef4444'} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleAttendanceChange(item, null)}
                style={[styles.attBtn, attendanceStatus === null && { backgroundColor: theme.colors.primary }]}
              >
                <FontAwesomeIcon icon={faQuestionCircle} size={14} color={attendanceStatus === null ? '#fff' : theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedMarks}>
            <View style={styles.marksHeaderRow}>
              <Text style={styles.marksTitle}>ACADEMIC RECORDS</Text>
              <TouchableOpacity onPress={() => handleOpenManageMarksModal(item)}>
                <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '900' }}>MANAGE</Text>
              </TouchableOpacity>
            </View>

            {studentMarks[student.id] && studentMarks[student.id].length > 0 ? (
              studentMarks[student.id].map((mark, i) => (
                <View key={i} style={[styles.markItem, { borderBottomColor: theme.colors.cardBorder + '30' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.markName, { color: theme.colors.text }]}>{mark.assessment_name}</Text>
                    {mark.teacher_feedback && <Text style={[styles.markFeedback, { color: theme.colors.placeholder }]}>{mark.teacher_feedback}</Text>}
                  </View>
                  <View style={[styles.markValueBox, { backgroundColor: theme.colors.primary + '10' }]}>
                    <Text style={[styles.markValue, { color: theme.colors.primary }]}>{mark.mark}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyMarks, { color: theme.colors.placeholder }]}>No marks recorded yet.</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    if (loading && !selectedScheduleDate) {
      return (
        <View style={{ padding: 20 }}>
          <SkeletonPiece style={{ width: '100%', height: 200, borderRadius: 32 }} />
          <SkeletonPiece style={{ width: '100%', height: 100, borderRadius: 24, marginTop: 20 }} />
        </View>
      );
    }

    if (!selectedScheduleDate) {
      return (
        <View>
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroContainer}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHero}>
                    <FontAwesomeIcon icon={faChevronLeft} size={18} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.heroTitle}>Class Hub</Text>
                </View>
                <Text style={styles.heroDescription}>
                  Management portal for {className}. Select a session to proceed.
                </Text>
              </View>
              <TouchableOpacity onPress={openAddScheduleModal} style={styles.heroActionBtn}>
                <FontAwesomeIcon icon={faPlus} size={14} color="#4f46e5" />
                <Text style={styles.heroActionText}>New</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={{ padding: 20 }}>
            <Text style={styles.sectionTitle}>SESSIONS & CALENDAR</Text>
            <FlatList
              scrollEnabled={false}
              data={classSchedules}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSchedule}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No scheduled sessions yet.</Text>}
            />
          </View>
        </View>
      );
    }

    return (
      <View>
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroContainer}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setSelectedScheduleDate(null)} style={styles.backButtonHero}>
                  <FontAwesomeIcon icon={faArrowLeft} size={18} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.heroTitle}>Attendance</Text>
              </View>
              <Text style={styles.heroDescription}>
                Marking register for {new Date(selectedScheduleDate).toLocaleDateString()}.
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{classMembers.length} STUDENTS</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 20 }}>
          <View style={styles.actionBar}>
            <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: '#10b981' }]} onPress={markAllPresent}>
              <FontAwesomeIcon icon={faCheckCircle} size={14} color="#fff" />
              <Text style={styles.mainActionText}>MARK ALL PRESENT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: theme.colors.primary }]} onPress={() => setMarksModalVisible(true)}>
              <FontAwesomeIcon icon={faPlusCircle} size={14} color="#fff" />
              <Text style={styles.mainActionText}>ENTER MARKS</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>STUDENT ROSTER</Text>
          <FlatList
            scrollEnabled={false}
            data={classMembers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderStudent}
            ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No students enrolled.</Text>}
          />

          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>ENROLL STUDENTS</Text>
            <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                value={searchQuery}
                onChangeText={(t) => { setSearchQuery(t); fetchAllStudents(); }}
                placeholder="Search for students..."
                placeholderTextColor={theme.colors.placeholder}
              />
            </View>
            <FlatList
              scrollEnabled={false}
              data={availableStudents}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={[styles.enrollCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                  <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={styles.smallAvatar} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.enrollName, { color: theme.colors.text }]}>{item.full_name}</Text>
                    <Text style={[styles.enrollEmail, { color: theme.colors.placeholder }]}>{item.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => addStudentToClass(item.id)} style={[styles.enrollBtn, { backgroundColor: theme.colors.primary + '15' }]}>
                    <FontAwesomeIcon icon={faPlus} size={12} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={[]}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      />

      <MarksModal
        visible={isMarksModalVisible}
        onClose={handleCloseMarksModal}
        classId={classId}
        classMembers={classMembers}
      />

      <ManageMarksModal
        visible={isManageMarksModalVisible}
        onClose={handleCloseManageMarksModal}
        student={selectedStudent}
        classId={classId}
      />

      {/* Edit Schedule Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Session</Text>
            <View style={styles.timePickerRow}>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>START</Text>
                <TextInput style={[styles.timeInp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} value={tempStartTime} onChangeText={(t) => handleEditTimeChange(t, true)} />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.timeLabel}>END</Text>
                <TextInput style={[styles.timeInp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} value={tempEndTime} onChangeText={(t) => handleEditTimeChange(t, false)} />
              </View>
            </View>
            <TextInput
              style={[styles.modalInfoInp, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
              multiline placeholder="Session details..." value={tempClassInfo} onChangeText={setTempClassInfo}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditModalVisible(false)}><Text style={styles.modalCancelText}>CANCEL</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { backgroundColor: theme.colors.primary }]} onPress={handleUpdateSchedule}><Text style={styles.modalSaveText}>SAVE</Text></TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <View style={[styles.modalBoxLarge, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>New Session</Text>
            <Calendar 
              onDayPress={handleDayPress} 
              hideExtraDays={true}
              markedDates={{ [newScheduleDate]: { selected: true, selectedColor: theme.colors.primary } }} 
              theme={{ calendarBackground: theme.colors.surface, dayTextColor: theme.colors.text, monthTextColor: theme.colors.text }} 
            />
            {newScheduleDate && (
              <View style={{ marginTop: 20 }}>
                <View style={styles.timePickerRow}>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeLabel}>START</Text>
                    <TextInput style={[styles.timeInp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} value={newStartTime} onChangeText={(t) => handleNewTimeChange(t, true)} />
                  </View>
                  <View style={styles.timeCol}>
                    <Text style={styles.timeLabel}>END</Text>
                    <TextInput style={[styles.timeInp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} value={newEndTime} onChangeText={(t) => handleNewTimeChange(t, false)} />
                  </View>
                </View>
                <TextInput
                  style={[styles.modalInfoInp, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                  multiline placeholder="Additional info..." value={newClassInfo} onChangeText={setNewClassInfo}
                />
              </View>
            )}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAddModalVisible(false)}><Text style={styles.modalCancelText}>CANCEL</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, { backgroundColor: theme.colors.primary }]} onPress={handleAddSchedule}><Text style={styles.modalSaveText}>CREATE</Text></TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: {
    padding: 24,
    paddingTop: 40,
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
  backButtonHero: { marginRight: 12 },
  heroActionBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  heroActionText: {
    color: '#4f46e5',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  statusBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 16, marginLeft: 4 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  sessionLeft: { flexDirection: 'row', alignItems: 'center' },
  sessionIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sessionDate: { fontSize: 15, fontWeight: '800' },
  sessionTime: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sessionEditBtn: { padding: 8 },
  actionBar: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  mainActionBtn: { flex: 1, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  mainActionText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  studentCard: { borderRadius: 24, padding: 16, marginBottom: 12 },
  studentHeader: { flexDirection: 'row', alignItems: 'center' },
  studentAvatar: { width: 44, height: 44, borderRadius: 14 },
  studentName: { fontSize: 15, fontWeight: '800' },
  studentEmail: { fontSize: 11, fontWeight: '500' },
  attGrid: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  attBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)' },
  expandedMarks: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  marksHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  marksTitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  markItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  markName: { fontSize: 13, fontWeight: '700' },
  markFeedback: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  markValueBox: { width: 44, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  markValue: { fontSize: 12, fontWeight: '900' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 50, borderRadius: 16, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600' },
  enrollCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 8 },
  smallAvatar: { width: 36, height: 36, borderRadius: 10 },
  enrollName: { fontSize: 14, fontWeight: '700' },
  enrollEmail: { fontSize: 11 },
  enrollBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', padding: 24, borderRadius: 32 },
  modalBoxLarge: { width: '90%', padding: 24, borderRadius: 32 },
  modalTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 24 },
  timePickerRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  timeCol: { flex: 1 },
  timeLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', marginBottom: 8, textAlign: 'center' },
  timeInp: { height: 50, borderRadius: 14, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  modalInfoInp: { height: 80, borderRadius: 16, padding: 12, textAlignVertical: 'top', fontSize: 14 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancel: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
  modalCancelText: { fontSize: 12, fontWeight: '900', color: '#94a3b8' },
  modalSave: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalSaveText: { fontSize: 12, fontWeight: '900', color: '#fff' },
  emptyText: { textAlign: 'center', marginVertical: 20, fontSize: 14, fontStyle: 'italic' },
  emptyMarks: { textAlign: 'center', fontSize: 12, fontStyle: 'italic', paddingVertical: 10 }
});
