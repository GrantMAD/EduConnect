import React, { useState, useEffect } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import { useToast } from "../context/ToastContext";

const defaultUserImage = require("../assets/user.png");

export default function ManageUsersInClassScreen() {
  const route = useRoute();
  const { classId, className } = route.params;

  const { schoolId } = useSchool();
  const { showToast } = useToast();

  const [classStudents, setClassStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [classSchedules, setClassSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [tempStartTime, setTempStartTime] = useState("");
  const [tempEndTime, setTempEndTime] = useState("");
  const [tempClassInfo, setTempClassInfo] = useState("");

  const availableStudents = allStudents.filter(
    (student) => !classStudents.some((cs) => cs.id === student.id)
  );

  useEffect(() => {
    if (schoolId && classId) {
      fetchClassDetails();
      fetchAllStudents();
      fetchClassSchedules();
    }
  }, [schoolId, classId]);

  // Fetch Functions
  const fetchClassDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("classes")
        .select("users")
        .eq("id", classId)
        .single();
      if (error) throw error;

      if (data?.users?.length) {
        const { data: studentDetails, error: studentDetailsError } = await supabase
          .from("users")
          .select("id, full_name, email, avatar_url")
          .in("id", data.users);
        if (studentDetailsError) throw studentDetailsError;

        setClassStudents(studentDetails || []);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch class details.", 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchClassSchedules = async () => {
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
  };

  // Add/Remove Functions
  const addStudentToClass = async (studentId) => {
    setSaving(true);
    try {
      const newIds = [...new Set([...classStudents.map((s) => s.id), studentId])];
      const { error } = await supabase.from("classes").update({ users: newIds }).eq("id", classId);
      if (error) throw error;
      fetchClassDetails();
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
      const newIds = classStudents.map((s) => s.id).filter((id) => id !== studentId);
      const { error } = await supabase.from("classes").update({ users: newIds }).eq("id", classId);
      if (error) throw error;
      fetchClassDetails();
      showToast("Student removed from class.", 'success');
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Schedule Edit
  const formatTime = (date) => date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setTempStartTime(formatTime(new Date(schedule.start_time)));
    setTempEndTime(formatTime(new Date(schedule.end_time)));
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
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#555" />
        <Text style={styles.cardTitle}> {new Date(item.start_time).toLocaleDateString()}</Text>
      </View>
      <View style={styles.cardRow}>
        <FontAwesomeIcon icon={faClock} size={14} color="#555" />
        <Text style={styles.scheduleTimeText}>
          {new Date(item.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} -{" "}
          {new Date(item.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
      {item.class_info ? <Text style={styles.cardInfo}>{item.class_info}</Text> : null}
      <TouchableOpacity onPress={() => handleEditSchedule(item)} style={styles.editButton}>
        <FontAwesomeIcon icon={faEdit} size={18} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  const renderStudent = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={styles.avatar} />
        <View>
          <Text style={styles.cardTitle}>{item.full_name}</Text>
          <Text style={styles.cardSub}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => removeStudentFromClass(item.id)}
        disabled={saving}
        style={styles.removeButton}
      >
        <FontAwesomeIcon icon={faMinusCircle} size={20} color="#dc3545" />
      </TouchableOpacity>
    </View>
  );

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
  const renderHeader = () => (
    <>
      <Text style={styles.header}>Manage {className}</Text>
      <Text style={styles.description}>Here you can manage the students and schedule for this class.</Text>

      {/* Class Schedule Section */}
      <View style={{ marginBottom: 25 }}>
        <View style={styles.sectionHeader}>
          <FontAwesomeIcon icon={faCalendarAlt} size={18} color="#007AFF" />
          <Text style={styles.sectionTitle}>Class Schedule</Text>
        </View>
        <Text style={styles.sectionDescription}>View and edit the scheduled dates and times for this class.</Text>
        <FlatList
          scrollEnabled={false}
          data={classSchedules}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSchedule}
          ListEmptyComponent={<ActivityIndicator size="small" />}
        />
      </View>

      {/* Students Section */}
      <View style={{ marginBottom: 25 }}>
        <View style={styles.sectionHeader}>
          <FontAwesomeIcon icon={faUserGraduate} size={18} color="#007AFF" />
          <Text style={styles.sectionTitle}>Students in this Class</Text>
        </View>
        <Text style={styles.sectionDescription}>These are the students currently enrolled in this class.</Text>
        <FlatList
          scrollEnabled={false}
          data={classStudents}
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
            <TextInput
              style={styles.modalInput}
              placeholder="Start Time (HH:MM)"
              value={tempStartTime}
              onChangeText={setTempStartTime}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="End Time (HH:MM)"
              value={tempEndTime}
              onChangeText={setTempEndTime}
            />
            <TextInput
              style={[styles.modalInput, { height: 80 }]}
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

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContainer: { backgroundColor: "#fff", padding: 20, borderRadius: 15, width: "85%" },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  modalInput: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 15, marginBottom: 10, backgroundColor: "#fafafa" },
  modalButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  modalButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: "center", marginHorizontal: 5 },
  saveButton: { backgroundColor: "#007AFF" },
  cancelButton: { backgroundColor: "#f1f1f1" },
  saveText: { color: "#fff", fontWeight: "700" },
  cancelText: { color: "#333", fontWeight: "600" },
});
