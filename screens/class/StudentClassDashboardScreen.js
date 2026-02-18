import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
    faBullhorn,
    faBook,
    faBookOpen,
    faChevronRight,
    faClipboardList,
    faPlus,
    faCalendarAlt,
    faGraduationCap,
    faChevronLeft,
    faUserGraduate,
    faClock,
    faMapMarkerAlt,
    faEllipsisH,
    faCheckCircle,
    faTimesCircle,
    faPlusCircle, 
    faMinusCircle, 
    faUserPlus, 
    faTrash, 
    faSearch, 
    faInfoCircle, 
    faEdit, 
    faLayerGroup,
    faUsers,
    faArrowLeft,
    faGlobe,
    faPen,
    faExternalLinkAlt,
    faChalkboardTeacher,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
    fetchClassInfo, 
    fetchClassMembers, 
    fetchClassSchedules, 
    fetchAttendanceHistory,
    addMemberToClass,
    removeMemberFromClass,
    updateAttendance,
    updateClassSchedule,
    createClassSchedules,
    deleteClassScheduleById
} from '../../services/classService';
import { 
    fetchStudentMarks, 
    fetchParentChildren, 
    fetchClassMembersIds,
    fetchUsersBySchool,
    fetchParentsOfStudentsRpc
} from '../../services/userService';
import { fetchAnnouncements } from '../../services/announcementService';
import { fetchHomework, updateHomework, deleteHomework } from '../../services/homeworkService';
import { fetchAssignmentsByClass, updateAssignment, deleteAssignment } from '../../services/assignmentService';
import { fetchLessonPlans } from '../../services/lessonService';
import { fetchResources } from '../../services/resourceService';
import { sendBatchNotifications } from '../../services/notificationService';
import { Calendar } from "react-native-calendars";
import RNModal from 'react-native-modal';

// Import components
import HomeworkCard from '../../components/HomeworkCard';
import AssignmentCard from '../../components/AssignmentCard';
import AnnouncementCard from '../../components/AnnouncementCard';
import ManageCompletionsModal from '../../components/ManageCompletionsModal';
import AnnouncementDetailModal from '../../components/AnnouncementDetailModal';
import ResourceDetailModal from '../../components/ResourceDetailModal';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import MarksModal from '../../components/MarksModal';
import ManageMarksModal from '../../components/ManageMarksModal';
import { Alert, TextInput, Modal, Pressable } from 'react-native';
import { useGamification } from '../../context/GamificationContext';
import { useToast } from '../../context/ToastContext';
import { useSchool } from '../../context/SchoolContext';

const { width } = Dimensions.get('window');
const defaultUserImage = require("../../assets/user.png");

const getDateString = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const StudentClassDashboardScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { classId, className } = route.params || {};
    const { theme } = useTheme();
    const { user, profile } = useAuth();
    const { schoolId } = useSchool();
    const { showToast } = useToast();
    const { awardXP = () => { } } = useGamification() || {};
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState(route.params?.initialTab || 'announcements');
    const [loading, setLoading] = useState(true);
    const [classData, setClassData] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [announcements, setAnnouncements] = useState([]); 
    const [homework, setHomework] = useState([]); 
    const [assignments, setAssignments] = useState([]); 
    const [lessons, setLessons] = useState([]);
    const [resources, setResources] = useState([]);
    const [marks, setMarks] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [classMembers, setClassMembers] = useState([]);
    const [resourceType, setResourceType] = useState('all'); // 'all', 'general', 'lessons'
    
    // Management State
    const [allStudents, setAllStudents] = useState([]);

    const filteredResources = useMemo(() => {
        if (!resources) return [];
        
        // Deduplicate resources by ID (in case of multiple lesson links)
        const resourceMap = new Map();
        resources.forEach(r => {
            if (!resourceMap.has(r.id)) {
                resourceMap.set(r.id, r);
            }
        });
        const deduped = Array.from(resourceMap.values());

        if (resourceType === 'all') return deduped;
        
        return deduped.filter(item => {
            if (resourceType === 'general') {
                return item.class_resources?.some(cr => cr.lesson_plan_id === null);
            }
            if (resourceType === 'lessons') {
                return item.class_resources?.some(cr => cr.lesson_plan_id !== null);
            }
            return true;
        });
    }, [resources, resourceType]);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedScheduleDate, setSelectedScheduleDate] = useState(route.params?.date ? getDateString(route.params.date) : null);
    const [isMarksModalVisible, setMarksModalVisible] = useState(false);
    const [expandedStudents, setExpandedStudents] = useState({});
    const [studentMarksState, setStudentMarksState] = useState({});
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

    // Modal state
    const [selectedItem, setSelectedItem] = useState(null);
    const [isAnnouncementModalVisible, setIsAnnouncementModalVisible] = useState(false);
    const [isManageModalVisible, setIsManageModalVisible] = useState(false);
    const [manageType, setManageType] = useState('homework');
    const [isEditing, setIsEditing] = useState(false);
    const [resourceModalVisible, setResourceModalVisible] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);
    
    // New detail modal states
    const [isHomeworkDetailVisible, setIsHomeworkDetailVisible] = useState(false);
    const [isAssignmentDetailVisible, setIsAssignmentDetailVisible] = useState(false);
    const [hwScrollOffset, setHwScrollOffset] = useState(0);
    const [asgnScrollOffset, setAsgnScrollOffset] = useState(0);
    const hwScrollViewRef = React.useRef(null);
    const asgnScrollViewRef = React.useRef(null);

    const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';

    const handleHwScroll = (event) => {
        setHwScrollOffset(event.nativeEvent.contentOffset.y);
    };

    const handleHwScrollTo = (p) => {
        if (hwScrollViewRef.current) hwScrollViewRef.current.scrollTo(p);
    };

    const handleAsgnScroll = (event) => {
        setAsgnScrollOffset(event.nativeEvent.contentOffset.y);
    };

    const handleAsgnScrollTo = (p) => {
        if (asgnScrollViewRef.current) asgnScrollViewRef.current.scrollTo(p);
    };

    const formatDate = useCallback((date) =>
        new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }), []);

    const handleHomeworkUpdate = useCallback(async () => {
        try {
            await updateHomework(selectedItem.id, {
                subject: selectedItem.subject,
                description: selectedItem.description,
                due_date: selectedItem.due_date,
            });

            showToast('Homework updated successfully', 'success');
            setIsEditing(false);
            loadData();
        } catch (error) {
            console.error('Error updating homework:', error);
            showToast('Failed to update homework', 'error');
        }
    }, [selectedItem, loadData, showToast]);

    const handleHomeworkDelete = useCallback(async () => {
        Alert.alert('Delete Homework', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteHomework(selectedItem.id);
                        showToast('Homework deleted', 'success');
                        setIsHomeworkDetailVisible(false);
                        loadData();
                    } catch (error) {
                        console.error('Error deleting homework:', error);
                        showToast('Failed to delete homework', 'error');
                    }
                },
            },
        ]);
    }, [selectedItem, loadData, showToast]);

    const handleAssignmentUpdate = useCallback(async () => {
        try {
            await updateAssignment(selectedItem.id, {
                title: selectedItem.title,
                description: selectedItem.description,
                due_date: selectedItem.due_date,
            });

            showToast('Assignment updated successfully', 'success');
            setIsEditing(false);
            loadData();
        } catch (error) {
            console.error('Error updating assignment:', error);
            showToast('Failed to update assignment', 'error');
        }
    }, [selectedItem, loadData, showToast]);

    const handleAssignmentDelete = useCallback(async () => {
        Alert.alert('Delete Assignment', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteAssignment(selectedItem.id);
                        showToast('Assignment deleted', 'success');
                        setIsAssignmentDetailVisible(false);
                        loadData();
                    } catch (error) {
                        console.error('Error deleting assignment:', error);
                        showToast('Failed to delete assignment', 'error');
                    }
                },
            },
        ]);
    }, [selectedItem, loadData, showToast]);

    const availableStudents = useMemo(() => {
        const classStudentIds = classMembers.map((member) => member.users?.id);
        return allStudents.filter(
          (student) => !classStudentIds.includes(student.id)
        );
    }, [allStudents, classMembers]);

    const fetchAllStudents = useCallback(async () => {
        if (!schoolId) return;
        setFetchingStudents(true);
        try {
            const data = await fetchUsersBySchool(schoolId, { role: 'student' });
            let filtered = data || [];
            if (searchQuery) {
                filtered = filtered.filter(s => s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
            }
            setAllStudents(filtered);
        } catch (error) {
            console.error(error);
        } finally {
            setFetchingStudents(false);
        }
    }, [schoolId, searchQuery]);

    const addStudentToClass = useCallback(async (studentId) => {
        setSaving(true);
        try {
            await addMemberToClass({
                class_id: classId,
                user_id: studentId,
                school_id: schoolId,
                role: "student",
            });
            const data = await fetchClassMembers(classId);
            setClassMembers(data.filter(m => m.role === 'student') || []);
            showToast("Student added to class.", 'success');
        } catch (error) {
            console.error(error);
            showToast("Failed to add student.", 'error');
        } finally {
            setSaving(false);
        }
    }, [classId, schoolId, showToast]);

    const removeStudentFromClass = useCallback(async (studentId) => {
        setSaving(true);
        try {
            await removeMemberFromClass(classId, studentId);
            const data = await fetchClassMembers(classId);
            setClassMembers(data.filter(m => m.role === 'student') || []);
            showToast("Student removed from class.", 'success');
        } catch (error) {
            console.error(error);
        } finally {
            setSaving(false);
        }
    }, [classId]);

    const handleAttendanceChange = useCallback(async (member, status) => {
        if (!selectedScheduleDate) return;
        const { id: memberId, attendance: currentAtt, users: student } = member;

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

        const newAttendance = { ...currentAtt, [selectedScheduleDate]: status };
        try {
            await updateAttendance({
                memberId,
                studentId: student.id,
                classId: classId,
                date: selectedScheduleDate,
                status: status === true ? 'present' : (status === false ? 'absent' : 'unmarked'),
                attendance: newAttendance,
                userId: user.id
            });

            if (status === false) {
                try {
                    const studentName = student?.full_name || 'Your child';
                    const parents = await fetchParentsOfStudentsRpc([student.id]);
                    const parentIds = parents ? parents.map(rp => rp.parent_id) : [];

                    if (parentIds.length > 0) {
                        const notifications = parentIds.map(pid => ({
                            user_id: pid,
                            type: 'student_absence',
                            title: 'Attendance Alert',
                            message: `${studentName} was marked absent from ${className} today (${selectedScheduleDate}).`,
                            data: { student_id: student.id, class_id: classId, date: selectedScheduleDate },
                            related_user_id: user.id,
                            created_by: user.id,
                            is_read: false
                        }));
                        await sendBatchNotifications(notifications);
                    }
                } catch (e) { }
            }
        } catch (error) {
            console.error("Error updating attendance:", error);
            showToast("Failed to save attendance.", 'error');
        }
    }, [selectedScheduleDate, classMembers, classId, className, user, showToast]);

    const markAllPresent = useCallback(async () => {
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
                updateAttendance({
                    memberId: member.id,
                    studentId: member.users.id,
                    classId: classId,
                    date: selectedScheduleDate,
                    status: 'present',
                    attendance: member.attendance,
                    userId: user.id
                })
            );

            await Promise.all(promises);
            awardXP('attendance_submission', 15);
            showToast('All students marked present. +15 XP', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update attendance.', 'error');
        } finally {
            setSaving(false);
        }
    }, [selectedScheduleDate, classMembers, classId, user, awardXP, showToast]);

    const handleAddSchedule = useCallback(async () => {
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
            await createClassSchedules([{
                class_id: classId,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                title: className,
                description: classData?.subject || '',
                class_info: newClassInfo,
                school_id: schoolId,
                created_by: user.id,
            }]);

            const scheds = await fetchClassSchedules([classId]);
            setSchedules(scheds || []);
            setAddModalVisible(false);
            showToast("New session added successfully.", 'success');
        } catch (error) {
            console.error(error);
            showToast("Failed to add new session.", 'error');
        } finally {
            setSaving(false);
        }
    }, [newScheduleDate, newStartTime, newEndTime, classId, className, classData, newClassInfo, schoolId, user, showToast]);

    const handleUpdateSchedule = useCallback(async () => {
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
            await updateClassSchedule(selectedSchedule.id, {
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                class_info: tempClassInfo
            });

            const scheds = await fetchClassSchedules([classId]);
            setSchedules(scheds || []);
            setEditModalVisible(false);
            showToast("Schedule updated successfully.", 'success');
        } catch (error) {
            console.error(error);
            showToast("Failed to update schedule.", 'error');
        } finally {
            setSaving(false);
        }
    }, [selectedSchedule, tempStartTime, tempEndTime, tempClassInfo, classId, showToast]);

    const handleDeleteSchedule = useCallback(async (scheduleId) => {
        Alert.alert('Delete Session', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    setSaving(true);
                    try {
                        await deleteClassScheduleById(scheduleId);
                        const scheds = await fetchClassSchedules([classId]);
                        setSchedules(scheds || []);
                        showToast('Session deleted', 'success');
                    } catch (error) {
                        console.error(error);
                        showToast('Failed to delete session', 'error');
                    } finally {
                        setSaving(false);
                    }
                }
            }
        ]);
    }, [classId, showToast]);

    const formatTime = useCallback((date) => {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }, []);

    // Effect to handle deep linking for grading
    useEffect(() => {
        if (!loading && route.params?.manageItem) {
            const itemId = route.params.manageItem;
            
            // Try to find in homework first
            const hwItem = homework.find(h => h.id === itemId);
            if (hwItem) {
                setSelectedItem(hwItem);
                setManageType('homework');
                setActiveTab('homework'); // Switch to homework tab
                setIsManageModalVisible(true);
                // Clear the param so it doesn't reopen on refresh/focus if we could update params, 
                // but react-navigation params persist. We just check !loading so it only runs once data is ready.
                // To prevent infinite loop if we close and it re-renders:
                // We rely on isManageModalVisible being false initially.
            } else {
                // Try assignments
                const asgItem = assignments.find(a => a.id === itemId);
                if (asgItem) {
                    setSelectedItem(asgItem);
                    setManageType('assignment');
                    setActiveTab('assignments'); // Switch to assignments tab
                    setIsManageModalVisible(true);
                }
            }
        }
    }, [loading, route.params?.manageItem, homework, assignments]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            let targetStudentId = user.id;

            if (profile?.role === 'parent') {
                console.log('Resolving child for parent view...');
                const [myChildren, classMembers] = await Promise.all([
                    fetchParentChildren(user.id),
                    fetchClassMembersIds(classId, 'student')
                ]);

                const childInClass = myChildren.find(childId => classMembers.includes(childId));
                if (childInClass) {
                    console.log(`Found child ${childInClass} in class ${classId}`);
                    targetStudentId = childInClass;
                } else {
                    console.warn(`No child of parent ${user.id} found in class ${classId}`);
                }
            } else {
                console.log(`Loading dashboard as ${profile?.role} ${user.id}`);
            }

            const [info, scheds, myMarks, myAttendance, classAnnouncements, classHomework, classAssignments, classLessons, members, classResources] = await Promise.all([
                fetchClassInfo(classId),
                fetchClassSchedules([classId]),
                fetchStudentMarks(targetStudentId, [classId]),
                fetchAttendanceHistory(targetStudentId, classId),
                fetchAnnouncements(classId),
                fetchHomework(profile?.school_id, targetStudentId, profile?.role, { class_id: classId }),
                fetchAssignmentsByClass(classId),
                fetchLessonPlans(classId, profile?.role),
                fetchClassMembers(classId),
                fetchResources(schoolId, [classId], true)
            ]);

            setClassData(info);
            setSchedules(scheds || []);
            setMarks(myMarks || []);
            setAttendance(myAttendance || []);
            setAnnouncements(classAnnouncements || []);
            setHomework(classHomework || []);
            setAssignments(classAssignments || []);
            setLessons(classLessons || []);
            setResources(classResources || []);
            setClassMembers(members.filter(m => m.role === 'student') || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [classId, user.id, profile?.role]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const tabs = [
        { id: 'announcements', label: 'News', icon: faBullhorn, count: announcements.length },
        { id: 'homework', label: 'Homework', icon: faBook, count: homework.length },
        { id: 'lessons', label: 'Lessons', icon: faBookOpen, count: lessons.length },
        { id: 'resources', label: 'Resources', icon: faBook, count: resources.length },
        { id: 'assignments', label: 'Assignments', icon: faClipboardList, count: assignments.length },
        { id: 'classmates', label: 'Classmates', icon: faUserGraduate, count: classMembers.length },
        { id: 'schedule', label: 'Schedule', icon: faCalendarAlt, count: schedules.length },
        { id: 'grades', label: isTeacher ? 'Gradebook' : 'Grades', icon: faGraduationCap, count: marks.length },
    ];

    const renderHeader = () => (
        <View>
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <FontAwesomeIcon icon={faChevronLeft} size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{className || 'Class Dashboard'}</Text>
                    <View style={{ width: 20 }} />
                </View>

                <View style={styles.heroContent}>
                    <Text style={styles.subjectText}>{classData?.subject || 'General Subject'}</Text>
                    <View style={styles.teacherRow}>
                        <FontAwesomeIcon icon={faUserGraduate} size={14} color="#e0e7ff" />
                        <Text style={styles.teacherText}>{classData?.teacher?.full_name || 'Teacher'}</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Fixed Tab Bar */}
            <View style={[styles.tabContainer, { backgroundColor: theme.colors.background }]}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={[
                            styles.tabBtn,
                            activeTab === tab.id && { borderBottomWidth: 2, borderBottomColor: theme.colors.primary }
                        ]}
                    >
                        <View>
                            <FontAwesomeIcon
                                icon={tab.icon}
                                size={18}
                                color={activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary}
                            />
                            {tab.count > 0 && (
                                <View style={[styles.badge, { backgroundColor: theme.colors.error, borderColor: theme.colors.background }]}>
                                    <Text style={styles.badgeText}>{tab.count}</Text>
                                </View>
                            )}
                        </View>
                        <Text
                            style={[
                                styles.tabText,
                                { color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary }
                            ]}
                            numberOfLines={1}
                        >
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.center}>
                    <Text style={{ color: theme.colors.placeholder }}>Loading class details...</Text>
                </View>
            );
        }

        switch (activeTab) {
            case 'announcements':
                return (
                    <View style={styles.contentContainer}>
                        {announcements.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faBullhorn} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No announcements posted yet.</Text>
                            </View>
                        ) : (
                            announcements.map((ann, index) => (
                                <AnnouncementCard
                                    key={ann.id}
                                    announcement={ann}
                                    onPress={() => {
                                        setSelectedItem(ann);
                                        setIsAnnouncementModalVisible(true);
                                    }}
                                />
                            ))
                        )}
                    </View>
                );
            case 'homework':
                return (
                    <View style={styles.contentContainer}>
                        {homework.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faBook} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No homework assigned.</Text>
                            </View>
                        ) : (
                            homework.map((hw, index) => (
                                <HomeworkCard
                                    key={hw.id}
                                    homework={hw}
                                    userId={user.id}
                                    onPress={() => { 
                                        setSelectedItem(hw);
                                        setIsHomeworkDetailVisible(true);
                                    }}
                                    onTrackPress={() => {
                                        setSelectedItem(hw);
                                        setManageType('homework');
                                        setIsManageModalVisible(true);
                                    }}
                                />
                            ))
                        )}
                    </View>
                );
            case 'assignments':
                return (
                    <View style={styles.contentContainer}>
                        {assignments.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faClipboardList} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No assignments pending.</Text>
                            </View>
                        ) : (
                            assignments.map((asgn, index) => (
                                <AssignmentCard
                                    key={asgn.id}
                                    assignment={asgn}
                                    userId={user.id}
                                    onPress={() => { 
                                        setSelectedItem(asgn);
                                        setIsAssignmentDetailVisible(true);
                                    }}
                                    onTrackPress={() => {
                                        setSelectedItem(asgn);
                                        setManageType('assignment');
                                        setIsManageModalVisible(true);
                                    }}
                                />
                            ))
                        )}
                    </View>
                );
            case 'resources':
                const getFileIconRes = (fileUrl) => {
                    if (!fileUrl) return faBook;
                    const lowerUrl = fileUrl.toLowerCase();
                    if (lowerUrl.endsWith('.pdf')) return faBookOpen;
                    return faBook;
                };
                return (
                    <View style={styles.contentContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>
                                {filteredResources.length} {resourceType === 'all' ? 'Total' : resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Materials
                            </Text>
                            {isTeacher && (
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Resources')}
                                    style={{ backgroundColor: theme.colors.primary, width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                                >
                                    <FontAwesomeIcon icon={faPlus} size={12} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Resource Type Toggle */}
                        <View style={styles.resourceTypeContainer}>
                            <View style={[styles.typeToggleBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                                {[
                                    { id: 'all', label: 'All', icon: faLayerGroup },
                                    { id: 'general', label: 'General', icon: faGlobe },
                                    { id: 'lessons', label: 'Lessons', icon: faBook }
                                ].map((t) => (
                                    <TouchableOpacity
                                        key={t.id}
                                        onPress={() => setResourceType(t.id)}
                                        style={[
                                            styles.typeToggle,
                                            resourceType === t.id && { backgroundColor: theme.colors.primary + '15' }
                                        ]}
                                    >
                                        <FontAwesomeIcon 
                                            icon={t.icon} 
                                            size={10} 
                                            color={resourceType === t.id ? theme.colors.primary : theme.colors.placeholder} 
                                        />
                                        <Text style={[
                                            styles.typeToggleText, 
                                            { color: resourceType === t.id ? theme.colors.primary : theme.colors.placeholder }
                                        ]}>
                                            {t.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {filteredResources.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faBook} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No resources found here.</Text>
                            </View>
                        ) : (
                            filteredResources.map((item, index) => {
                                const isStaff = profile?.role === 'teacher' || profile?.role === 'admin';
                                // Privacy filter: Only show links for the current class for students. Staff see all.
                                const visibleLinks = (item.class_resources || []).filter(cr => 
                                    isStaff || cr.class_id === classId
                                );

                                return (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                                        onPress={() => {
                                            setSelectedResource(item);
                                            setResourceModalVisible(true);
                                        }}
                                    >
                                        <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                            <FontAwesomeIcon icon={getFileIconRes(item.file_url)} size={16} color={theme.colors.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
                                            <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder, marginBottom: 4 }]}>
                                                {item.category || 'General'}
                                            </Text>
                                            
                                            {/* Lesson Badges Row (Privacy Filtered) */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                                {visibleLinks.map((cr, idx) => (
                                                    cr.lesson_plans?.title && (
                                                        <View key={idx} style={styles.inlineLessonBadge}>
                                                            <FontAwesomeIcon icon={faBook} size={7} color="#6366f1" style={{ opacity: 0.6 }} />
                                                            <Text style={styles.inlineLessonText}>
                                                                Linked to lesson: <Text style={{ fontWeight: '900' }}>{cr.lesson_plans.title}</Text>
                                                            </Text>
                                                        </View>
                                                    )
                                                ))}
                                            </View>
                                        </View>
                                        <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.cardBorder} />
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                );
            case 'lessons':
                const getStatusColor = (status) => {
                    switch (status) {
                        case 'completed': return '#10b981';
                        case 'published': return '#3b82f6';
                        default: return '#94a3b8';
                    }
                };
                return (
                    <View style={styles.contentContainer}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>CLASS CURRICULUM</Text>
                            {(profile?.role === 'teacher' || profile?.role === 'admin') && (
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                    <TouchableOpacity 
                                        onPress={() => navigation.navigate('LessonPlans', { classId, className, role: profile?.role })}
                                        style={{ backgroundColor: theme.colors.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                                    >
                                        <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '900' }}>MANAGE ALL</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => navigation.navigate('LessonPlans', { classId, className, role: profile?.role })}
                                        style={{ backgroundColor: theme.colors.primary, width: 28, height: 28, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        <FontAwesomeIcon icon={faPlus} size={12} color="#fff" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        {lessons.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faBookOpen} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No lesson plans available.</Text>
                            </View>
                        ) : (
                            lessons.map((lesson, index) => (
                                <TouchableOpacity 
                                    key={lesson.id} 
                                    style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                                    onPress={() => navigation.navigate('LessonPlans', { classId, className, role: profile?.role })}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: getStatusColor(lesson.status) + '15' }]}>
                                        <FontAwesomeIcon icon={faBookOpen} size={16} color={getStatusColor(lesson.status)} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{lesson.title}</Text>
                                        <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>
                                            {new Date(lesson.scheduled_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                    <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.cardBorder} />
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                );
            case 'schedule':
                return (
                    <View style={styles.contentContainer}>
                        {(profile?.role === 'teacher' || profile?.role === 'admin') && (
                            <TouchableOpacity 
                                onPress={() => openAddScheduleModal()}
                                style={[styles.mainActionBtn, { backgroundColor: theme.colors.primary, marginBottom: 20, width: '100%', h: 56 }]}
                            >
                                <FontAwesomeIcon icon={faPlus} size={14} color="#fff" />
                                <Text style={styles.mainActionText}>NEW SESSION</Text>
                            </TouchableOpacity>
                        )}
                        {schedules.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faCalendarAlt} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No scheduled sessions.</Text>
                            </View>
                        ) : (
                            schedules.map((schedule, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                                    onPress={() => {
                                        if (isTeacher) {
                                            setSelectedScheduleDate(getDateString(schedule.start_time));
                                            setActiveTab('classmates');
                                        }
                                    }}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <FontAwesomeIcon icon={faClock} size={16} color={theme.colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                                            {new Date(schedule.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </Text>
                                        <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>
                                            {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                        </Text>
                                        {schedule.class_info && <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>{schedule.class_info}</Text>}
                                    </View>
                                    {isTeacher && (
                                        <View style={{ flexDirection: 'row', gap: 12 }}>
                                            <TouchableOpacity onPress={() => {
                                                setSelectedSchedule(schedule);
                                                setTempStartTime(formatTime(schedule.start_time));
                                                setTempEndTime(formatTime(schedule.end_time));
                                                setTempClassInfo(schedule.class_info || "");
                                                setEditModalVisible(true);
                                            }}>
                                                <FontAwesomeIcon icon={faEdit} size={16} color={theme.colors.placeholder} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteSchedule(schedule.id)}>
                                                <FontAwesomeIcon icon={faTrash} size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                );
            case 'classmates':
                if (isTeacher) {
                    return (
                        <View style={styles.contentContainer}>
                            {selectedScheduleDate ? (
                                <>
                                    <View style={[styles.instructionCard, { backgroundColor: theme.colors.primary + '08', borderColor: theme.colors.primary + '20', marginBottom: 20 }]}>
                                        <TouchableOpacity onPress={() => setSelectedScheduleDate(null)} style={{ marginRight: 12 }}>
                                            <FontAwesomeIcon icon={faArrowLeft} size={16} color={theme.colors.primary} />
                                        </TouchableOpacity>
                                        <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
                                            Marking Register for {new Date(selectedScheduleDate).toLocaleDateString()}.
                                        </Text>
                                    </View>

                                    <View style={[styles.actionBar, { marginBottom: 24 }]}>
                                        <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: '#10b981', flex: 1 }]} onPress={markAllPresent}>
                                            <FontAwesomeIcon icon={faCheckCircle} size={14} color="#fff" />
                                            <Text style={styles.mainActionText}>MARK ALL PRESENT</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.sectionTitle}>STUDENT ROSTER</Text>
                                    {classMembers.map((member) => {
                                        const student = member.users;
                                        const attendanceStatus = member.attendance?.[selectedScheduleDate] ?? null;
                                        return (
                                            <View key={member.id} style={[styles.studentCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, padding: 16, borderRadius: 20, marginBottom: 12 }]}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Image source={student.avatar_url ? { uri: student.avatar_url } : defaultUserImage} style={{ width: 40, height: 40, borderRadius: 12 }} />
                                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                                        <Text style={[styles.cardTitle, { color: theme.colors.text, marginBottom: 2 }]}>{student.full_name}</Text>
                                                        <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>{student.email}</Text>
                                                    </View>
                                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                                        <TouchableOpacity
                                                            onPress={() => handleAttendanceChange(member, true)}
                                                            style={[styles.attBtn, attendanceStatus === true && { backgroundColor: '#10b981' }]}
                                                        >
                                                            <FontAwesomeIcon icon={faCheckCircle} size={14} color={attendanceStatus === true ? '#fff' : '#10b981'} />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            onPress={() => handleAttendanceChange(member, false)}
                                                            style={[styles.attBtn, attendanceStatus === false && { backgroundColor: '#ef4444' }]}
                                                        >
                                                            <FontAwesomeIcon icon={faTimesCircle} size={14} color={attendanceStatus === false ? '#fff' : '#ef4444'} />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </>
                            ) : (
                                <>
                                    <View style={[styles.actionBar, { marginBottom: 24 }]}>
                                        <TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: theme.colors.primary, flex: 1 }]} onPress={() => setMarksModalVisible(true)}>
                                            <FontAwesomeIcon icon={faPlusCircle} size={14} color="#fff" />
                                            <Text style={styles.mainActionText}>ENTER MARKS</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.sectionTitle}>ENROLLED STUDENTS</Text>
                                    {classMembers.length === 0 ? (
                                        <View style={styles.emptyState}>
                                            <FontAwesomeIcon icon={faUserGraduate} size={40} color={theme.colors.placeholder + '40'} />
                                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No students enrolled.</Text>
                                        </View>
                                    ) : (
                                        classMembers.map((member) => (
                                            <View key={member.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                                <Image source={member.users?.avatar_url ? { uri: member.users.avatar_url } : defaultUserImage} style={{ width: 36, height: 36, borderRadius: 10 }} />
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{member.users?.full_name}</Text>
                                                    <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>{member.users?.email}</Text>
                                                </View>
                                                <TouchableOpacity onPress={() => removeStudentFromClass(member.users?.id)} style={{ padding: 8 }}>
                                                    <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    )}

                                    <View style={{ marginTop: 32 }}>
                                        <Text style={styles.sectionTitle}>ENROLL NEW STUDENTS</Text>
                                        <View style={[styles.searchBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 50, borderRadius: 16, marginBottom: 16 }]}>
                                            <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} />
                                            <TextInput
                                                style={{ flex: 1, marginLeft: 12, fontSize: 14, color: theme.colors.text }}
                                                value={searchQuery}
                                                onChangeText={(t) => { setSearchQuery(t); fetchAllStudents(); }}
                                                placeholder="Search students..."
                                                placeholderTextColor={theme.colors.placeholder}
                                            />
                                        </View>
                                        {availableStudents.map((item) => (
                                            <View key={item.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                                <Image source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage} style={{ width: 36, height: 36, borderRadius: 10 }} />
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.full_name}</Text>
                                                    <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>{item.email}</Text>
                                                </View>
                                                <TouchableOpacity 
                                                    onPress={() => addStudentToClass(item.id)} 
                                                    style={{ backgroundColor: theme.colors.primary + '15', width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}
                                                >
                                                    <FontAwesomeIcon icon={faPlus} size={12} color={theme.colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </View>
                    );
                }
                
                // Student View for classmates
                return (
                    <View style={styles.contentContainer}>
                        <Text style={styles.sectionTitle}>MY CLASSMATES</Text>
                        {classMembers.map((member) => (
                            <View key={member.id} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                <Image source={member.users?.avatar_url ? { uri: member.users.avatar_url } : defaultUserImage} style={{ width: 36, height: 36, borderRadius: 10 }} />
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{member.users?.full_name}</Text>
                                    <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>{member.users?.email}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                );
            case 'attendance':
                const attendanceRate = attendance.length > 0
                    ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
                    : 0;
                return (
                    <View style={styles.contentContainer}>
                        {attendance.length > 0 && (
                            <View style={[styles.rateCard, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '20' }]}>
                                <Text style={[styles.rateLabel, { color: theme.colors.primary }]}>OVERALL ATTENDANCE RATE</Text>
                                <Text style={[styles.rateValue, { color: theme.colors.primary }]}>{attendanceRate}%</Text>
                            </View>
                        )}
                        {attendance.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faCheckCircle} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No attendance records yet.</Text>
                            </View>
                        ) : (
                            attendance.map((record, index) => (
                                <View key={index} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                    <View style={[styles.iconBox, { backgroundColor: record.status === 'present' ? '#ecfdf5' : '#fff1f2' }]}>
                                        <FontAwesomeIcon
                                            icon={record.status === 'present' ? faCheckCircle : faTimesCircle}
                                            size={16}
                                            color={record.status === 'present' ? '#10b981' : '#e11d48'}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                                            {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                                        </Text>
                                        <Text style={[styles.cardSubtitle, { color: record.status === 'present' ? '#10b981' : '#e11d48', fontWeight: '900', textTransform: 'uppercase' }]}>
                                            {record.status}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                );
            case 'grades':
                const examMarks = marks.filter(m => !m.is_completion_mark);
                const courseworkMarks = marks.filter(m => m.is_completion_mark);

                const renderMarkCard = (mark, index) => (
                    <View key={index} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{mark.assessment_name}</Text>
                            <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>{new Date(mark.created_at || mark.assessment_date).toLocaleDateString()}</Text>
                        </View>
                        <View style={[styles.gradeBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={[styles.gradeText, { color: theme.colors.primary }]}>
                                {mark.score !== undefined && mark.total_possible !== undefined ? `${((mark.score / mark.total_possible) * 100).toFixed(1)}%` : mark.mark}
                            </Text>
                        </View>
                    </View>
                );

                return (
                    <View style={styles.contentContainer}>
                        {marks.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faGraduationCap} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No marks recorded.</Text>
                            </View>
                        ) : (
                            <>
                                {examMarks.length > 0 && (
                                    <>
                                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>EXAMS & TESTS</Text>
                                        {examMarks.map((mark, index) => renderMarkCard(mark, `exam-${index}`))}
                                    </>
                                )}

                                {courseworkMarks.length > 0 && (
                                    <>
                                        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: examMarks.length > 0 ? 24 : 0 }]}>COURSEWORK (HW & ASGN)</Text>
                                        {courseworkMarks.map((mark, index) => renderMarkCard(mark, `cw-${index}`))}
                                    </>
                                )}
                            </>
                        )}
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {renderHeader()}
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
            >
                {renderContent()}
            </ScrollView>

            <AnnouncementDetailModal
                visible={isAnnouncementModalVisible}
                onClose={() => setIsAnnouncementModalVisible(false)}
                announcement={selectedItem}
            />

            <ManageCompletionsModal
                visible={isManageModalVisible}
                onClose={() => setIsManageModalVisible(false)}
                item={selectedItem}
                type={manageType}
            />

            <MarksModal
                visible={isMarksModalVisible}
                onClose={() => setMarksModalVisible(false)}
                classId={classId}
                classMembers={classMembers}
            />

            <ManageMarksModal
                visible={isManageMarksModalVisible}
                onClose={() => {
                    setManageMarksModalVisible(false);
                    setSelectedStudent(null);
                }}
                student={selectedStudent}
                classId={classId}
            />

            {/* Homework Detail Modal */}
            <RNModal
                isVisible={isHomeworkDetailVisible}
                onBackdropPress={() => setIsHomeworkDetailVisible(false)}
                onSwipeComplete={() => setIsHomeworkDetailVisible(false)}
                swipeDirection={['down']}
                scrollTo={handleHwScrollTo}
                scrollOffset={hwScrollOffset}
                scrollOffsetMax={400}
                propagateSwipe={true}
                animationIn="slideInUp"
                animationOut="slideOutDown"
                backdropOpacity={0.4}
                style={{ justifyContent: 'flex-end', margin: 0 }}
            >
                <View style={[styles.modalContentAlt, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.swipeIndicator} />
                    {selectedItem && activeTab === 'homework' && (
                        <>
                            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.cardBorder }]}>
                                <View style={[styles.modalIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <FontAwesomeIcon icon={faClipboardList} size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.modalTitleAlt, { color: theme.colors.text }]}>Homework Details</Text>
                                <View style={styles.modalHeaderActions}>
                                    <TouchableOpacity onPress={() => setIsHomeworkDetailVisible(false)} style={styles.modalCloseBtn}>
                                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView
                                ref={hwScrollViewRef}
                                onScroll={handleHwScroll}
                                scrollEventThrottle={16}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{
                                    paddingTop: 24,
                                    paddingBottom: Math.max(insets.bottom, 24)
                                }}
                            >
                                <View style={styles.modalMessageWrapper}>
                                    {isEditing ? (
                                        <TextInput
                                            style={[styles.modalTextInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                                            value={selectedItem.description}
                                            multiline
                                            onChangeText={(t) => setSelectedItem({ ...selectedItem, description: t })}
                                        />
                                    ) : (
                                        <Text style={[styles.modalDescriptionText, { color: theme.colors.text }]}>
                                            {selectedItem.description}
                                        </Text>
                                    )}
                                </View>

                                <View style={[styles.modalMetaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                    <View style={styles.modalMetaRow}>
                                        <View style={[styles.modalMetaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                            <FontAwesomeIcon icon={faBook} size={12} color={theme.colors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.modalMetaLabel, { color: theme.colors.placeholder }]}>SUBJECT</Text>
                                            {isEditing ? (
                                                <TextInput
                                                    style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14, padding: 0 }}
                                                    value={selectedItem.subject}
                                                    onChangeText={(t) => setSelectedItem({ ...selectedItem, subject: t })}
                                                />
                                            ) : (
                                                <Text style={[styles.modalMetaValue, { color: theme.colors.text }]}>{selectedItem.subject}</Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={[styles.modalMetaDivider, { backgroundColor: theme.colors.cardBorder }]} />

                                    <View style={styles.modalMetaRow}>
                                        <View style={[styles.modalMetaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                            <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.colors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.modalMetaLabel, { color: theme.colors.placeholder }]}>DUE DATE</Text>
                                            <Text style={[styles.modalMetaValue, { color: theme.colors.text }]}>{formatDate(selectedItem.due_date)}</Text>
                                        </View>
                                    </View>
                                </View>

                                {selectedItem.resources?.length > 0 && (
                                    <View style={{ marginTop: 24 }}>
                                        <Text style={[styles.modalSectionLabel, { color: theme.colors.placeholder }]}>ATTACHED MATERIALS ({selectedItem.resources.length})</Text>
                                        {selectedItem.resources.map((res) => (
                                            <TouchableOpacity
                                                key={res.id}
                                                style={[styles.modalResourceItem, { backgroundColor: '#10b981' + '10', borderColor: '#10b981' + '30', borderWidth: 1 }]}
                                                onPress={() => {
                                                    setSelectedResource(res);
                                                    setResourceModalVisible(true);
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.modalResourceTitle, { color: theme.colors.text }]}>{res.title}</Text>
                                                    <Text style={{ fontSize: 10, color: theme.colors.placeholder, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>Library Resource</Text>
                                                </View>
                                                <View style={[styles.modalResourceAction, { backgroundColor: '#10b981' }]}>
                                                    <FontAwesomeIcon icon={faExternalLinkAlt} size={10} color="#fff" />
                                                    <Text style={styles.modalResourceActionText}>OPEN</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {user.id === selectedItem.created_by && (
                                    <View style={[styles.modalBtnContainer, { marginTop: 24 }]}>
                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: theme.colors.primary }]}
                                            onPress={() => (isEditing ? handleHomeworkUpdate() : setIsEditing(true))}
                                        >
                                            <FontAwesomeIcon icon={faPen} size={16} color="#fff" />
                                            <Text style={styles.modalActionBtnText}>
                                                {isEditing ? 'Save Changes' : 'Edit Homework'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: theme.colors.error, marginLeft: 12 }]}
                                            onPress={handleHomeworkDelete}
                                            disabled={isEditing}
                                        >
                                            <FontAwesomeIcon icon={faTrash} size={16} color="#fff" />
                                            <Text style={styles.modalActionBtnText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        </>
                    )}
                </View>
            </RNModal>

            {/* Assignment Detail Modal */}
            <RNModal
                isVisible={isAssignmentDetailVisible}
                onBackdropPress={() => setIsAssignmentDetailVisible(false)}
                onSwipeComplete={() => setIsAssignmentDetailVisible(false)}
                swipeDirection={['down']}
                scrollTo={handleAsgnScrollTo}
                scrollOffset={asgnScrollOffset}
                scrollOffsetMax={400}
                propagateSwipe={true}
                animationIn="slideInUp"
                animationOut="slideOutDown"
                backdropOpacity={0.4}
                style={{ justifyContent: 'flex-end', margin: 0 }}
            >
                <View style={[styles.modalContentAlt, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.swipeIndicator} />
                    {selectedItem && activeTab === 'assignments' && (
                        <>
                            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.cardBorder }]}>
                                <View style={[styles.modalIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                    <FontAwesomeIcon icon={faClipboardList} size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.modalTitleAlt, { color: theme.colors.text }]}>Assignment Details</Text>
                                <View style={styles.modalHeaderActions}>
                                    <TouchableOpacity onPress={() => setIsAssignmentDetailVisible(false)} style={styles.modalCloseBtn}>
                                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <ScrollView
                                ref={asgnScrollViewRef}
                                onScroll={handleAsgnScroll}
                                scrollEventThrottle={16}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{
                                    paddingTop: 24,
                                    paddingBottom: Math.max(insets.bottom, 24)
                                }}
                            >
                                <View style={styles.modalMessageWrapper}>
                                    {isEditing ? (
                                        <TextInput
                                            style={[styles.modalTextInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                                            value={selectedItem.description}
                                            multiline
                                            onChangeText={(t) => setSelectedItem({ ...selectedItem, description: t })}
                                        />
                                    ) : (
                                        <Text style={[styles.modalDescriptionText, { color: theme.colors.text }]}>
                                            {selectedItem.description}
                                        </Text>
                                    )}
                                </View>

                                <View style={[styles.modalMetaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                    <View style={styles.modalMetaRow}>
                                        <View style={[styles.modalMetaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                            <FontAwesomeIcon icon={faBook} size={12} color={theme.colors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.modalMetaLabel, { color: theme.colors.placeholder }]}>TITLE</Text>
                                            {isEditing ? (
                                                <TextInput
                                                    style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14, padding: 0 }}
                                                    value={selectedItem.title}
                                                    onChangeText={(t) => setSelectedItem({ ...selectedItem, title: t })}
                                                />
                                            ) : (
                                                <Text style={[styles.modalMetaValue, { color: theme.colors.text }]}>{selectedItem.title}</Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={[styles.modalMetaDivider, { backgroundColor: theme.colors.cardBorder }]} />

                                    <View style={styles.modalMetaRow}>
                                        <View style={[styles.modalMetaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                            <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.colors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.modalMetaLabel, { color: theme.colors.placeholder }]}>DUE DATE</Text>
                                            <Text style={[styles.modalMetaValue, { color: theme.colors.text }]}>{formatDate(selectedItem.due_date)}</Text>
                                        </View>
                                    </View>
                                </View>

                                {selectedItem.resources?.length > 0 && (
                                    <View style={{ marginTop: 24 }}>
                                        <Text style={[styles.modalSectionLabel, { color: theme.colors.placeholder }]}>ATTACHED MATERIALS ({selectedItem.resources.length})</Text>
                                        {selectedItem.resources.map((res) => (
                                            <TouchableOpacity
                                                key={res.id}
                                                style={[styles.modalResourceItem, { backgroundColor: '#10b981' + '10', borderColor: '#10b981' + '30', borderWidth: 1 }]}
                                                onPress={() => {
                                                    setSelectedResource(res);
                                                    setResourceModalVisible(true);
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.modalResourceTitle, { color: theme.colors.text }]}>{res.title}</Text>
                                                    <Text style={{ fontSize: 10, color: theme.colors.placeholder, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>Library Resource</Text>
                                                </View>
                                                <View style={[styles.modalResourceAction, { backgroundColor: '#10b981' }]}>
                                                    <FontAwesomeIcon icon={faExternalLinkAlt} size={10} color="#fff" />
                                                    <Text style={styles.modalResourceActionText}>OPEN</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {user.id === selectedItem.assigned_by && (
                                    <View style={[styles.modalBtnContainer, { marginTop: 24 }]}>
                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: theme.colors.primary }]}
                                            onPress={() => (isEditing ? handleAssignmentUpdate() : setIsEditing(true))}
                                        >
                                            <FontAwesomeIcon icon={faPen} size={16} color="#fff" />
                                            <Text style={styles.modalActionBtnText}>
                                                {isEditing ? 'Save Changes' : 'Edit Assignment'}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.modalActionBtn, { backgroundColor: theme.colors.error, marginLeft: 12 }]}
                                            onPress={handleAssignmentDelete}
                                            disabled={isEditing}
                                        >
                                            <FontAwesomeIcon icon={faTrash} size={16} color="#fff" />
                                            <Text style={styles.modalActionBtnText}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                        </>
                    )}
                </View>
            </RNModal>

            <ResourceDetailModal
                visible={resourceModalVisible}
                onClose={() => {
                    setResourceModalVisible(false);
                    setSelectedResource(null);
                }}
                resource={selectedResource}
            />

            {/* Edit Schedule Modal */}
            <Modal visible={isEditModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setEditModalVisible(false)}>
                    <View style={[styles.modalBox, { backgroundColor: theme.colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Session</Text>
                        <View style={styles.timePickerRow}>
                            <View style={styles.timeCol}>
                                <Text style={styles.timeLabel}>START</Text>
                                <TextInput style={[styles.timeInp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} value={tempStartTime} onChangeText={(t) => {
                                    const cleaned = t.replace(/[^0-9]/g, '');
                                    let nt = cleaned;
                                    if (cleaned.length > 2) nt = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
                                    setTempStartTime(nt);
                                }} />
                            </View>
                            <View style={styles.timeCol}>
                                <Text style={styles.timeLabel}>END</Text>
                                <TextInput style={[styles.timeInp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} value={tempEndTime} onChangeText={(t) => {
                                    const cleaned = t.replace(/[^0-9]/g, '');
                                    let nt = cleaned;
                                    if (cleaned.length > 2) nt = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
                                    setTempEndTime(nt);
                                }} />
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
                            onDayPress={(day) => setNewScheduleDate(day.dateString)}
                            hideExtraDays={true}
                            markedDates={{ [newScheduleDate]: { selected: true, selectedColor: theme.colors.primary } }}
                            theme={{ calendarBackground: theme.colors.surface, dayTextColor: theme.colors.text, monthTextColor: theme.colors.text }}
                        />
                        {newScheduleDate && (
                            <View style={{ marginTop: 20 }}>
                                <View style={styles.timePickerRow}>
                                    <View style={styles.timeCol}>
                                        <Text style={styles.timeLabel}>START</Text>
                                        <TextInput style={[styles.timeInp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} value={newStartTime} onChangeText={(t) => {
                                            const cleaned = t.replace(/[^0-9]/g, '');
                                            let nt = cleaned;
                                            if (cleaned.length > 2) nt = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
                                            setNewStartTime(nt);
                                        }} />
                                    </View>
                                    <View style={styles.timeCol}>
                                        <Text style={styles.timeLabel}>END</Text>
                                        <TextInput style={[styles.timeInp, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} value={newEndTime} onChangeText={(t) => {
                                            const cleaned = t.replace(/[^0-9]/g, '');
                                            let nt = cleaned;
                                            if (cleaned.length > 2) nt = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
                                            setNewEndTime(nt);
                                        }} />
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
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heroContainer: {
        paddingHorizontal: 20,
        paddingBottom: 32, // More space for overlapping tab container
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
    },
    heroContent: {
        alignItems: 'center',
    },
    subjectText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 8,
    },
    teacherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 8,
    },
    teacherText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Distribute evenly
        marginTop: -24,
        marginHorizontal: 16,
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: 16,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        gap: 6,
    },
    tabText: {
        fontSize: 10,
        fontWeight: '700',
        textAlign: 'center',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -8,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 8,
        minWidth: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#fff',
    },
    contentContainer: {
        padding: 20,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 16,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        gap: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 12,
        fontWeight: '500',
    },
    cardBody: {
        fontSize: 13,
        marginTop: 6,
    },
    gradeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    gradeText: {
        fontSize: 14,
        fontWeight: '900',
    },
    rateCard: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    rateLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    rateValue: {
        fontSize: 32,
        fontWeight: '900',
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 16,
        opacity: 0.8,
    },
    attBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)' },
    instructionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 12,
    },
    instructionText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    actionBar: { flexDirection: 'row', gap: 12 },
    mainActionBtn: { flex: 1, height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    mainActionText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    studentCard: { borderRadius: 24, padding: 16, marginBottom: 12 },
    searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 50, borderRadius: 16, marginBottom: 16 },
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
    resourceTypeContainer: {
        marginBottom: 16,
    },
    typeToggleBar: {
        flexDirection: 'row',
        borderRadius: 12,
        borderWidth: 1,
        padding: 4,
        gap: 4,
    },
    typeToggle: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    typeToggleText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    inlineLessonBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.05)',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        gap: 3,
    },
    inlineLessonText: {
        fontSize: 9,
        color: '#6366f1',
        fontWeight: '700',
    },
    // Detail Modal Styles
    modalContentAlt: {
        paddingHorizontal: 24,
        paddingTop: 8,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '85%',
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    modalIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalTitleAlt: {
        fontSize: 20,
        fontWeight: '900',
        flex: 1,
        letterSpacing: -0.5,
    },
    modalHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    modalMessageWrapper: {
        marginBottom: 32,
    },
    modalDescriptionText: {
        fontSize: 16,
        lineHeight: 26,
        fontWeight: '600',
    },
    modalMetaCard: {
        borderRadius: 24,
        padding: 20,
    },
    modalMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalMetaIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalMetaLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    modalMetaValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    modalMetaDivider: {
        height: 1,
        marginVertical: 16,
        marginLeft: 48,
    },
    modalBtnContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalActionBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    modalActionBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    modalTextInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        lineHeight: 24,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalResourceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    modalResourceTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    modalResourceAction: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 6,
    },
    modalResourceActionText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    modalSectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
});

export default React.memo(StudentClassDashboardScreen);
