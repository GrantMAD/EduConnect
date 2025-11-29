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
} from "react-native";
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../context/SchoolContext';
import { useRoute } from "@react-navigation/native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import ManageUsersInClassScreenSkeleton from '../../components/skeletons/ManageUsersInClassScreenSkeleton';
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
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "../../context/ToastContext";
import { Calendar } from "react-native-calendars";
import MarksModal from '../../components/MarksModal';
import ManageMarksModal from '../../components/ManageMarksModal';
import { useGamification } from '../../context/GamificationContext';

const defaultUserImage = require("../../assets/user.png");

// Helper to get a date in YYYY-MM-DD format
const getDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ManageUsersInClassScreen() {
  const route = useRoute();
  const { classId, className } = route.params;

  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};

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

  const handleCloseMarksModal = (success) => {
    setMarksModalVisible(false);
    if (success) {
      for (const studentId in expandedStudents) {
        if (expandedStudents[studentId]) {
          fetchStudentMarks(studentId, classId);
        }
      }
    }
  };

  const handleOpenManageMarksModal = (student) => {
    setSelectedStudent(student);
    setManageMarksModalVisible(true);
  };

  const handleCloseManageMarksModal = (shouldRefresh) => {
    setManageMarksModalVisible(false);
    if (shouldRefresh && selectedStudent) {
      fetchStudentMarks(selectedStudent.users.id, classId);
    }
    setSelectedStudent(null);
  };

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
  const [classSubject, setClassSubject] = useState(''); // New state for class subject

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
      setClassSchedules(data);
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
      showToast("Failed to fetch class subject.", 'error');
    }
  }, [classId, showToast]);

  useEffect(() => {
    setLoading(true);
    if (schoolId && classId) {
      Promise.all([
        fetchClassMembers(),
        fetchAllStudents(),
        fetchClassSchedules(),
        fetchClassDetails(), // <--- Add this
      ]).finally(() => setLoading(false));
    }
  }, [schoolId, classId, fetchClassMembers, fetchClassSchedules, fetchClassDetails]);

  // Fetch Functions
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

      setAllStudents(data);
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch all students.", 'error');
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
      showToast("Failed to fetch student marks.", 'error');
    }
  };

  // Add/Remove Functions
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

  // Attendance
  const handleAttendanceChange = async (member, isPresent) => {
    if (!selectedScheduleDate) return;
    const { id: memberId, attendance } = member;

    // Optimistically update UI
    const updatedMembers = classMembers.map((m) =>
      m.id === memberId
        ? {
          ...m,
          attendance: {
            ...m.attendance,
            [selectedScheduleDate]: isPresent,
          },
        }
        : m
    );
    setClassMembers(updatedMembers);

    // Update database
    const newAttendance = { ...attendance, [selectedScheduleDate]: isPresent };
    try {
      const { error } = await supabase
        .from("class_members")
        .update({ attendance: newAttendance })
        .eq("id", memberId);
      if (error) {
        showToast("Failed to save attendance.", 'error');
        setClassMembers(classMembers); // Revert UI on error
        throw error;
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

    if (isStart) {
      setTempStartTime(newText);
    } else {
      setTempEndTime(newText);
    }
  };

  const handleNewTimeChange = (text, isStart) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let newText = cleaned;
    if (cleaned.length > 2) {
      newText = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
    }

    if (isStart) {
      setNewStartTime(newText);
    } else {
      setNewEndTime(newText);
    }
  };

  // Schedule Edit
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
      if (!user || !schoolId) {
        showToast('User or School not identified.', 'error');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("class_schedules").insert({
        class_id: classId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        title: className,
        description: classSubject, // Added description
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

  // Render Items
  const renderSchedule = ({ item }) => (
    <TouchableOpacity onPress={() => setSelectedScheduleDate(getDateString(item.start_time))}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#007AFF" />
          <Text style={styles.cardTitle}> {new Date(item.start_time).toLocaleDateString()}</Text>
        </View>
        <View style={styles.cardRow}>
          <FontAwesomeIcon icon={faClock} size={14} color="#007AFF" />
          <Text style={styles.scheduleTimeText}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>
        {item.class_info ? <View><View style={styles.horizontalRule} /><Text style={styles.cardInfo}>{item.class_info}</Text></View> : null}
        <TouchableOpacity onPress={() => handleEditSchedule(item)} style={styles.editButton}>
          <FontAwesomeIcon icon={faEdit} size={18} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderStudent = ({ item }) => {

    const student = item.users;

    const isPresent = item.attendance?.[selectedScheduleDate] ?? false;

    const isExpanded = expandedStudents[student.id];



    const toggleExpand = () => {

      setExpandedStudents(prev => ({

        ...prev,

        [student.id]: !prev[student.id],

      }));

      if (!isExpanded && !studentMarks[student.id]) {

        fetchStudentMarks(student.id, classId);

      }

    };



    return (

      <View style={styles.card}>

        <TouchableOpacity onPress={toggleExpand}>

          <View style={styles.cardRow}>

            <Image source={student.avatar_url ? { uri: student.avatar_url } : defaultUserImage} style={styles.avatar} />

            <View style={{ flex: 1 }}>

              <Text style={styles.cardTitle}>{student.full_name}</Text>

              <Text style={styles.cardSub}>{student.email}</Text>

            </View>

            <View style={styles.attendanceContainer}>

              <Text style={styles.attendanceLabel}>Present</Text>

              <Switch

                trackColor={{ false: "#767577", true: "#81b0ff" }}

                thumbColor={isPresent ? "#007AFF" : "#f4f3f4"}

                ios_backgroundColor="#3e3e3e"

                onValueChange={(value) => handleAttendanceChange(item, value)}

                value={isPresent}

              />

            </View>

            <TouchableOpacity

              onPress={() => removeStudentFromClass(student.id)}

              disabled={saving}

              style={styles.removeButton}

            >

              <FontAwesomeIcon icon={faMinusCircle} size={20} color="#dc3545" />

            </TouchableOpacity>

          </View>

        </TouchableOpacity>

        {isExpanded && (

          <View style={styles.expandedContent}>

            {studentMarks[student.id] ? (

              studentMarks[student.id].length > 0 ? (

                <>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>

                    <FontAwesomeIcon icon={faFileAlt} size={16} color="#007AFF" style={{ marginRight: 5 }} />

                    <Text style={styles.marksHeader}>Tests</Text>

                  </View>

                  {studentMarks[student.id].filter(m => m.assessment_name.toLowerCase().startsWith('test:')).length > 0 ? (

                    studentMarks[student.id].filter(m => m.assessment_name.toLowerCase().startsWith('test:')).map((mark, index) => (

                      <View key={mark.id || index} style={styles.markItem}>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                          <FontAwesomeIcon icon={faTag} size={14} color="#888" style={{ marginRight: 5 }} />

                          <Text style={styles.markAssessmentName}>{mark.assessment_name.replace(/test: /i, '')}</Text>

                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                          <FontAwesomeIcon icon={faGraduationCap} size={14} color="#888" style={{ marginRight: 5 }} />

                          <Text style={styles.markValue}>{mark.mark}</Text>

                        </View>

                      </View>

                    ))

                  ) : (

                    <Text style={styles.emptyText}>No tests recorded.</Text>

                  )}



                  <View style={styles.horizontalRule} />



                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 5 }}>

                    <FontAwesomeIcon icon={faClipboardList} size={16} color="#007AFF" style={{ marginRight: 5 }} />

                    <Text style={styles.marksHeader}>Assignments</Text>

                  </View>

                  {studentMarks[student.id].filter(m => m.assessment_name.toLowerCase().startsWith('assignment:')).length > 0 ? (

                    studentMarks[student.id].filter(m => m.assessment_name.toLowerCase().startsWith('assignment:')).map((mark, index) => (

                      <View key={mark.id || index} style={styles.markItem}>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                          <FontAwesomeIcon icon={faTag} size={14} color="#888" style={{ marginRight: 5 }} />

                          <Text style={styles.markAssessmentName}>{mark.assessment_name.replace(/assignment: /i, '')}</Text>

                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                          <FontAwesomeIcon icon={faGraduationCap} size={14} color="#888" style={{ marginRight: 5 }} />

                          <Text style={styles.markValue}>{mark.mark}</Text>

                        </View>

                      </View>

                    ))

                  ) : (

                    <Text style={styles.emptyText}>No assignments recorded.</Text>

                  )}
                  <TouchableOpacity style={styles.manageMarksButton} onPress={() => handleOpenManageMarksModal(item)}>
                    <Text style={styles.manageMarksButtonText}>Manage Marks</Text>
                  </TouchableOpacity>
                </>

              ) : (

                <Text style={styles.emptyText}>No marks recorded for this student.</Text>

              )

            ) : (

              <ActivityIndicator size="small" color="#007AFF" />

            )}

          </View>

        )}

      </View>

    );

  };

  const renderAddStudent = ({ item }) => (
    <View style={styles.addStudentCard}>
      <View style={styles.cardRow}>
        <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={styles.avatar} />
        <View>
          <Text style={styles.cardTitle}>{item.full_name}</Text>
          <Text style={styles.cardSub}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => addStudentToClass(item.id)}
        disabled={saving}
        style={{ marginRight: 12 }}
      >
        <FontAwesomeIcon icon={faPlusCircle} size={20} color="#28a745" />
      </TouchableOpacity>
    </View>
  );

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

      // Optimistic update
      setClassMembers(updates);

      // Batch update in Supabase
      const promises = updates.map(member =>
        supabase
          .from('class_members')
          .update({ attendance: member.attendance })
          .eq('id', member.id)
      );

      await Promise.all(promises);

      // Award XP
      awardXP('attendance_submission', 15);

      showToast('All students marked present. +15 XP', 'success');
    } catch (error) {
      console.error('Error marking all present:', error);
      showToast('Failed to update attendance.', 'error');
      fetchClassMembers(); // Revert on error
    } finally {
      setSaving(false);
    }
  };

  // Main FlatList Header
  const renderHeader = () => {
    if (!selectedScheduleDate) {
      return (
        <>
          <Text style={[styles.header, { textAlign: 'center' }]}>Manage {className}</Text>
          <Text style={[styles.description, { textAlign: 'center' }]}>Select a class session below to manage attendance.</Text>
          <View style={{ marginBottom: 25 }}>
            <View style={styles.sectionHeaderContainer}>
              <View style={styles.sectionHeader}>
                <FontAwesomeIcon icon={faCalendarAlt} size={18} color="#007AFF" />
                <Text style={styles.sectionTitle}>Class Schedule</Text>
              </View>
              <TouchableOpacity style={styles.addButtonHeader} onPress={openAddScheduleModal}>
                <FontAwesomeIcon icon={faPlusCircle} size={20} color="#007AFF" />
                <Text style={styles.addButtonTextHeader}>Add New Session</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionDescription}>Tap a session to manage attendance, or use the edit icon to modify its details.</Text>
            <FlatList
              scrollEnabled={false}
              data={classSchedules}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderSchedule}
              ListEmptyComponent={<Text style={styles.emptyText}>No scheduled sessions for this class.</Text>}
            />
          </View>
        </>
      );
    }

    return (
      <>
        <TouchableOpacity onPress={() => setSelectedScheduleDate(null)} style={styles.backButton}>
          <FontAwesomeIcon icon={faArrowLeft} size={16} color="#007AFF" />
          <Text style={styles.backButtonText}>Back to Schedules</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Class Information</Text>
        <Text style={styles.description}>This section allows you to manage class details, attendance, and student marks.</Text>
        <Text style={styles.subHeader}>Attendance for {new Date(selectedScheduleDate).toLocaleDateString()}</Text>

        {/* Students Section */}
        <View style={{ marginBottom: 25 }}>
          <View style={[styles.sectionHeader, { marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesomeIcon icon={faUserGraduate} size={18} color="#007AFF" />
              <Text style={styles.sectionTitle}>Students in this Class</Text>
            </View>
          </View>
          <Text style={styles.sectionDescription}>Mark student attendance for the selected date. Tap on a student's card to view their marks and access the "Manage Marks" button to edit or delete them.</Text>
          <View style={styles.actionBar}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#28a745' }]} onPress={markAllPresent}>
              <FontAwesomeIcon icon={faCheckCircle} size={14} color="#fff" style={{ marginRight: 5 }} />
              <Text style={[styles.actionButtonText, { color: '#fff' }]}>Mark All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#007AFF' }]} onPress={() => setMarksModalVisible(true)}>
              <FontAwesomeIcon icon={faGraduationCap} size={14} color="#fff" style={{ marginRight: 5 }} />
              <Text style={styles.actionButtonText}>Enter Marks</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            scrollEnabled={false}
            data={classMembers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderStudent}
            ListEmptyComponent={<Text style={styles.emptyText}>No students yet.</Text>}
          />

          {/* Add Students Subsection */}
          <View style={{ marginTop: 20 }}>
            <View style={[styles.sectionHeader, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faUserPlus} size={18} color="#007AFF" />
                <Text style={styles.sectionTitle}>Add Students</Text>
              </View>
            </View>
            <Text style={styles.sectionDescription}>Search for and add more students to this class.</Text>
            <TextInput
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for students..."
            />
            <FlatList
              scrollEnabled={false}
              data={availableStudents}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderAddStudent}
              ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
            />
          </View>
        </View>
      </>
    );
  };

  if (loading) {
    return <ManageUsersInClassScreenSkeleton />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={[]}
        keyExtractor={(item, index) => index.toString()}
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
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Edit Schedule</Text>
            <Text style={styles.modalDescription}>Adjust the time and information for this class session.</Text>
            <View style={styles.timeInputRow}>
              <FontAwesomeIcon icon={faClock} size={24} color="#888" style={{ marginRight: 15, marginTop: 20 }} />
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Start Time</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="10:00"
                  keyboardType="numeric"
                  maxLength={5}
                  value={tempStartTime}
                  onChangeText={(text) => handleEditTimeChange(text, true)}
                />
              </View>
              <Text style={styles.timeSeparator}>-</Text>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>End Time</Text>
                <TextInput
                  style={styles.timeInput}
                  placeholder="11:00"
                  keyboardType="numeric"
                  maxLength={5}
                  value={tempEndTime}
                  onChangeText={(text) => handleEditTimeChange(text, false)}
                />
              </View>
            </View>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlign: 'left', textAlignVertical: 'top' }]}
              multiline
              placeholder="Class Information"
              value={tempClassInfo}
              onChangeText={setTempClassInfo}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateSchedule} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAddModalVisible(false)}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Session</Text>
            <Text style={styles.modalDescription}>Select a date from the calendar to set the time for the new session.</Text>

            <Calendar onDayPress={handleDayPress} markedDates={{ [newScheduleDate]: { selected: true, selectedColor: '#007AFF' } }} />

            {newScheduleDate && (
              <>
                <View style={styles.timeInputRow}>
                  <FontAwesomeIcon icon={faClock} size={24} color="#888" style={{ marginRight: 15, marginTop: 20 }} />
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeInputLabel}>Start Time</Text>
                    <TextInput
                      style={styles.timeInput}
                      placeholder="10:00"
                      keyboardType="numeric"
                      maxLength={5}
                      value={newStartTime}
                      onChangeText={(text) => handleNewTimeChange(text, true)}
                    />
                  </View>
                  <Text style={styles.timeSeparator}>-</Text>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeInputLabel}>End Time</Text>
                    <TextInput
                      style={styles.timeInput}
                      placeholder="11:00"
                      keyboardType="numeric"
                      maxLength={5}
                      value={newEndTime}
                      onChangeText={(text) => handleNewTimeChange(text, false)}
                    />
                  </View>
                </View>
                <TextInput
                  style={[styles.modalInput, { height: 80, textAlign: 'left', textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Class Information (Optional)"
                  value={newClassInfo}
                  onChangeText={setNewClassInfo}
                />
              </>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleAddSchedule} disabled={saving}>
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  subHeader: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  description: { fontSize: 14, color: "#666", marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginLeft: 8, color: "#333" },
  sectionDescription: { fontSize: 13, color: "#777", marginBottom: 10, marginLeft: 5 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButtonText: { color: '#007AFF', fontSize: 16, marginLeft: 8 },

  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  card: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  markItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  markAssessmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  markValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  marksHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    marginBottom: 5,
  },
  cardRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 2, borderColor: "#007AFF" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#222" },
  cardSub: { fontSize: 13, color: "#555", marginTop: 2 },
  scheduleTimeText: { fontSize: 13, color: "#555", marginTop: 2, marginLeft: 5 },
  cardInfo: { fontSize: 13, color: "#666", marginTop: 4, fontStyle: "italic" },
  emptyText: { textAlign: "center", color: "#777", marginVertical: 10 },
  input: { backgroundColor: "#fff", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#ddd", marginBottom: 8 },

  horizontalRule: {
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    marginVertical: 8,
    width: '100%', // Ensure it spans the full width of the card content
  },

  addStudentCard: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  addButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e0f2fe', // Light blue background
  },
  addButtonTextHeader: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },

  removeButton: { position: "absolute", right: 12, top: 12 },
  editButton: { position: "absolute", right: 12, top: 12 },

  attendanceContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginRight: 40, // Add space between switch and remove button
  },
  attendanceLabel: {
    marginRight: 8,
    fontSize: 14,
    color: '#555',
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#fff", padding: 20, borderRadius: 15, width: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  modalDescription: { fontSize: 14, color: '#666', marginBottom: 10, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 10, backgroundColor: "#fafafa" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  modalButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", marginHorizontal: 5 },
  saveButton: { backgroundColor: "#007AFF" },
  cancelButton: { backgroundColor: "#f1f1f1" },
  saveText: { color: "#fff", fontWeight: "700" },
  cancelText: { color: "#333", fontWeight: "600" },

  timeInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  timeInputGroup: { alignItems: 'center' },
  timeInputLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  timeInput: { fontSize: 18, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 10, width: 100, textAlign: 'center' },
  timeSeparator: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 10, marginTop: 20 },
  manageMarksButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  manageMarksButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 0.48,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
