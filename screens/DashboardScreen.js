import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, Dimensions } from 'react-native';
import {
    faUsers, faUserTie, faChalkboardTeacher, faUserGraduate, faChild,
    faBookOpen, faClipboardList, faPoll, faUserFriends
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
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGamification } from '../context/GamificationContext';
import UserListModal from '../components/UserListModal';
import FamilyLinksModal from '../components/FamilyLinksModal';
import ChildProgressSnapshot from '../components/ChildProgressSnapshot';
import LinearGradient from 'react-native-linear-gradient';
import WelcomeModal from '../components/WelcomeModal';

// Import services
import { getCurrentUser } from '../services/authService';
import { getUserProfile, fetchParentChildren, fetchUsersBySchool } from '../services/userService';
import { fetchHomework as fetchHomeworkService } from '../services/homeworkService';
import { fetchAssignments as fetchAssignmentsService } from '../services/assignmentService';
import { fetchTodaySchedules, fetchClassIds } from '../services/classService';
import { fetchTodayPTMBookings } from '../services/ptmService';
import { fetchUpcomingLessons } from '../services/lessonService';
import { getDashboardOverview, dailyCheckIn } from '../services/dashboardService';
import { markWelcomeModalAsSeen } from '../services/userService';
import ActionRequiredList from '../components/dashboard/ActionRequiredList';
import DashboardSkeleton, { StatCardSkeleton, SkeletonPiece, MissingAttendanceSkeleton } from '../components/skeletons/DashboardScreenSkeleton';

const SCREEN_WIDTH = Dimensions.get('window').width;

const DashboardScreen = ({ navigation }) => {
    const { theme, isDarkTheme } = useTheme();
    const { schoolId, schoolData } = useSchool();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    const { awardXP } = useGamification();

    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    const [userRole, setUserRole] = useState(profile?.role || '');
    const [userProfile, setUserProfile] = useState(profile || null);
    
    // Granular loading states
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [loadingLessons, setLoadingLessons] = useState(true);
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

    const [actionItems, setActionItems] = useState([]);

    // Modal state for user lists
    const [showUserModal, setShowUserModal] = useState(false);
    const [userListData, setUserListData] = useState([]);
    const [selectedUserCategory, setSelectedUserCategory] = useState('');
    const [showFamilyLinksModal, setShowFamilyLinksModal] = useState(false);

    const handleDailyCheckIn = useCallback(async () => {
        try {
            const user = await getCurrentUser();
            if (!user) return;
            await dailyCheckIn(user.id);
            awardXP('daily_check_in', 5);
        } catch (e) { }
    }, [awardXP]);

    const fetchUpcomingTasksData = useCallback(async (userId, role) => {
        setLoadingTasks(true);
        try {
            let childIds = [];
            if (role === 'parent') {
                childIds = await fetchParentChildren(userId);
            }

            const [hwData, assignData] = await Promise.all([
                fetchHomeworkService({ userId, userRole: role, schoolId, childIds }),
                fetchAssignmentsService({ userId, userRole: role, schoolId, childIds })
            ]);

            const now = new Date();
            now.setHours(0, 0, 0, 0); // Start of today

            const combined = [
                ...(hwData || []).map(i => ({ ...i, type: 'homework' })),
                ...(assignData || []).map(i => ({ ...i, type: 'assignment' }))
            ]
                .filter(item => new Date(item.due_date) >= now)
                .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                .slice(0, 10);

            setUpcomingTasks(combined);
        } catch (e) {
            console.error('Error fetching upcoming tasks:', e);
        } finally {
            setLoadingTasks(false);
        }
    }, [schoolId]);

    const fetchTodaySessionsData = useCallback(async (userId, role) => {
        setLoadingSessions(true);
        try {
            const [schedules, ptms] = await Promise.all([
                fetchTodaySchedules(schoolId, userId, role),
                fetchTodayPTMBookings(userId, role)
            ]);

            const combined = [
                ...(schedules || []).map(s => ({ ...s, eventType: 'class' })),
                ...(ptms || [])
                    .filter(p => p.slot)
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
        } finally {
            setLoadingSessions(false);
        }
    }, [schoolId]);

    const fetchDashboardLessonsData = useCallback(async (userId, role) => {
        setLoadingLessons(true);
        try {
            if (!userId) return;
            const classIds = await fetchClassIds(userId, role, schoolId);
            if (classIds && classIds.length > 0) {
                const lessons = await fetchUpcomingLessons(classIds);
                setUpcomingLessons(lessons);
            }
        } catch (e) {
            console.error('Error fetching dashboard lessons:', e);
        } finally {
            setLoadingLessons(false);
        }
    }, [schoolId]);

    const fetchDashboardData = useCallback(async (isRefresh = false) => {
        if (!schoolId) return;

        if (!isRefresh) setLoadingOverview(true);
        try {
            const currentUserId = user?.id;
            const currentRole = profile?.role;

            // 1. Fetch Consolidated Overview (Stats + Actions)
            const overview = await getDashboardOverview({ 
                schoolId, 
                userId: currentUserId, 
                role: currentRole 
            });

            if (overview) {
                setStats(overview.stats);
                setActionItems(overview.actionItems);
            }
            setLoadingOverview(false);

            // 2. Fetch Other Sections in Parallel but with their own loaders
            Promise.all([
                fetchUpcomingTasksData(currentUserId, currentRole),
                fetchTodaySessionsData(currentUserId, currentRole),
                fetchDashboardLessonsData(currentUserId, currentRole)
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setLoadingOverview(false);
        }
    }, [schoolId, user?.id, profile?.role, fetchUpcomingTasksData, fetchTodaySessionsData, fetchDashboardLessonsData]);

    const checkUserAccessAndWalkthrough = useCallback(async () => {
        try {
            if (!user) return;
            const userData = profile || await getUserProfile(user.id);
            setUserRole(userData.role);
            setUserProfile(userData);

            if (userData && !userData.has_seen_welcome_modal) {
                setShowWelcomeModal(true);
            }
        } catch (error) {
            console.error('Error checking access:', error);
        }
    }, [user, profile]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            fetchDashboardData(true), 
            checkUserAccessAndWalkthrough()
        ]);
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

    const handleCloseWelcomeModal = async (dontShowAgain) => {
        setShowWelcomeModal(false);
        if (dontShowAgain && userProfile?.id) {
            try {
                await markWelcomeModalAsSeen(userProfile.id);
            } catch (error) {
                console.error('Error marking walkthrough as seen:', error);
            }
        }
    };

    useEffect(() => {
        if (schoolId) {
            fetchDashboardData();
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
                <View style={styles.headerBadge}>
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

                {/* School Banner */}
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

                {/* Action Required List */}
                {['teacher', 'admin'].includes(userRole) && (
                    loadingOverview ? (
                        <MissingAttendanceSkeleton />
                    ) : (
                        actionItems.length > 0 && (
                            <ActionRequiredList
                                actions={actionItems}
                                navigation={navigation}
                            />
                        )
                    )
                )}

                {/* Gamification Hub */}
                <GamificationHub id="dashboard-gamification" />

                {/* Recommended Resources */}
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
                    <ChildProgressSnapshot id="dashboard-parent-child" loading={loadingOverview} />
                )}

                {['admin', 'teacher'].includes(userRole) ? (
                    <QuickActions id="dashboard-quick-actions" navigation={navigation} userRole={userRole} loading={loadingOverview} />
                ) : null}

                {/* Tasks & Events */}
                <View style={styles.row}>
                    <UpcomingTasks
                        id="dashboard-tasks"
                        loading={loadingTasks}
                        upcomingTasks={upcomingTasks}
                        navigation={navigation}
                        style={styles.fullWidth}
                    />
                </View>

                <UpcomingLessons
                    lessons={upcomingLessons}
                    navigation={navigation}
                    role={userRole}
                    loading={loadingLessons}
                />

                <DailyOverview
                    id="dashboard-recent"
                    loading={loadingSessions}
                    todaySessions={todaySessions}
                    navigation={navigation}
                />

                {/* Admin Stats */}
                {userRole === 'admin' && (
                    <View style={styles.statsSection}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>School Statistics</Text>
                        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder, marginTop: -12, marginBottom: 16 }]}>
                            A comprehensive overview of your school's community and reach.
                        </Text>

                        {loadingOverview ? (
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

                        {loadingOverview ? (
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

            <WelcomeModal
                visible={showWelcomeModal}
                onClose={handleCloseWelcomeModal}
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
