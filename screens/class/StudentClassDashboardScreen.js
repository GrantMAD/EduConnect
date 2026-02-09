import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faBullhorn,
    faBook,
    faClipboardList,
    faCalendarAlt,
    faGraduationCap,
    faChevronLeft,
    faUserGraduate,
    faClock,
    faMapMarkerAlt,
    faEllipsisH,
    faCheckCircle,
    faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fetchClassInfo, fetchClassMembers, fetchClassSchedules, fetchAttendanceHistory } from '../../services/classService';
import { fetchStudentMarks, fetchParentChildren, fetchClassMembersIds } from '../../services/userService';
import { fetchAnnouncements } from '../../services/announcementService';
import { fetchHomework } from '../../services/homeworkService';
import { fetchAssignmentsByClass } from '../../services/assignmentService';

// Import components
import HomeworkCard from '../../components/HomeworkCard';
import AssignmentCard from '../../components/AssignmentCard';
import AnnouncementCard from '../../components/AnnouncementCard';
import ManageCompletionsModal from '../../components/ManageCompletionsModal';
import AnnouncementDetailModal from '../../components/AnnouncementDetailModal';

const { width } = Dimensions.get('window');

const StudentClassDashboardScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { classId, className } = route.params || {};
    const { theme } = useTheme();
    const { user, profile } = useAuth();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState('announcements');
    const [loading, setLoading] = useState(true);
    const [classData, setClassData] = useState(null);
    const [schedules, setSchedules] = useState([]);
    const [announcements, setAnnouncements] = useState([]); // Placeholder
    const [homework, setHomework] = useState([]); // Placeholder
    const [assignments, setAssignments] = useState([]); // Placeholder
    const [marks, setMarks] = useState([]);
    const [attendance, setAttendance] = useState([]);

    // Modal state
    const [selectedItem, setSelectedItem] = useState(null);
    const [isAnnouncementModalVisible, setIsAnnouncementModalVisible] = useState(false);
    const [isManageModalVisible, setIsManageModalVisible] = useState(false);
    const [manageType, setManageType] = useState('homework');

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

            const [info, scheds, myMarks, myAttendance, classAnnouncements, classHomework, classAssignments] = await Promise.all([
                fetchClassInfo(classId),
                fetchClassSchedules([classId]),
                fetchStudentMarks(targetStudentId, [classId]),
                fetchAttendanceHistory(targetStudentId, classId),
                fetchAnnouncements(classId),
                fetchHomework(profile?.school_id, targetStudentId, profile?.role, { class_id: classId }),
                fetchAssignmentsByClass(classId)
            ]);

            console.log(`Fetched ${myMarks?.length || 0} marks, ${classAnnouncements?.length || 0} news, ${classHomework?.length || 0} hw, and ${classAssignments?.length || 0} asgns`);
            setClassData(info);
            setSchedules(scheds || []);
            setMarks(myMarks || []);
            setAttendance(myAttendance || []);
            setAnnouncements(classAnnouncements || []);
            setHomework(classHomework || []);
            setAssignments(classAssignments || []);
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
        { id: 'announcements', label: 'Announcements', icon: faBullhorn, count: announcements.length },
        { id: 'homework', label: 'Homework', icon: faBook, count: homework.length },
        { id: 'assignments', label: 'Assignments', icon: faClipboardList, count: assignments.length },
        { id: 'schedule', label: 'Schedule', icon: faCalendarAlt, count: schedules.length },
        { id: 'attendance', label: 'Attendance', icon: faCheckCircle, count: attendance.length },
        { id: 'grades', label: 'Grades', icon: faGraduationCap, count: marks.length },
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
                            {tab.label === 'Announcements' ? 'News' : tab.label}
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
                                    onPress={() => { }} // Could link to a detail view if needed
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
                                    onPress={() => { }} // Could link to a detail view if needed
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
            case 'schedule':
                return (
                    <View style={styles.contentContainer}>
                        {schedules.length === 0 ? (
                            <View style={styles.emptyState}>
                                <FontAwesomeIcon icon={faCalendarAlt} size={40} color={theme.colors.placeholder + '40'} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No scheduled sessions.</Text>
                            </View>
                        ) : (
                            schedules.map((schedule, index) => (
                                <View key={index} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                        <FontAwesomeIcon icon={faClock} size={16} color={theme.colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                                            {new Date(schedule.start_time).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </Text>
                                        <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>
                                            {new Date(schedule.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(schedule.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        {schedule.class_info && <Text style={[styles.cardBody, { color: theme.colors.textSecondary }]}>{schedule.class_info}</Text>}
                                    </View>
                                </View>
                            ))
                        )}
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
});

export default React.memo(StudentClassDashboardScreen);
