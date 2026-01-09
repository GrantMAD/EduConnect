import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faUsers, faUserTie, faChalkboardTeacher, faUserGraduate, faChild,
    faBookOpen, faClipboardList, faPoll, faUserFriends, faChevronRight,
    faChartLine
} from '@fortawesome/free-solid-svg-icons';
import StatCard from '../components/dashboard/StatCard';
import UpcomingTasks from '../components/dashboard/UpcomingTasks';
import DailyOverview from '../components/dashboard/DailyOverview';
import QuickActions from '../components/dashboard/QuickActions';
import UpcomingLessons from '../components/dashboard/UpcomingLessons';
import GamificationHub from '../components/dashboard/GamificationHub';
import RecommendedResources from '../components/dashboard/RecommendedResources';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useWalkthrough } from '../context/WalkthroughContext';
import UserListModal from '../components/UserListModal';
import FamilyLinksModal from '../components/FamilyLinksModal';
import DashboardSkeleton, { StatCardSkeleton, SkeletonPiece } from '../components/skeletons/DashboardScreenSkeleton';
import ChildProgressSnapshot from '../components/ChildProgressSnapshot';
import { useGamification } from '../context/GamificationContext';
import LinearGradient from 'react-native-linear-gradient';
import WalkthroughTarget from '../components/WalkthroughTarget';

// Import services
import { getCurrentUser } from '../services/authService';
import { getUserProfile, fetchParentChildren, fetchUsersBySchool } from '../services/userService';
import { fetchHomework as fetchHomeworkService } from '../services/homeworkService';
import { fetchAssignments as fetchAssignmentsService } from '../services/assignmentService';
import { fetchTodaySchedules, fetchClassIds } from '../services/classService';
import { fetchTodayPTMBookings } from '../services/ptmService';
import { fetchUpcomingLessons } from '../services/lessonService';
import { getDashboardStats, dailyCheckIn, fetchParentChildLinkCount, fetchClubsCount, fetchTotalClassesCount } from '../services/dashboardService';

const SCREEN_WIDTH = Dimensions.get('window').width;

const DashboardScreen = ({ navigation }) => {
    const { theme, isDarkTheme } = useTheme();
    const { schoolId, schoolData } = useSchool();
    const { showToast } = useToast();
    const { startWalkthrough } = useWalkthrough();
    const { awardXP } = useGamification();

    const [userRole, setUserRole] = useState('');
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [upcomingTasks, setUpcomingTasks] = useState([]);
    const [upcomingLessons, setUpcomingLessons] = useState([]);
    const [todaySessions, setTodaySessions] = useState([]);
    const [stats, setStats] = useState({
        totalUsers: 0,
        adminCount: 0,
        teacherCount: 0,
        studentCount: 0,
        parentCount: 0,
        classCount: 0,
        assignmentCount: 0,
        pollCount: 0,
        clubCount: 0,
        parentChildLinkCount: 0
    });

    // Modal state for user lists
    const [showUserModal, setShowUserModal] = useState(false);
    const [userListData, setUserListData] = useState([]);
    const [selectedUserCategory, setSelectedUserCategory] = useState('');
    const [showFamilyLinksModal, setShowFamilyLinksModal] = useState(false);

    const handleDailyCheckIn = useCallback(async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const data = await dailyCheckIn(user.id);

            if (data && data.length > 0) {
                awardXP('daily_check_in', 5);
            }
        } catch (e) { }
    }, [awardXP]);

    const fetchUpcomingTasks = useCallback(async (userId, role) => {
        try {
            let childIds = [];
            if (role === 'parent') {
                childIds = await fetchParentChildren(userId);
            }

            const [hwData, assignData] = await Promise.all([
                fetchHomeworkService({ userId, userRole: role, schoolId, childIds }),
                fetchAssignmentsService({ userId, userRole: role, schoolId, childIds })
            ]);

            const combined = [
                ...(hwData || []).map(i => ({ ...i, type: 'homework' })),
                ...(assignData || []).map(i => ({ ...i, type: 'assignment' }))
            ].sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5);

            setUpcomingTasks(combined);
        } catch (e) {
            console.error('Error fetching upcoming tasks:', e);
        }
    }, [schoolId]);

    const fetchTodaySessions = useCallback(async (userId, role) => {
        try {
            const [schedules, ptms] = await Promise.all([
                fetchTodaySchedules(schoolId, userId, role),
                fetchTodayPTMBookings(userId, role)
            ]);

            const combined = [
                ...(schedules || []).map(s => ({ ...s, eventType: 'class' })),
                ...(ptms || [])
                    .filter(p => p.slot) // Safety check
                    .map(p => ({
                        id: p.id,
                        start_time: p.slot.start_time,
                        end_time: p.slot.end_time,
                        title: `Meeting: ${p.notes || 'PTM'}`,
                        eventType: 'meeting'
                    }))
            ].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

            setTodaySessions(combined);
        } catch (e) {
            console.error('Error fetching today sessions:', e);
        }
    }, [schoolId]);

    const fetchDashboardLessons = useCallback(async (userId, role) => {
        try {
            if (!userId) return;
            const classIds = await fetchClassIds(userId, role, schoolId);
            if (classIds && classIds.length > 0) {
                const lessons = await fetchUpcomingLessons(classIds);
                setUpcomingLessons(lessons);
            }
        } catch (e) {
            console.error('Error fetching dashboard lessons:', e);
        }
    }, [schoolId]);

    const fetchDashboardData = useCallback(async () => {
        if (!schoolId) return;

        setLoading(true);
        try {
            // 1. Fetch Stats
            const statsData = await getDashboardStats(schoolId);

            const user = await getCurrentUser();
            const profile = await getUserProfile(user.id);

            let linkCount = 0;
            if (profile?.role === 'admin') {
                linkCount = await fetchParentChildLinkCount(schoolId);
            }

            const clubsCount = await fetchClubsCount(schoolId);
            const totalClassesCount = await fetchTotalClassesCount(schoolId);

            if (statsData) {
                setStats({
                    totalUsers: statsData.totalUsers || 0,
                    adminCount: statsData.adminCount || 0,
                    teacherCount: statsData.teacherCount || 0,
                    studentCount: statsData.studentCount || 0,
                    parentCount: statsData.parentCount || 0,
                    classCount: Math.max(0, (totalClassesCount || 0) - (clubsCount || 0)),
                    clubCount: clubsCount || 0,
                    assignmentCount: statsData.assignmentCount || 0,
                    pollCount: statsData.pollCount || 0,
                    parentChildLinkCount: linkCount
                });
            }

            // 2. Fetch Data
            await Promise.all([
                fetchUpcomingTasks(user.id, profile?.role),
                fetchTodaySessions(user.id, profile?.role),
                fetchDashboardLessons(user.id, profile?.role)
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [schoolId, fetchUpcomingTasks, fetchTodaySessions]);

    const checkUserAccessAndWalkthrough = useCallback(async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;

            const userData = await getUserProfile(user.id);

            setUserRole(userData.role);
            setUserProfile(userData);

            if (userData && !userData.has_seen_walkthrough) {
                const baseSteps = [
                    {
                        target: 'dashboard-welcome',
                        title: 'Welcome to ClassConnect',
                        content: 'This is your main dashboard on mobile. Access everything you need on the go.'
                    },
                    {
                        target: 'dashboard-header',
                        title: 'Daily Overview',
                        content: 'See your daily greeting and today\'s date at a glance.'
                    }
                ];

                if (['admin', 'teacher'].includes(userData.role)) {
                    baseSteps.push({
                        target: 'dashboard-stats',
                        title: 'Quick Stats',
                        content: 'Tap these cards for detailed statistics and management.'
                    });
                } else if (userData.role === 'student' || userData.role === 'parent') {
                    baseSteps.push({
                        target: 'dashboard-recommendations',
                        title: 'Recommendations',
                        content: 'Discover top learning materials tailored to your specific subjects.'
                    });
                    baseSteps.push({
                        target: 'dashboard-tasks',
                        title: 'Upcoming Tasks',
                        content: 'Stay on top of your homework and assignments here.'
                    });
                }

                baseSteps.push({
                    target: 'dashboard-recent',
                    title: 'Recent Activity',
                    content: 'Catch up on the latest announcements and messages.'
                });

                setTimeout(() => {
                    startWalkthrough(baseSteps);
                }, 1500);
            }
        } catch (error) {
            console.error('Error checking access:', error);
            showToast('Failed to verify access.', 'error');
            navigation.goBack();
        }
    }, [navigation, showToast, startWalkthrough]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([fetchDashboardData(), checkUserAccessAndWalkthrough()]);
        setRefreshing(false);
    }, [fetchDashboardData, checkUserAccessAndWalkthrough]);

    const fetchUsersByCategory = useCallback(async (category) => {
        try {
            const filters = {};
            if (category !== 'total') {
                filters.role = category;
            }

            const data = await fetchUsersBySchool(schoolId, filters);

            setUserListData(data || []);
            setSelectedUserCategory(category);
            setShowUserModal(true);
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Failed to load user list', 'error');
        }
    }, [schoolId, showToast]);

    useEffect(() => {
        if (schoolId) {
            fetchDashboardData();
        } else {
            setLoading(false);
        }
        checkUserAccessAndWalkthrough();
        handleDailyCheckIn();
    }, [schoolId, fetchDashboardData, checkUserAccessAndWalkthrough, handleDailyCheckIn]);

    const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
            }
        >
            <View style={styles.content}>
                {/* Header Badge */}
                <View id="dashboard-header" style={styles.headerBadge}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.greetingBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={[styles.greetingText, { color: theme.colors.primary }]}>
                                {greeting}
                            </Text>
                        </View>
                        {userProfile ? (
                            <Text style={[styles.userNameLarge, { color: theme.colors.text }]}>
                                {userProfile.full_name?.split(' ')[0]}
                            </Text>
                        ) : (
                            <SkeletonPiece style={{ width: 140, height: 34, borderRadius: 8, marginTop: 4, marginLeft: 4 }} />
                        )}
                    </View>
                    <View style={[styles.dateBadgeFull, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '20', borderWidth: 1 }]}>
                        <Text style={[styles.dateTextFull, { color: theme.colors.primary }]}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </View>

                {/* School Banner & Welcome Card combined (Matches Web Design) */}
                <WalkthroughTarget id="dashboard-welcome">
                    <View style={styles.bannerContainer}>
                        {schoolData?.logo_url ? (
                            <Image
                                source={{ uri: schoolData.logo_url }}
                                style={styles.bannerImage}
                                resizeMode="cover"
                            />
                        ) : (
                            <LinearGradient
                                colors={['#4f46e5', '#4338ca']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        )}

                        {/* Gradient Overlay for Text Readability */}
                        <LinearGradient
                            colors={schoolData?.logo_url
                                ? ['rgba(30, 27, 75, 0.95)', 'rgba(30, 27, 75, 0.6)', 'transparent']
                                : ['transparent', 'rgba(0,0,0,0.1)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />

                        <View style={styles.bannerContent}>
                            <Text style={styles.bannerTitle} numberOfLines={2}>
                                {schoolData?.name || "Welcome to ClassConnect"}
                            </Text>
                            <Text style={styles.bannerSubtitle} numberOfLines={3}>
                                {"Explore your school's portal, stay connected, and track your progress all in one place."}
                            </Text>

                            <View style={styles.bannerDecoration}>
                                <View style={[styles.decorationLine, { backgroundColor: schoolData?.logo_url ? '#818cf8' : 'rgba(255,255,255,0.4)' }]} />
                                <Text style={[styles.decorationText, { color: schoolData?.logo_url ? '#a5b4fc' : 'rgba(255,255,255,0.6)' }]}>
                                    ClassConnect Portal
                                </Text>
                            </View>
                        </View>
                    </View>
                </WalkthroughTarget>

                {/* Gamification Hub */}
                <GamificationHub id="dashboard-gamification" />

                {/* Recommended Resources (Student/Parent only) */}
                {['student', 'parent'].includes(userRole) && (
                    <RecommendedResources
                        id="dashboard-recommendations"
                        schoolId={schoolId}
                        userId={userProfile?.id}
                        role={userRole}
                    />
                )}

                {/* Role Specific Widgets */}
                {userRole === 'parent' && (
                    <ChildProgressSnapshot id="dashboard-parent-child" loading={loading} />
                )}

                {['admin', 'teacher'].includes(userRole) || loading ? (
                    <QuickActions id="dashboard-quick-actions" navigation={navigation} userRole={userRole} loading={loading} />
                ) : null}

                {/* Tasks & Events */}
                <View style={styles.row}>
                    <UpcomingTasks
                        id="dashboard-tasks"
                        loading={loading}
                        upcomingTasks={upcomingTasks}
                        navigation={navigation}
                        style={styles.fullWidth}
                    />
                </View>

                <UpcomingLessons
                    lessons={upcomingLessons}
                    navigation={navigation}
                    role={userRole}
                />

                <DailyOverview
                    id="dashboard-recent"
                    loading={loading}
                    todaySessions={todaySessions}
                    navigation={navigation}
                />

                {/* Admin/Teacher Stats */}
                {['admin', 'teacher'].includes(userRole) && (
                    <View id="dashboard-stats" style={styles.statsSection}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>School Statistics</Text>
                        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder, marginTop: -12, marginBottom: 16 }]}>
                            A comprehensive overview of your school's community and reach.
                        </Text>

                        {loading ? (
                            <View style={styles.statsGrid}>
                                {[1, 2, 3, 4].map((item) => (
                                    <StatCardSkeleton key={item} />
                                ))}
                            </View>
                        ) : (
                            <View style={styles.statsGrid}>
                                <StatCard
                                    icon={faUsers}
                                    title="Total Users"
                                    value={stats.totalUsers}
                                    color="#007AFF"
                                    onPress={() => fetchUsersByCategory('total')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                                <StatCard
                                    icon={faUserTie}
                                    title="Admins"
                                    value={stats.adminCount}
                                    color="#FF3B30"
                                    onPress={() => fetchUsersByCategory('admin')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                                <StatCard
                                    icon={faChalkboardTeacher}
                                    title="Teachers"
                                    value={stats.teacherCount}
                                    color="#34C759"
                                    onPress={() => fetchUsersByCategory('teacher')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                                <StatCard
                                    icon={faUserGraduate}
                                    title="Students"
                                    value={stats.studentCount}
                                    color="#5856D6"
                                    onPress={() => fetchUsersByCategory('student')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                                <StatCard
                                    icon={faChild}
                                    title="Parents"
                                    value={stats.parentCount}
                                    color="#FF9500"
                                    onPress={() => fetchUsersByCategory('parent')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                                {userRole === 'admin' && (
                                    <StatCard
                                        icon={faUserFriends}
                                        title="Family Links"
                                        value={stats.parentChildLinkCount}
                                        color="#AF52DE"
                                        onPress={() => setShowFamilyLinksModal(true)}
                                        style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                    />
                                )}
                            </View>
                        )}

                        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Content & Activity</Text>
                        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder, marginTop: -12, marginBottom: 16 }]}>
                            Monitor educational materials and engagement across the platform.
                        </Text>

                        {loading ? (
                            <View style={styles.statsGrid}>
                                {[1, 2, 3, 4].map((item) => (
                                    <StatCardSkeleton key={item} />
                                ))}
                            </View>
                        ) : (
                            <View style={styles.statsGrid}>
                                <StatCard
                                    icon={faBookOpen}
                                    title="Classes"
                                    value={stats.classCount}
                                    color="#007AFF"
                                    onPress={() => navigation.navigate('ManageClasses')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                                <StatCard
                                    icon={faUserFriends}
                                    title="Clubs"
                                    value={stats.clubCount}
                                    color="#FF9500"
                                    onPress={() => navigation.navigate('ClubList')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                                <StatCard
                                    icon={faClipboardList}
                                    title="Assignments"
                                    value={stats.assignmentCount}
                                    color="#5856D6"
                                    onPress={() => navigation.navigate('Homework')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                                <StatCard
                                    icon={faPoll}
                                    title="Active Polls"
                                    value={stats.pollCount}
                                    color="#FF9500"
                                    onPress={() => navigation.navigate('Polls')}
                                    style={{ backgroundColor: isDarkTheme ? '#262626' : '#f3f4f6' }}
                                />
                            </View>
                        )}
                    </View>
                )}
            </View>

            <UserListModal
                visible={showUserModal}
                onClose={() => setShowUserModal(false)}
                users={userListData}
                category={selectedUserCategory}
            />

            <FamilyLinksModal
                visible={showFamilyLinksModal}
                onClose={() => setShowFamilyLinksModal(false)}
            />
        </ScrollView>
    );
};

export default React.memo(DashboardScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    headerBadge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
        paddingTop: 8,
    },
    headerLeft: {
        flex: 1,
    },
    greetingBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 6,
    },
    greetingText: {
        fontSize: 11,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    userNameLarge: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginLeft: 4,
    },
    dateBadgeFull: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateTextFull: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    bannerContainer: {
        width: '100%',
        height: 200,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        position: 'relative',
        backgroundColor: '#4f46e5',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    bannerContent: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
        zIndex: 10,
    },
    bannerTitle: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    bannerSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
        maxWidth: '85%',
    },
    bannerDecoration: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    decorationLine: {
        height: 3,
        width: 40,
        borderRadius: 2,
        marginRight: 10,
    },
    decorationText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    fullWidth: { flex: 1 },
    statsSection: { marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16 },
    sectionDescription: { fontSize: 12, fontWeight: '600' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
