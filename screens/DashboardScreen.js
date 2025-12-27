import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, findNodeHandle } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faBullhorn,
    faChartLine,
    faFire,
    faCoins
} from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useChat } from '../context/ChatContext';
import { useGamification } from '../context/GamificationContext';
import UserListModal from '../components/UserListModal';
import UserProfileModal from '../components/UserProfileModal';
import ClassListModal from '../components/ClassListModal';
import ContentListModal from '../components/ContentListModal';
import { SkeletonPiece } from '../components/skeletons/DashboardScreenSkeleton';
import RecentActivity from '../components/RecentActivity';
import ChildProgressSnapshot from '../components/ChildProgressSnapshot';
import { useWalkthrough } from '../context/WalkthroughContext';
import WalkthroughTarget from '../components/WalkthroughTarget';
import DashboardStats from '../components/dashboard/DashboardStats';
import DailyOverview from '../components/dashboard/DailyOverview';
import UpcomingTasks from '../components/dashboard/UpcomingTasks';
import QuickActions from '../components/dashboard/QuickActions';
import StatCard from '../components/dashboard/StatCard';

export default function DashboardScreen({ navigation }) {
    const { theme } = useTheme();
    const { schoolId, schoolData, loadingSchool } = useSchool();
    const { showToast } = useToast();
    const { createChannel, channels, user: currentUser } = useChat();
    const gamification = useGamification();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const insets = useSafeAreaInsets();

    const { startWalkthrough, currentStep, targets, targetRefs, reMeasureTarget, isOpen } = useWalkthrough();
    const scrollViewRef = React.useRef(null);
    const scrollYRef = React.useRef(0);

    const [stats, setStats] = useState({
        totalUsers: 0,
        adminCount: 0,
        teacherCount: 0,
        studentCount: 0,
        parentCount: 0,
        totalClasses: 0,
        totalClubs: 0,
        totalAnnouncements: 0,
        totalHomework: 0,
        totalAssignments: 0,
        totalPolls: 0,
        activePolls: 0,
        totalMarketItems: 0,
        unreadNotifications: 0,
    });

    const [todaySessions, setTodaySessions] = useState([]);
    const [upcomingTasks, setUpcomingTasks] = useState([]);

    // User List Modal State
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUserCategory, setSelectedUserCategory] = useState(null);
    const [userListData, setUserListData] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Content Modals State
    const [showClassModal, setShowClassModal] = useState(false);
    const [showContentModal, setShowContentModal] = useState(false);
    const [contentModalType, setContentModalType] = useState(null);
    const [contentModalData, setContentModalData] = useState([]);

    useEffect(() => {
        checkAccess();
    }, []);

    const checkAccess = async () => {
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
            fetchDashboardData(userData);
            fetchTodayEvents(userData);
            fetchUpcomingTasks(userData);
            fetchTodayEvents(userData);
            fetchUpcomingTasks(userData);

            // Trigger Walkthrough if needed
            if (userData && !userData.has_seen_walkthrough) {
                const baseSteps = [
                    {
                        target: 'dashboard-welcome',
                        title: 'Welcome to EduLink',
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
                        target: 'dashboard-tasks',
                        title: 'Upcoming Tasks',
                        content: 'Stay on top of your homework and assignments here.'
                    });
                }

                // Add recent activity for everyone
                baseSteps.push({
                    target: 'dashboard-recent',
                    title: 'Recent Activity',
                    content: 'Catch up on the latest announcements and messages.'
                });

                // Small delay to ensure layout is measured
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

    const fetchUpcomingTasks = async (profile) => {
        try {
            const isStudent = profile.role === 'student';
            const isParent = profile.role === 'parent';
            const today = new Date().toISOString();

            let childIds = [];
            if (isParent) {
                const { data: rels } = await supabase
                    .from('parent_child_relationships')
                    .select('child_id')
                    .eq('parent_id', profile.id);
                childIds = rels?.map(r => r.child_id) || [];
            }

            const targetUsers = isStudent ? [profile.id] : childIds;

            // Fetch Homework
            let hwQuery = supabase
                .from('homework')
                .select('*, student_completions(student_id)')
                .gte('due_date', today)
                .order('due_date', { ascending: true });

            // Fetch Assignments
            let assignQuery = supabase
                .from('assignments')
                .select('*, student_completions(student_id)')
                .gte('due_date', today)
                .order('due_date', { ascending: true });

            if (isStudent || isParent) {
                const { data: members } = await supabase
                    .from('class_members')
                    .select('class_id')
                    .in('user_id', targetUsers);
                const classIds = members?.map(m => m.class_id) || [];

                if (classIds.length > 0) {
                    hwQuery = hwQuery.in('class_id', classIds);
                    assignQuery = assignQuery.in('class_id', classIds);
                } else {
                    setUpcomingTasks([]);
                    return;
                }
            } else if (profile.school_id) {
                hwQuery = hwQuery.eq('school_id', profile.school_id);
                assignQuery = assignQuery.eq('school_id', profile.school_id);
            }

            const [{ data: homework }, { data: assignments }] = await Promise.all([
                hwQuery,
                assignQuery
            ]);

            let combined = [
                ...(homework?.map(h => ({ ...h, type: 'homework' })) || []),
                ...(assignments?.map(a => ({ ...a, type: 'assignment' })) || [])
            ];

            // Filter out completed tasks for student/parent
            if (isStudent || isParent) {
                combined = combined.filter(task => {
                    const studentCompletions = task.student_completions || [];
                    if (isStudent) {
                        return !studentCompletions.some(c => c.student_id === profile.id);
                    } else {
                        // For parent, show if ANY child hasn't finished it? 
                        // Actually, web logic shows it if NOT ALL children have finished it, 
                        // but here we filter out if the task is completely "Done" for the viewing context.
                        // Let's keep it simple: if it's in the list, it's pending for someone.
                        // Better: if ANY child has NOT completed it, show it.
                        const completedBy = studentCompletions.map(c => c.student_id);
                        return childIds.some(id => !completedBy.includes(id));
                    }
                });
            }

            setUpcomingTasks(combined.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)).slice(0, 5));
        } catch (e) {
            console.error('Error fetching upcoming tasks:', e);
        }
    };

    const fetchTodayEvents = async (profile) => {
        try {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
            const allTodayEvents = [];

            // 1. Fetch Class Sessions
            const { data: classMembers } = await supabase
                .from('class_members')
                .select('class_id')
                .eq('user_id', profile.id);

            let classIds = classMembers?.map(m => m.class_id) || [];

            if (['admin', 'teacher'].includes(profile.role)) {
                const { data: teacherClasses } = await supabase
                    .from('classes')
                    .select('id')
                    .eq('school_id', profile.school_id);
                classIds = [...new Set([...classIds, ...(teacherClasses?.map(c => c.id) || [])])];
            }

            if (classIds.length > 0) {
                const { data: sessions } = await supabase
                    .from('class_schedules')
                    .select('*, class:classes(id, name, subject)')
                    .in('class_id', classIds)
                    .gte('start_time', startOfDay)
                    .lte('start_time', endOfDay)
                    .order('start_time', { ascending: true });

                if (sessions) {
                    allTodayEvents.push(...sessions.map(s => ({ ...s, eventType: 'class' })));
                }
            }

            // 2. Fetch today's PTMs
            const isParent = profile.role === 'parent';
            let ptmQuery = supabase
                .from('ptm_bookings')
                .select(`
                    *,
                    slot:ptm_slots!inner(*, teacher:users!teacher_id(full_name)),
                    parent:users!parent_id(full_name),
                    student:users!student_id(full_name)
                `);

            if (isParent) {
                ptmQuery = ptmQuery.eq('parent_id', profile.id);
            } else {
                ptmQuery = ptmQuery.eq('ptm_slots.teacher_id', profile.id);
            }

            const { data: ptmData } = await ptmQuery;

            if (ptmData) {
                const todayPtms = ptmData.filter(b => {
                    const d = new Date(b.slot.start_time);
                    return d.toDateString() === new Date().toDateString();
                });

                allTodayEvents.push(...todayPtms.map(b => ({
                    id: b.id,
                    start_time: b.slot.start_time,
                    end_time: b.slot.end_time,
                    title: `PTM: ${isParent ? b.slot.teacher.full_name : b.parent.full_name}`,
                    eventType: 'meeting',
                    class: { name: `Meeting: ${b.student.full_name}` }
                })));
            }

            setTodaySessions(allTodayEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
        } catch (e) {
            console.error('Error fetching today events:', e);
        }
    };

    const fetchDashboardData = async (profile) => {
        try {
            const targetSchoolId = profile?.school_id || schoolId;
            if (!targetSchoolId) {
                return;
            }

            // Use the corrected RPC function for all stats
            const { data, error } = await supabase.rpc('get_dashboard_stats', { target_school_id: targetSchoolId });

            if (error) {
                console.error('Error fetching dashboard stats via RPC:', error);
                throw error;
            }

            if (data) {
                // The RPC returns an object within an array, so we take the first element
                const statsData = Array.isArray(data) ? data[0] : data || {};

                const { count: clubCount } = await supabase
                    .from('classes')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', targetSchoolId)
                    .eq('subject', 'Extracurricular');

                const { count: unreadNotifications } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', profile.id)
                    .eq('is_read', false);

                const { count: totalAnnouncements } = await supabase
                    .from('announcements')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', targetSchoolId);

                const { count: totalHomework } = await supabase
                    .from('homework')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', targetSchoolId);

                const { count: totalMarketItems } = await supabase
                    .from('marketplace_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', targetSchoolId);

                // Set all stats at once from the RPC data
                setStats({
                    totalUsers: statsData.totalUsers || 0,
                    adminCount: statsData.adminCount || 0,
                    teacherCount: statsData.teacherCount || 0,
                    studentCount: statsData.studentCount || 0,
                    parentCount: statsData.parentCount || 0,
                    totalClasses: (statsData.classCount || 0) - (clubCount || 0),
                    totalClubs: clubCount || 0,
                    totalAssignments: statsData.assignmentCount || 0,
                    activePolls: statsData.pollCount || 0,
                    totalAnnouncements: totalAnnouncements || 0,
                    totalHomework: totalHomework || 0,
                    totalPolls: statsData.pollCount || 0,
                    totalMarketItems: totalMarketItems || 0,
                    unreadNotifications: unreadNotifications || 0,
                });
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showToast(`Failed to load dashboard data: ${error.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (schoolId && userProfile) {
            fetchDashboardData(userProfile);
        }
    }, [schoolId]);

    // Auto-scroll effect for Walkthrough
    useEffect(() => {
        if (currentStep && currentStep.target && scrollViewRef.current) {
            const targetId = currentStep.target;
            const targetRef = targetRefs[targetId];

            if (targetRef && targetRef.measure) {
                targetRef.measure((x, y, width, height, pageX, pageY) => {
                    const offset = pageY - 150;
                    const currentScroll = scrollYRef.current;
                    const newScroll = Math.max(0, currentScroll + offset);

                    scrollViewRef.current.scrollTo({
                        y: newScroll,
                        animated: true,
                    });

                    // Re-measure after scroll finishes
                    setTimeout(() => {
                        reMeasureTarget(targetId);
                    }, 600);
                });
            }
        }
    }, [currentStep, targetRefs]);

    // Scroll to top when Walkthrough finishes
    useEffect(() => {
        if (!isOpen && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
    }, [isOpen]);


    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchDashboardData(userProfile),
            fetchTodayEvents(userProfile),
            fetchUpcomingTasks(userProfile)
        ]);
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

    const fetchClubs = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            const role = profile?.role;
            let targetUsers = [user.id];

            if (role === 'parent') {
                const { data: rels } = await supabase
                    .from('parent_child_relationships')
                    .select('child_id')
                    .eq('parent_id', user.id);
                targetUsers = rels?.map(r => r.child_id) || [];
            }

            let query = supabase
                .from('classes')
                .select(`
                    id, 
                    name,
                    class_schedules (
                        id,
                        title,
                        description,
                        class_info,
                        start_time,
                        end_time
                    )
                `)
                .eq('school_id', schoolId)
                .eq('subject', 'Extracurricular');

            if (role === 'student' || role === 'parent') {
                if (targetUsers.length > 0) {
                    const { data: memberships } = await supabase
                        .from('class_members')
                        .select('class_id')
                        .in('user_id', targetUsers);
                    const classIds = memberships?.map(m => m.class_id) || [];
                    query = query.in('id', classIds);
                } else {
                    setContentModalData([]);
                    setShowClassModal(true);
                    return;
                }
            }

            const { data, error } = await query.order('name', { ascending: true });

            if (error) throw error;

            const clubsWithSchedules = (data || []).map(cls => ({
                id: cls.id,
                name: cls.name,
                schedules: cls.class_schedules || [],
            }));

            setContentModalData(clubsWithSchedules);
            setShowClassModal(true);
        } catch (error) {
            console.error('Error fetching clubs:', error);
            showToast('Failed to load clubs', 'error');
        }
    };

    const fetchClasses = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            const role = profile?.role;
            let targetUsers = [user.id];

            if (role === 'parent') {
                const { data: rels } = await supabase
                    .from('parent_child_relationships')
                    .select('child_id')
                    .eq('parent_id', user.id);
                targetUsers = rels?.map(r => r.child_id) || [];
            }

            let query = supabase
                .from('classes')
                .select(`
                    id, 
                    name,
                    class_schedules (
                        id,
                        title,
                        description,
                        class_info,
                        start_time,
                        end_time
                    )
                `)
                .eq('school_id', schoolId)
                .neq('subject', 'Extracurricular');

            if (role === 'student' || role === 'parent') {
                if (targetUsers.length > 0) {
                    const { data: memberships } = await supabase
                        .from('class_members')
                        .select('class_id')
                        .in('user_id', targetUsers);
                    const classIds = memberships?.map(m => m.class_id) || [];
                    query = query.in('id', classIds);
                } else {
                    setContentModalData([]);
                    setShowClassModal(true);
                    return;
                }
            }

            const { data, error } = await query.order('name', { ascending: true });

            if (error) throw error;

            const classesWithSchedules = (data || []).map(cls => ({
                id: cls.id,
                name: cls.name,
                schedules: cls.class_schedules || [],
            }));

            setContentModalData(classesWithSchedules);
            setShowClassModal(true);
        } catch (error) {
            console.error('Error fetching classes:', error);
            showToast('Failed to load classes', 'error');
        }
    };

    const fetchContentByType = async (type) => {
        try {
            let query;
            let orderBy = 'created_at';

            switch (type) {
                case 'announcements':
                    query = supabase
                        .from('announcements')
                        .select('id, title, message, type, created_at')
                        .eq('school_id', schoolId);
                    break;
                case 'homework':
                    query = supabase
                        .from('homework')
                        .select('id, subject, description, due_date, created_at');
                    orderBy = 'due_date';
                    break;
                case 'assignments':
                    query = supabase
                        .from('assignments')
                        .select('id, title, description, due_date, created_at');
                    orderBy = 'due_date';
                    break;
                case 'polls':
                    query = supabase
                        .from('polls')
                        .select('id, question, options, target_roles, end_date, created_at')
                        .eq('school_id', schoolId);
                    orderBy = 'end_date';
                    break;
                case 'market':
                    query = supabase
                        .from('marketplace_items')
                        .select('id, title, description, price, created_at, image_url')
                        .eq('school_id', schoolId);
                    break;
                default:
                    return;
            }

            const { data, error } = await query.order(orderBy, { ascending: false });

            if (error) throw error;

            setContentModalData(data || []);
            setContentModalType(type);
            setShowContentModal(true);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            showToast(`Failed to load ${type}`, 'error');
        }
    };

    const handleMessageUser = async (userToMessage) => {
        if (!currentUser) {
            showToast('You must be logged in to message users', 'error');
            return;
        }

        if (userToMessage.id === currentUser.id) {
            showToast('You cannot message yourself', 'error');
            return;
        }

        try {
            // Check if a direct chat already exists
            const existingChannel = channels.find(channel =>
                channel.type === 'direct' &&
                channel.channel_members.some(member => member.user_id === userToMessage.id)
            );

            if (existingChannel) {
                navigation.navigate('ChatRoom', { channelId: existingChannel.id, name: userToMessage.full_name });
            } else {
                // Create new channel
                const newChannel = await createChannel(userToMessage.full_name, 'direct', [userToMessage.id]);
                navigation.navigate('ChatRoom', { channelId: newChannel.id, name: userToMessage.full_name });
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            showToast('Failed to start chat', 'error');
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <ScrollView
            ref={scrollViewRef}
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
            onScroll={(e) => {
                scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
        >
            <View style={styles.header}>
                <WalkthroughTarget id="dashboard-header">
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <FontAwesomeIcon icon={faChartLine} size={24} color={theme.colors.primary} style={{ marginRight: 10 }} />
                            <Text style={[styles.greetingText, { color: theme.colors.text }]}>
                                {getGreeting()}, <Text style={{ color: theme.colors.primary }}>
                                    {loading && !userProfile ? (
                                        <SkeletonPiece style={{ width: 80, height: 24, borderRadius: 4 }} />
                                    ) : (
                                        userProfile?.full_name?.split(' ')[0] || 'there'
                                    )}
                                </Text>
                            </Text>
                        </View>
                        <Text style={[styles.headerDate, { color: theme.colors.placeholder }]}>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                    </View>
                </WalkthroughTarget>
            </View>

            {/* Welcome Banner - Visible to all */}
            <WalkthroughTarget id="dashboard-welcome">
                <View style={[styles.welcomeBanner, { backgroundColor: theme.colors.primary }]}>
                    <View style={styles.welcomeContent}>
                        <Text style={styles.welcomeTitle}>Welcome to EduLink</Text>
                        <Text style={styles.welcomeText}>We're glad to have you here. Explore your school's portal and track your progress.</Text>
                    </View>
                    {/* Decorative circles or background shapes can be added here with absolute positioning if needed */}
                </View>
            </WalkthroughTarget>

            {/* Gamification Hub */}
            <View style={[styles.gamificationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Progress</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Track your experience, level up, and earn rewards.</Text>

                <View style={styles.gamificationTop}>
                    <View>
                        {loading ? (
                            <View>
                                <SkeletonPiece style={{ width: 80, height: 18, borderRadius: 4, marginBottom: 6 }} />
                                <SkeletonPiece style={{ width: 60, height: 12, borderRadius: 4 }} />
                            </View>
                        ) : (
                            <>
                                <Text style={[styles.levelText, { color: theme.colors.primary }]}>Level {gamification?.current_level}</Text>
                                <Text style={[styles.xpText, { color: theme.colors.placeholder }]}>
                                    {gamification?.current_xp % 1000} / 1000 XP
                                </Text>
                            </>
                        )}
                    </View>
                    <View style={styles.streakBadge}>
                        <FontAwesomeIcon icon={faFire} color="#FF9500" size={16} />
                        {loading ? (
                            <SkeletonPiece style={{ width: 20, height: 16, borderRadius: 4, marginLeft: 4 }} />
                        ) : (
                            <Text style={styles.streakText}>{gamification?.streak?.current_streak || 0}</Text>
                        )}
                    </View>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: theme.colors.background }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                backgroundColor: theme.colors.primary,
                                width: loading ? '0%' : `${(gamification?.current_xp % 1000) / 10}%`
                            }
                        ]}
                    />
                </View>
                <View style={styles.gamificationBottom}>
                    <View style={styles.coinContainer}>
                        <FontAwesomeIcon icon={faCoins} color="#FFD700" size={16} />
                        {loading ? (
                            <SkeletonPiece style={{ width: 40, height: 16, borderRadius: 4, marginLeft: 6 }} />
                        ) : (
                            <Text style={[styles.coinText, { color: theme.colors.text }]}>{gamification?.coins}</Text>
                        )}
                    </View>
                    {loading ? (
                        <SkeletonPiece style={{ width: 90, height: 16, borderRadius: 4 }} />
                    ) : (
                        gamification?.nextBadge && (
                            <View style={styles.nextBadgeContainer}>
                                <Text style={[styles.nextBadgeLabel, { color: theme.colors.placeholder }]}>Next: </Text>
                                <Text style={[styles.nextBadgeName, { color: theme.colors.text }]}>{gamification.nextBadge.name}</Text>
                            </View>
                        )
                    )}
                </View>
            </View>

            {/* Recent Activity & Role Specific Widgets */}
            <View style={styles.section}>
                <WalkthroughTarget id="dashboard-recent">
                    <RecentActivity />
                </WalkthroughTarget>

                {/* Parent: Child Progress Snapshot */}
                {/* Show Classes and Announcements for Everyone */}
                {(userRole === 'student' || userRole === 'parent') && (
                    <View style={[styles.statsGrid, { marginTop: -10, marginBottom: 24 }]}>
                        <StatCard
                            icon={faBullhorn}
                            title="Announcements"
                            value={stats.totalAnnouncements}
                            onPress={() => fetchContentByType('announcements')}
                            color="#FF9500"
                            style={{ width: '100%' }}
                        />
                    </View>
                )}

                {userRole === 'admin' && (
                    <ChildProgressSnapshot />
                )}
            </View>

            <DailyOverview 
                loading={loading}
                todaySessions={todaySessions}
                navigation={navigation}
            />

            <UpcomingTasks
                loading={loading}
                upcomingTasks={upcomingTasks}
                navigation={navigation}
            />

            <DashboardStats
                loading={loading}
                userRole={userRole}
                stats={stats}
                fetchUsersByCategory={fetchUsersByCategory}
                fetchClasses={fetchClasses}
                fetchClubs={fetchClubs}
                fetchContentByType={fetchContentByType}
            />

            <QuickActions
                navigation={navigation}
                userRole={userRole}
            />
            <UserListModal
                visible={showUserModal}
                users={userListData}
                category={selectedUserCategory}
                onClose={() => setShowUserModal(false)}
                onUserPress={(user) => {
                    setSelectedUser(user);
                    setShowProfileModal(true);
                }}
            />

            <UserProfileModal
                visible={showProfileModal}
                user={selectedUser}
                onClose={() => setShowProfileModal(false)}
                onMessageUser={handleMessageUser}
            />

            {/* Class List Modal */}
            <ClassListModal
                visible={showClassModal}
                classes={contentModalData}
                onClose={() => setShowClassModal(false)}
            />

            {/* Content List Modal */}
            <ContentListModal
                visible={showContentModal}
                items={contentModalData}
                type={contentModalType}
                onClose={() => setShowContentModal(false)}
            />
        </ScrollView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    greetingText: {
        fontSize: 24,
        fontWeight: '800',
    },
    headerDate: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    },
    schoolImageContainer: {
        width: '100%',
        height: 150,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 24,
    },
    schoolImage: {
        width: '100%',
        height: '100%',
    },
    schoolPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    schoolPlaceholderText: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: 'bold',
        opacity: 0.6,
    },
    gamificationCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    gamificationTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    xpText: {
        fontSize: 12,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF950020',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    streakText: {
        marginLeft: 4,
        fontWeight: 'bold',
        color: '#FF9500',
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        width: '100%',
        marginBottom: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    gamificationBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    coinContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    coinText: {
        marginLeft: 6,
        fontWeight: 'bold',
    },
    nextBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextBadgeLabel: {
        fontSize: 11,
    },
    nextBadgeName: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionDescription: {
        fontSize: 14,
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    welcomeBanner: {
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        overflow: 'hidden',
        position: 'relative',
    },
    welcomeTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    welcomeText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        lineHeight: 20,
    },
});
