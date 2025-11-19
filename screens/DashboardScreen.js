import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
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
    faClipboardList
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';

export default function DashboardScreen({ navigation }) {
    const { theme } = useTheme();
    const { schoolId } = useSchool();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userRole, setUserRole] = useState(null);

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch user statistics
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('role')
                .eq('school_id', schoolId);

            if (usersError) {
                console.error('Users query error:', usersError);
                throw usersError;
            }

            const userStats = {
                totalUsers: users?.length || 0,
                adminCount: users?.filter(u => u.role === 'admin').length || 0,
                teacherCount: users?.filter(u => u.role === 'teacher').length || 0,
                studentCount: users?.filter(u => u.role === 'student').length || 0,
                parentCount: users?.filter(u => u.role === 'parent').length || 0,
            };

            // Fetch class count
            const { count: classCount, error: classError } = await supabase
                .from('classes')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', schoolId);

            if (classError) {
                console.error('Classes query error:', classError);
            }

            // Fetch announcements count
            const { count: announcementCount, error: announcementError } = await supabase
                .from('announcements')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', schoolId);

            if (announcementError) {
                console.error('Announcements query error:', announcementError);
            }

            // Fetch homework count (may not exist)
            let homeworkCount = 0;
            const { count: hwCount, error: homeworkError } = await supabase
                .from('homework')
                .select('*', { count: 'exact', head: true });

            if (homeworkError) {
                console.error('Homework query error (table may not exist):', homeworkError);
            } else {
                homeworkCount = hwCount || 0;
            }

            // Fetch assignments count (may not exist)
            let assignmentCount = 0;
            const { count: aCount, error: assignmentError } = await supabase
                .from('assignments')
                .select('*', { count: 'exact', head: true });

            if (assignmentError) {
                console.error('Assignments query error (table may not exist):', assignmentError);
            } else {
                assignmentCount = aCount || 0;
            }

            // Fetch polls count
            let polls = [];
            let activePolls = 0;
            const { data: pollsData, error: pollsError } = await supabase
                .from('polls')
                .select('id, end_date')
                .eq('school_id', schoolId);

            if (pollsError) {
                console.error('Polls query error:', pollsError);
            } else {
                polls = pollsData || [];
                const now = new Date();
                activePolls = polls.filter(poll => new Date(poll.end_date) > now).length;
            }

            // Fetch marketplace items count (may not exist)
            let marketCount = 0;
            const { count: mCount, error: marketError } = await supabase
                .from('marketplace_items')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', schoolId);

            if (marketError) {
                console.error('Marketplace query error (table may not exist):', marketError);
            } else {
                marketCount = mCount || 0;
            }

            // Fetch unread notifications count
            let notificationCount = 0;
            const { count: nCount, error: notificationError } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false);

            if (notificationError) {
                console.error('Notifications query error:', notificationError);
            } else {
                notificationCount = nCount || 0;
            }

            setStats({
                ...userStats,
                totalClasses: classCount || 0,
                totalAnnouncements: announcementCount || 0,
                totalHomework: homeworkCount,
                totalAssignments: assignmentCount,
                totalPolls: polls.length,
                activePolls: activePolls,
                totalMarketItems: marketCount,
                unreadNotifications: notificationCount,
            });

            setLoading(false);
            setRefreshing(false);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showToast(`Failed to load dashboard data: ${error.message || 'Unknown error'}`, 'error');
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchDashboardData();
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

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading Dashboard...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
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
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={faUsers}
                        title="Total Users"
                        value={stats.totalUsers}
                        color="#007AFF"
                    />
                    <StatCard
                        icon={faUserTie}
                        title="Admins"
                        value={stats.adminCount}
                        color="#FF3B30"
                    />
                    <StatCard
                        icon={faChalkboardTeacher}
                        title="Teachers"
                        value={stats.teacherCount}
                        color="#34C759"
                    />
                    <StatCard
                        icon={faUserGraduate}
                        title="Students"
                        value={stats.studentCount}
                        color="#5856D6"
                    />
                    <StatCard
                        icon={faChild}
                        title="Parents"
                        value={stats.parentCount}
                        color="#FF9500"
                    />
                </View>
            </View>

            {/* Content & Activity */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Content & Activity</Text>
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={faBookOpen}
                        title="Classes"
                        value={stats.totalClasses}
                        color="#007AFF"
                    />
                    <StatCard
                        icon={faBullhorn}
                        title="Announcements"
                        value={stats.totalAnnouncements}
                        color="#FF3B30"
                    />
                    <StatCard
                        icon={faClipboardList}
                        title="Homework"
                        value={stats.totalHomework}
                        color="#34C759"
                    />
                    <StatCard
                        icon={faClipboardList}
                        title="Assignments"
                        value={stats.totalAssignments}
                        color="#5856D6"
                    />
                    <StatCard
                        icon={faPoll}
                        title="Active Polls"
                        value={`${stats.activePolls}/${stats.totalPolls}`}
                        color="#FF9500"
                    />
                    <StatCard
                        icon={faShoppingCart}
                        title="Market Items"
                        value={stats.totalMarketItems}
                        color="#32ADE6"
                    />
                </View>
            </View>

            {/* Notifications */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notifications</Text>
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={faBell}
                        title="Unread"
                        value={stats.unreadNotifications}
                        color="#FF3B30"
                        onPress={() => navigation.navigate('Notifications')}
                    />
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
                <View style={styles.actionsContainer}>
                    <QuickActionButton
                        icon={faPlus}
                        title="Create Announcement"
                        onPress={() => navigation.navigate('CreateAnnouncement')}
                        color="#007AFF"
                    />
                    <QuickActionButton
                        icon={faPlus}
                        title="Create Class"
                        onPress={() => navigation.navigate('CreateClass')}
                        color="#34C759"
                    />
                    <QuickActionButton
                        icon={faUsers}
                        title="Manage Users"
                        onPress={() => navigation.navigate('UserManagement')}
                        color="#5856D6"
                    />
                    <QuickActionButton
                        icon={faChalkboardTeacher}
                        title="School Data"
                        onPress={() => navigation.navigate('SchoolData')}
                        color="#FF9500"
                    />
                </View>
            </View>
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
