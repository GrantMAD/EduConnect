import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
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
import GamificationHub from '../components/dashboard/GamificationHub';
import RecommendedResources from '../components/dashboard/RecommendedResources';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useWalkthrough } from '../context/WalkthroughContext';
import UserListModal from '../components/UserListModal';
import DashboardSkeleton from '../components/skeletons/DashboardScreenSkeleton';
import ChildProgressSnapshot from '../components/ChildProgressSnapshot';
import { useGamification } from '../context/GamificationContext';
import LinearGradient from 'react-native-linear-gradient';
import WalkthroughTarget from '../components/WalkthroughTarget';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function DashboardScreen({ navigation }) {
    const { theme } = useTheme();
    const { schoolId, schoolLogo } = useSchool();
    const { showToast } = useToast();
    const { startWalkthrough } = useWalkthrough();
    const { awardXP } = useGamification();

    const [userRole, setUserRole] = useState('');
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [upcomingTasks, setUpcomingTasks] = useState([]);
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

    useEffect(() => {
        if (schoolId) {
            fetchDashboardData();
        } else {
            setLoading(false);
        }
        checkUserAccessAndWalkthrough();
        handleDailyCheckIn();
    }, [schoolId]);

    const handleDailyCheckIn = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const today = new Date().toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('daily_check_ins')
                .upsert({
                    user_id: user.id,
                    check_in_date: today,
                    xp_awarded: true
                }, { onConflict: 'user_id, check_in_date', ignoreDuplicates: true })
                .select();

            if (!error && data && data.length > 0) {
                awardXP('daily_check_in', 5);
            }
        } catch (e) {}
    };

    const fetchDashboardData = async () => {
        if (!schoolId) return;

        setLoading(true);
        try {
            // 1. Fetch Stats
            const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats', { target_school_id: schoolId });
            if (statsError) throw statsError;

            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
            
            let linkCount = 0;
            if (profile?.role === 'admin') {
                const { count } = await supabase
                    .from('parent_child_relationships')
                    .select('*, parent:users!parent_id!inner(school_id)', { count: 'exact', head: true })
                    .eq('parent.school_id', schoolId);
                linkCount = count || 0;
            }

            const { count: clubs } = await supabase
                .from('classes')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', schoolId)
                .eq('subject', 'Extracurricular');

            if (statsData) {
                setStats({
                    totalUsers: statsData.totalUsers || 0,
                    adminCount: statsData.adminCount || 0,
                    teacherCount: statsData.teacherCount || 0,
                    studentCount: statsData.studentCount || 0,
                    parentCount: statsData.parentCount || 0,
                    classCount: (statsData.classCount || 0) - (clubs || 0),
                    clubCount: clubs || 0,
                    assignmentCount: statsData.assignmentCount || 0,
                    pollCount: statsData.pollCount || 0,
                    parentChildLinkCount: linkCount
                });
            }

            // 2. Fetch Data
            await Promise.all([
                fetchUpcomingTasks(user.id, profile?.role),
                fetchTodaySessions(user.id, profile?.role)
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUpcomingTasks = async (userId, role) => {
        try {
            let homeworkQuery = supabase.from('homework').select('*');
            let assignmentQuery = supabase.from('assignments').select('*');

            if (role === 'student' || role === 'parent') {
                let targetIds = [userId];
                if (role === 'parent') {
                    const { data: rels } = await supabase.from('parent_child_relationships').select('child_id').eq('parent_id', userId);
                    targetIds = rels?.map(r => r.child_id) || [];
                }

                if (targetIds.length > 0) {
                    const { data: members } = await supabase.from('class_members').select('class_id').in('user_id', targetIds);
                    const classIds = members?.map(m => m.class_id) || [];
                    if (classIds.length > 0) {
                        homeworkQuery = homeworkQuery.in('class_id', classIds);
                        assignmentQuery = assignmentQuery.in('class_id', classIds);
                    } else {
                        setUpcomingTasks([]);
                        return;
                    }
                } else {
                    setUpcomingTasks([]);
                    return;
                }
            } else {
                homeworkQuery = homeworkQuery.eq('school_id', schoolId);
                if (role === 'teacher') {
                    assignmentQuery = assignmentQuery.eq('assigned_by', userId);
                }
            }

            const [hw, assign] = await Promise.all([
                homeworkQuery.order('due_date', { ascending: true }).limit(5),
                assignmentQuery.order('due_date', { ascending: true }).limit(5)
            ]);

            const combined = [
                ...(hw.data || []).map(i => ({ ...i, type: 'homework' })),
                ...(assign.data || []).map(i => ({ ...i, type: 'assignment' }))
            ].sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5);

            setUpcomingTasks(combined);
        } catch (e) {}
    };

    const fetchTodaySessions = async (userId, role) => {
        try {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

            // 1. Fetch Class Schedules
            let scheduleQuery = supabase
                .from('class_schedules')
                .select('*, class:classes(*)')
                .gte('start_time', startOfDay)
                .lte('start_time', endOfDay);

            if (role === 'student' || role === 'parent') {
                let targetIds = [userId];
                if (role === 'parent') {
                    const { data: rels } = await supabase.from('parent_child_relationships').select('child_id').eq('parent_id', userId);
                    targetIds = rels?.map(r => r.child_id) || [];
                }
                const { data: members } = await supabase.from('class_members').select('class_id').in('user_id', targetIds);
                const classIds = members?.map(m => m.class_id) || [];
                if (classIds.length > 0) {
                    scheduleQuery = scheduleQuery.in('class_id', classIds);
                } else {
                    scheduleQuery = null;
                }
            } else if (role === 'teacher') {
                scheduleQuery = scheduleQuery.eq('class.teacher_id', userId);
            }

            // 2. Fetch PTM Bookings
            let ptmQuery = supabase
                .from('ptm_bookings')
                .select('*, slot:ptm_slots(*)')
                .gte('slot.start_time', startOfDay)
                .lte('slot.start_time', endOfDay);

            if (role === 'parent') {
                ptmQuery = ptmQuery.eq('parent_id', userId);
            } else if (role === 'teacher') {
                ptmQuery = ptmQuery.eq('slot.teacher_id', userId);
            } else {
                ptmQuery = null;
            }

            const results = await Promise.all([
                scheduleQuery ? scheduleQuery : Promise.resolve({ data: [] }),
                ptmQuery ? ptmQuery : Promise.resolve({ data: [] })
            ]);

            const schedules = results[0].data || [];
            const ptms = results[1].data || [];

            const combined = [
                ...schedules.map(s => ({ ...s, eventType: 'class' })),
                ...ptms.map(p => ({ 
                    id: p.id, 
                    start_time: p.slot.start_time, 
                    end_time: p.slot.end_time, 
                    title: `Meeting: ${p.notes || 'PTM'}`, 
                    eventType: 'meeting' 
                }))
            ].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

            setTodaySessions(combined);
        } catch (e) {}
    };

    const checkUserAccessAndWalkthrough = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;

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
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchDashboardData(), checkUserAccessAndWalkthrough()]);
        setRefreshing(false);
    };

    const fetchUsersByCategory = async (category) => {
        try {
            let query = supabase
                .from('users')
                .select('id, full_name, email, number, avatar_url, role')
                .eq('school_id', schoolId);

            if (category !== 'total') {
                query = query.eq('role', category);
            }

            const { data, error } = await query.order('full_name', { ascending: true });

            if (error) throw error;

            setUserListData(data || []);
            setSelectedUserCategory(category);
            setShowUserModal(true);
        } catch (error) {
            console.error('Error fetching users:', error);
            showToast('Failed to load user list', 'error');
        }
    };

    if (loading && !refreshing) {
        return <DashboardSkeleton />;
    }

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
            }
        >
            <View style={styles.content}>
                {/* Header */}
                <View id="dashboard-header" style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: theme.colors.text }]}>
                            {getGreeting()},
                        </Text>
                        <Text style={[styles.userName, { color: theme.colors.primary }]}>
                            {userProfile?.full_name?.split(' ')[0] || 'there'}
                        </Text>
                    </View>
                    <View style={[styles.dateBadge, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </View>

                {/* School Logo/Banner */}
                {schoolLogo && (
                    <View style={styles.bannerContainer}>
                        <Image source={{ uri: schoolLogo }} style={styles.bannerImage} resizeMode="cover" />
                    </View>
                )}

                {/* Welcome Card - Modern Gradient */}
                <WalkthroughTarget id="dashboard-welcome">
                     <LinearGradient
                        colors={['#4f46e5', '#4338ca']} 
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.welcomeCard}
                    >
                        {/* Decorative Circle */}
                        <View style={styles.decorativeCircle} />
                        
                        <View style={styles.welcomeContent}>
                            <Text style={styles.welcomeTitle}>Welcome to ClassConnect</Text>
                            <Text style={styles.welcomeSubtitle}>Your school's complete digital companion.</Text>
                        </View>
                    </LinearGradient>
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
                    <ChildProgressSnapshot id="dashboard-parent-child" />
                )}

                {['admin', 'teacher'].includes(userRole) && (
                    <QuickActions id="dashboard-quick-actions" />
                )}

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
                        
                        <View style={styles.statsGrid}>
                            <StatCard 
                                icon={faUsers} 
                                title="Total Users" 
                                value={stats.totalUsers} 
                                color="#007AFF" 
                                onPress={() => fetchUsersByCategory('total')} 
                            />
                            <StatCard 
                                icon={faUserTie} 
                                title="Admins" 
                                value={stats.adminCount} 
                                color="#FF3B30" 
                                onPress={() => fetchUsersByCategory('admin')} 
                            />
                            <StatCard 
                                icon={faChalkboardTeacher} 
                                title="Teachers" 
                                value={stats.teacherCount} 
                                color="#34C759" 
                                onPress={() => fetchUsersByCategory('teacher')} 
                            />
                            <StatCard 
                                icon={faUserGraduate} 
                                title="Students" 
                                value={stats.studentCount} 
                                color="#5856D6" 
                                onPress={() => fetchUsersByCategory('student')} 
                            />
                            <StatCard 
                                icon={faChild} 
                                title="Parents" 
                                value={stats.parentCount} 
                                color="#FF9500" 
                                onPress={() => fetchUsersByCategory('parent')} 
                            />
                            {userRole === 'admin' && (
                                <StatCard 
                                    icon={faUserFriends} 
                                    title="Family Links" 
                                    value={stats.parentChildLinkCount} 
                                    color="#AF52DE" 
                                    onPress={() => navigation.navigate('My Children')} 
                                />
                            )}
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Content & Activity</Text>
                        <View style={styles.statsGrid}>
                            <StatCard 
                                icon={faBookOpen} 
                                title="Classes" 
                                value={stats.classCount} 
                                color="#007AFF" 
                                onPress={() => navigation.navigate('Classes')} 
                            />
                            <StatCard 
                                icon={faUserFriends} 
                                title="Clubs" 
                                value={stats.clubCount} 
                                color="#FF9500" 
                                onPress={() => navigation.navigate('Clubs')} 
                            />
                            <StatCard 
                                icon={faClipboardList} 
                                title="Assignments" 
                                value={stats.assignmentCount} 
                                color="#5856D6" 
                                onPress={() => navigation.navigate('Homework')} 
                            />
                            <StatCard 
                                icon={faPoll} 
                                title="Active Polls" 
                                value={stats.pollCount} 
                                color="#FF9500" 
                                onPress={() => navigation.navigate('Polls')} 
                            />
                        </View>
                    </View>
                )}
            </View>

            <UserListModal
                visible={showUserModal}
                onClose={() => setShowUserModal(false)}
                users={userListData}
                category={selectedUserCategory}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    greeting: { fontSize: 16, fontWeight: '600' },
    userName: { fontSize: 24, fontWeight: '900' },
    dateBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    dateText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
    bannerContainer: { width: '100%', height: 120, borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
    bannerImage: { width: '100%', height: '100%' },
    welcomeCard: { 
        padding: 24, 
        borderRadius: 20, 
        marginBottom: 20, 
        overflow: 'hidden',
        position: 'relative',
        elevation: 0 // Explicitly 0
    },
    decorativeCircle: {
        position: 'absolute',
        right: -30,
        bottom: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    welcomeTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 4, zIndex: 1 },
    welcomeSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', zIndex: 1 },
    row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    fullWidth: { flex: 1 },
    statsSection: { marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});