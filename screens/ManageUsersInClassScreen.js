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
import { supabase } from "../lib/supabase";
import { useSchool } from "../context/SchoolContext";
import { useRoute } from "@react-navigation/native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import ManageUsersInClassScreenSkeleton from '../components/skeletons/ManageUsersInClassScreenSkeleton';
import {
  faPlusCircle,
  faMinusCircle,
  faEdit,
  faClock,
  faUserGraduate,
  faCalendarAlt,
  faUserPlus,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "../context/ToastContext";

const defaultUserImage = require("../assets/user.png");

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

  const [classMembers, setClassMembers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [classSchedules, setClassSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(null);

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [tempStartTime, setTempStartTime] = useState("");
  const [tempEndTime, setTempEndTime] = useState("");
  const [tempClassInfo, setTempClassInfo] = useState("");

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

  useEffect(() => {
    setLoading(true);
    if (schoolId && classId) {
      Promise.all([
        fetchClassMembers(),
        fetchAllStudents(),
        fetchClassSchedules(),
      ]).finally(() => setLoading(false));
    }
  }, [schoolId, classId, fetchClassMembers, fetchClassSchedules]);

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

  // Render Items
  const renderSchedule = ({ item }) => (
    <TouchableOpacity onPress={() => setSelectedScheduleDate(getDateString(item.start_time))}>
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#555" />
          <Text style={styles.cardTitle}> {new Date(item.start_time).toLocaleDateString()}</Text>
        </View>
        <View style={styles.cardRow}>
          <FontAwesomeIcon icon={faClock} size={14} color="#555" />
          <Text style={styles.scheduleTimeText}>
            {formatTime(item.start_time)} - {formatTime(item.end_time)}
          </Text>
        </View>
        {item.class_info ? <Text style={styles.cardInfo}>{item.class_info}</Text> : null}
        <TouchableOpacity onPress={() => handleEditSchedule(item)} style={styles.editButton}>
          <FontAwesomeIcon icon={faEdit} size={18} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderStudent = ({ item }) => {
    const student = item.users;
    const isPresent = item.attendance?.[selectedScheduleDate] ?? false;

    return (
      <View style={styles.card}>
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
      </View>
    );
  };

  const renderAddStudent = ({ item }) => (
    <View style={styles.card}>
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
        style={styles.addButton}
      >
        <FontAwesomeIcon icon={faPlusCircle} size={20} color="#28a745" />
      </TouchableOpacity>
    </View>
  );

  // Main FlatList Header
  const renderHeader = () => {
    if (!selectedScheduleDate) {
      return (
        <>
          <Text style={styles.header}>Manage {className}</Text>
          <Text style={styles.description}>Select a class session below to manage attendance.</Text>
          <View style={{ marginBottom: 25 }}>
            <View style={styles.sectionHeader}>
              <FontAwesomeIcon icon={faCalendarAlt} size={18} color="#007AFF" />
              <Text style={styles.sectionTitle}>Class Schedule</Text>
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
        <Text style={styles.header}>Attendance for {new Date(selectedScheduleDate).toLocaleDateString()}</Text>

        {/* Students Section */}
        <View style={{ marginBottom: 25 }}>
          <View style={styles.sectionHeader}>
            <FontAwesomeIcon icon={faUserGraduate} size={18} color="#007AFF" />
            <Text style={styles.sectionTitle}>Students in this Class</Text>
          </View>
          <Text style={styles.sectionDescription}>Mark student attendance for the selected date.</Text>
          <FlatList
            scrollEnabled={false}
            data={classMembers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderStudent}
            ListEmptyComponent={<Text style={styles.emptyText}>No students yet.</Text>}
          />

          {/* Add Students Subsection */}
          <View style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <FontAwesomeIcon icon={faUserPlus} size={18} color="#007AFF" />
              <Text style={styles.sectionTitle}>Add Students</Text>
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
                        placeholder="HH:MM"
                        keyboardType="numeric"
                        maxLength={5}
                        value={tempStartTime}
                        onChangeText={setTempStartTime}
                    />
                </View>
                <Text style={styles.timeSeparator}>-</Text>
                <View style={styles.timeInputGroup}>
                    <Text style={styles.timeInputLabel}>End Time</Text>
                    <TextInput
                        style={styles.timeInput}
                        placeholder="HH:MM"
                        keyboardType="numeric"
                        maxLength={5}
                        value={tempEndTime}
                        onChangeText={setTempEndTime}
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
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateSchedule}>
                <Text style={styles.saveText}>Save</Text>
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
  description: { fontSize: 14, color: "#666", marginBottom: 20, textAlign: "center" },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginLeft: 8, color: "#333" },
  sectionDescription: { fontSize: 13, color: "#777", marginBottom: 10, marginLeft: 5 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButtonText: { color: '#007AFF', fontSize: 16, marginLeft: 8 },

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
  cardRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: "#ddd" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#222" },
  cardSub: { fontSize: 13, color: "#555", marginTop: 2 },
  scheduleTimeText: { fontSize: 13, color: "#555", marginTop: 2, marginLeft: 5 },
  cardInfo: { fontSize: 13, color: "#666", marginTop: 4, fontStyle: "italic" },
  emptyText: { textAlign: "center", color: "#777", marginVertical: 10 },
  input: { backgroundColor: "#fff", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#ddd", marginBottom: 8 },

  addButton: { position: "absolute", right: 12, top: 12 },
  removeButton: { position: "absolute", right: 12, top: 12 },
  editButton: { position: "absolute", right: 12, top: 12 },

  attendanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
