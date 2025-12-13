import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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

    faClipboardList,
    faComments
} from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';
import { useChat } from '../context/ChatContext';
import UserListModal from '../components/UserListModal';
import UserProfileModal from '../components/UserProfileModal';
import ClassListModal from '../components/ClassListModal';
import ContentListModal from '../components/ContentListModal';
import { StatCardSkeleton, ActionButtonSkeleton } from '../components/skeletons/DashboardScreenSkeleton';

export default function DashboardScreen({ navigation }) {
    const { theme } = useTheme();
    const { schoolId } = useSchool();
    const { showToast } = useToast();
    const { createChannel, channels, user: currentUser } = useChat();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState(null);
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
                .select('role')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (userData.role !== 'admin' && userData.role !== 'teacher') {
                showToast('Access denied. Dashboard is only available for admins and teachers.', 'error');
                navigation.goBack();
                return;
            }

            setUserRole(userData.role);
            fetchDashboardData();
        } catch (error) {
            console.error('Error checking access:', error);
            showToast('Failed to verify access.', 'error');
            navigation.goBack();
        }
    };

    const fetchDashboardData = async () => {
        try {
            if (!schoolId) {
                showToast('School ID not found. Cannot load data.', 'error');
                setLoading(false);
                setRefreshing(false);
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
                const statsData = data || {};
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

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchDashboardData();
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
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
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



    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
        >
            <View style={styles.header}>
                <FontAwesomeIcon icon={faChartLine} size={32} color={theme.colors.primary} />
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Dashboard</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: theme.colors.placeholder }]}>
                Monitor all aspects of your school
            </Text>

            {/* User Statistics */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>User Statistics</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Overview of all users in your school</Text>
                <View style={styles.statsGrid}>
                    {loading ? (
                        [1, 2, 3, 4, 5].map((item) => <StatCardSkeleton key={item} />)
                    ) : (
                        <>
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
                        </>
                    )}
                </View>
            </View>

            {/* Content & Activity */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Content & Activity</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Track classes, announcements, and school activities</Text>
                <View style={styles.statsGrid}>
                    {loading ? (
                        [1, 2, 3, 4, 5, 6].map((item) => <StatCardSkeleton key={item} />)
                    ) : (
                        <>
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
                        </>
                    )}
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Quickly create and manage school content</Text>
                <View style={styles.actionsContainer}>
                    {loading ? (
                        [1, 2, 3, 4, 5, 6, 7, 8, 9].map((item) => <ActionButtonSkeleton key={item} />)
                    ) : (
                        <>
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
                        </>
                    )}
                </View>
            </View>
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
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    headerSubtitle: {
        fontSize: 16,
        marginBottom: 24,
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
});
