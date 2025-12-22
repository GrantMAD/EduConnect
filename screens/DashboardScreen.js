import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faUsers,
    faChalkboardTeacher,
    faBullhorn,
    faBookOpen,
    faPoll,
    faShoppingCart,
    faBell,
    faUserGraduate,
    faUserTie,
    faChild,
    faPlus,
    faChartLine,
    faFire,
    faCoins,
    faChevronRight,
    faInfoCircle,
    faClipboardList,
    faComments
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
import DashboardScreenSkeleton, { StatCardSkeleton, ActionButtonSkeleton, SkeletonPiece } from '../components/skeletons/DashboardScreenSkeleton';
import RecentActivity from '../components/RecentActivity';
import ChildProgressSnapshot from '../components/ChildProgressSnapshot';

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

    const [stats, setStats] = useState({
        totalUsers: 0,
        adminCount: 0,
        teacherCount: 0,
        studentCount: 0,
        parentCount: 0,
        totalClasses: 0,
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
        } catch (error) {
            console.error('Error checking access:', error);
            showToast('Failed to verify access.', 'error');
            navigation.goBack();
        }
    };

    const fetchDashboardData = async (profile) => {
        try {
            if (!schoolId) {
                return;
            }

            // Use the corrected RPC function for all stats
            const { data, error } = await supabase.rpc('get_dashboard_stats', { target_school_id: schoolId });

            if (error) {
                console.error('Error fetching dashboard stats via RPC:', error);
                throw error;
            }

            if (data) {
                // The RPC returns an object within an array, so we take the first element
                const statsData = Array.isArray(data) ? data[0] : data || {};
                 const { data: { user } } = await supabase.auth.getUser();

                 const { count: unreadNotifications } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false);

                const { count: totalAnnouncements } = await supabase
                    .from('announcements')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', schoolId);

                const { count: totalHomework } = await supabase
                    .from('homework')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', schoolId);
                
                const { count: totalMarketItems } = await supabase
                    .from('marketplace_items')
                    .select('*', { count: 'exact', head: true })
                    .eq('school_id', schoolId);

                // Set all stats at once from the RPC data
                setStats({
                    totalUsers: statsData.totalUsers || 0,
                    adminCount: statsData.adminCount || 0,
                    teacherCount: statsData.teacherCount || 0,
                    studentCount: statsData.studentCount || 0,
                    parentCount: statsData.parentCount || 0,
                    totalClasses: statsData.classCount || 0,
                    totalAssignments: statsData.assignmentCount || 0,
                    activePolls: statsData.pollCount || 0, // RPC returns all polls, might need adjustment if only active are desired
                    // The following stats are not in the RPC, default to 0 or fetch separately if needed
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

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData(userProfile);
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

    const fetchClasses = async () => {
        try {
            const { data, error } = await supabase
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
                .order('name', { ascending: true });

            if (error) throw error;

            // Keep the structure with schedules array
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

    const StatCard = ({ icon, title, value, color, onPress }) => (
        <TouchableOpacity
            style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <FontAwesomeIcon icon={icon} size={24} color={color} />
            </View>
            {loading ? (
                <SkeletonPiece style={{ width: 60, height: 28, borderRadius: 4, marginBottom: 4 }} />
            ) : (
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
            )}
            <Text style={[styles.statTitle, { color: theme.colors.placeholder }]}>{title}</Text>
        </TouchableOpacity>
    );

    const QuickActionButton = ({ icon, title, onPress, color }) => (
        <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={onPress}
        >
            <FontAwesomeIcon icon={icon} size={20} color={color || theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>{title}</Text>
        </TouchableOpacity>
    );

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const renderTodaySchedule = () => {
        if (loading) {
            return [1, 2].map((i) => (
                <View key={i} style={[styles.sessionItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                    <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
                </View>
            ));
        }

        if (todaySessions.length === 0) return (
            <View style={[styles.emptyWidget, { backgroundColor: theme.colors.card }]}>
                <FontAwesomeIcon icon={faInfoCircle} size={24} color={theme.colors.placeholder} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No classes scheduled for today.</Text>
            </View>
        );

        return todaySessions.map((session) => {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            const isNow = new Date() >= start && new Date() <= end;

            return (
                <View 
                    key={session.id} 
                    style={[
                        styles.sessionItem, 
                        { backgroundColor: theme.colors.card, borderColor: isNow ? theme.colors.primary : theme.colors.cardBorder }
                    ]}
                >
                    <View style={styles.sessionHeader}>
                        <View>
                            <Text style={[styles.sessionClassName, { color: theme.colors.text }]}>{session.class?.name}</Text>
                            <Text style={[styles.sessionType, { color: theme.colors.placeholder }]}>{session.type || 'Lecture'}</Text>
                        </View>
                        <View style={styles.sessionTimeContainer}>
                            <Text style={[styles.sessionStartTime, { color: theme.colors.primary }]}>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                    </View>
                    {isNow && (
                        <View style={[styles.liveBadge, { backgroundColor: '#FF3B30' }]}>
                            <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                    )}
                </View>
            );
        });
    };

    const renderUpcomingTasks = () => {
        if (loading) {
            return [1, 2].map((i) => (
                <View key={i} style={[styles.taskItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                    <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
                </View>
            ));
        }

        if (upcomingTasks.length === 0) return (
            <View style={[styles.emptyWidget, { backgroundColor: theme.colors.card }]}>
                <FontAwesomeIcon icon={faClipboardList} size={24} color={theme.colors.placeholder} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>All caught up! No tasks due soon.</Text>
            </View>
        );

        return upcomingTasks.map((task) => {
            const dueDate = new Date(task.due_date);
            const isToday = new Date().toDateString() === dueDate.toDateString();

            return (
                <TouchableOpacity 
                    key={`${task.type}-${task.id}`}
                    style={[styles.taskItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                    onPress={() => navigation.navigate(task.type === 'homework' ? 'Homework' : 'Assignments')}
                >
                    <View style={styles.taskIconContainer}>
                         <View style={[styles.taskTypeIcon, { backgroundColor: task.type === 'homework' ? '#007AFF20' : '#5856D620' }]}>
                            <FontAwesomeIcon icon={faClipboardList} size={16} color={task.type === 'homework' ? '#007AFF' : '#5856D6'} />
                         </View>
                    </View>
                    <View style={styles.taskInfo}>
                        <Text style={[styles.taskTitle, { color: theme.colors.text }]} numberOfLines={1}>{task.title || task.subject}</Text>
                        <Text style={[styles.taskSubject, { color: theme.colors.placeholder }]}>{task.subject || task.type}</Text>
                    </View>
                    <View style={styles.taskDueContainer}>
                        <Text style={[styles.taskDueDate, { color: isToday ? '#FF9500' : theme.colors.placeholder }]}>
                            {isToday ? 'Today' : dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                    </View>
                </TouchableOpacity>
            );
        });
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
        >
            <View style={styles.header}>
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
            </View>

            {/* Welcome Banner - Visible to all */}
            <View style={[styles.welcomeBanner, { backgroundColor: theme.colors.primary }]}>
                <View style={styles.welcomeContent}>
                    <Text style={styles.welcomeTitle}>Welcome to EduLink</Text>
                    <Text style={styles.welcomeText}>We're glad to have you here. Explore your school's portal and track your progress.</Text>
                </View>
                {/* Decorative circles or background shapes can be added here with absolute positioning if needed */}
            </View>

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
                <RecentActivity />
                
                {/* Parent: Child Progress Snapshot */}
                {userRole === 'parent' && (
                    <ChildProgressSnapshot />
                )}
            </View>

            <View style={styles.rowWidgets}>
                {/* Today's Schedule */}
                <View style={styles.halfSection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Schedule</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
                            <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.miniDescription, { color: theme.colors.placeholder }]}>View your classes.</Text>
                    {renderTodaySchedule()}
                </View>

                {/* Due Soon */}
                <View style={styles.halfSection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Due Soon</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Homework')}>
                            <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[styles.miniDescription, { color: theme.colors.placeholder }]}>Upcoming tasks.</Text>
                    {renderUpcomingTasks()}
                </View>
            </View>

            {/* Admin/Teacher Stats (Only show if role matches) */}
            {(!userRole && loading) ? (
                <View style={styles.section}>
                    <SkeletonPiece style={{ width: 140, height: 20, borderRadius: 4, marginBottom: 16, marginTop: 16 }} />
                    <View style={styles.statsGrid}>
                        {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
                    </View>
                </View>
            ) : ['admin', 'teacher'].includes(userRole) && (
                <>
                    {/* User Statistics */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>User Statistics</Text>
                        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Overview of all users in your school</Text>
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
                        </View>
                    </View>

                    {/* Content & Activity */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Content & Activity</Text>
                        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Track classes, announcements, and school activities</Text>
                        <View style={styles.statsGrid}>
                            <StatCard
                                icon={faBookOpen}
                                title="Classes"
                                value={stats.totalClasses}
                                color="#007AFF"
                                onPress={() => fetchClasses()}
                            />
                            <StatCard
                                icon={faBullhorn}
                                title="Announcements"
                                value={stats.totalAnnouncements}
                                color="#FF3B30"
                                onPress={() => fetchContentByType('announcements')}
                            />
                            <StatCard
                                icon={faClipboardList}
                                title="Homework"
                                value={stats.totalHomework}
                                color="#34C759"
                                onPress={() => fetchContentByType('homework')}
                            />
                            <StatCard
                                icon={faClipboardList}
                                title="Assignments"
                                value={stats.totalAssignments}
                                color="#5856D6"
                                onPress={() => fetchContentByType('assignments')}
                            />
                            <StatCard
                                icon={faPoll}
                                title="Active Polls"
                                value={stats.activePolls}
                                color="#FF9500"
                                onPress={() => fetchContentByType('polls')}
                            />
                            <StatCard
                                icon={faShoppingCart}
                                title="Marketplace"
                                value={stats.totalMarketItems}
                                color="#FF2D55"
                                onPress={() => fetchContentByType('market')}
                            />
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
                        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Access common tasks and shortcuts.</Text>
                        <View style={styles.actionsContainer}>
                            <QuickActionButton
                                icon={faBullhorn}
                                title="New Announcement"
                                onPress={() => navigation.navigate('CreateAnnouncement', { fromDashboard: true })}
                                color="#FF3B30"
                            />
                            <QuickActionButton
                                icon={faBookOpen}
                                title="New Homework"
                                onPress={() => navigation.navigate('CreateHomework', { fromDashboard: true })}
                                color="#34C759"
                            />
                            <QuickActionButton
                                icon={faClipboardList}
                                title="New Assignment"
                                onPress={() => navigation.navigate('CreateAssignment', { fromDashboard: true })}
                                color="#5856D6"
                            />
                            <QuickActionButton
                                icon={faPoll}
                                title="New Poll"
                                onPress={() => navigation.navigate('CreatePoll', { fromDashboard: true })}
                                color="#FF9500"
                            />
                            <QuickActionButton
                                icon={faShoppingCart}
                                title="List Item"
                                onPress={() => navigation.navigate('CreateMarketplaceItem', { fromDashboard: true })}
                                color="#FF2D55"
                            />
                            <QuickActionButton
                                icon={faChalkboardTeacher}
                                title="New Class"
                                onPress={() => navigation.navigate('CreateClass', { fromDashboard: true })}
                                color="#007AFF"
                            />
                            <QuickActionButton
                                icon={faUsers}
                                title="Manage Users"
                                onPress={() => navigation.navigate('UserManagement', { fromDashboard: true })}
                                color="#5856D6"
                            />
                            <QuickActionButton
                                icon={faChartLine}
                                title="School Data"
                                onPress={() => navigation.navigate('SchoolData', { fromDashboard: true })}
                                color="#FF9500"
                            />
                            <QuickActionButton
                                icon={faComments}
                                title="Messages"
                                onPress={() => navigation.navigate('ChatList')}
                                color="#007AFF"
                            />
                        </View>
                    </View>
                </>
            )}
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
        </ScrollView>
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
    rowWidgets: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    halfSection: {
        width: '48%',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sessionItem: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        position: 'relative',
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sessionClassName: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    sessionType: {
        fontSize: 10,
    },
    sessionStartTime: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    liveBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    taskTypeIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskInfo: {
        flex: 1,
        marginLeft: 8,
    },
    taskTitle: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    taskSubject: {
        fontSize: 10,
    },
    taskDueContainer: {
        alignItems: 'flex-end',
    },
    taskDueDate: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    emptyWidget: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    emptyText: {
        fontSize: 10,
        marginTop: 8,
        textAlign: 'center',
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
    statCard: {
        width: '48%',
        margin: '1%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        minHeight: 120,
        justifyContent: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statTitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    actionButton: {
        width: '48%',
        margin: '1%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
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
    miniDescription: {
        fontSize: 11,
        marginBottom: 12,
        marginTop: -8,
    },
});
