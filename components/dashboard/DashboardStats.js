import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faUsers,
    faChalkboardTeacher,
    faBullhorn,
    faBookOpen,
    faPoll,
    faShoppingCart,
    faUserGraduate,
    faUserTie,
    faChild,
    faFootballBall,
    faClipboardList
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import StatCard from './StatCard';
import { StatCardSkeleton, SkeletonPiece } from '../skeletons/DashboardScreenSkeleton';
import WalkthroughTarget from '../WalkthroughTarget';

const DashboardStats = ({ 
    loading, 
    userRole, 
    stats, 
    fetchUsersByCategory, 
    fetchClasses, 
    fetchClubs, 
    fetchContentByType 
}) => {
    const { theme } = useTheme();

    if (!userRole && loading) {
        return (
            <View style={styles.section}>
                <SkeletonPiece style={{ width: 140, height: 20, borderRadius: 4, marginBottom: 16, marginTop: 16 }} />
                <View style={styles.statsGrid}>
                    {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
                </View>
            </View>
        );
    }

    if (!['admin', 'teacher'].includes(userRole)) {
        return null;
    }

    return (
        <>
            {/* User Statistics */}
            <View style={styles.section}>
                <WalkthroughTarget id="dashboard-stats">
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Identity Metrics</Text>
                    <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>ACTIVE MEMBERS ACROSS ALL ROLES</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon={faUsers}
                            title="TOTAL USERS"
                            value={stats.totalUsers}
                            color="#4f46e5"
                            onPress={() => fetchUsersByCategory('total')}
                            loading={loading}
                        />
                        <StatCard
                            icon={faUserTie}
                            title="ADMINS"
                            value={stats.adminCount}
                            color="#e11d48"
                            onPress={() => fetchUsersByCategory('admin')}
                            loading={loading}
                        />
                        <StatCard
                            icon={faChalkboardTeacher}
                            title="TEACHERS"
                            value={stats.teacherCount}
                            color="#3b82f6"
                            onPress={() => fetchUsersByCategory('teacher')}
                            loading={loading}
                        />
                        <StatCard
                            icon={faUserGraduate}
                            title="STUDENTS"
                            value={stats.studentCount}
                            color="#10b981"
                            onPress={() => fetchUsersByCategory('student')}
                            loading={loading}
                        />
                        <StatCard
                            icon={faChild}
                            title="PARENTS"
                            value={stats.parentCount}
                            color="#f59e0b"
                            onPress={() => fetchUsersByCategory('parent')}
                            loading={loading}
                        />
                    </View>
                </WalkthroughTarget>
            </View>

            {/* Content & Activity */}
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Platform Activity</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>CURRICULUM & ENGAGEMENT METRICS</Text>
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={faBookOpen}
                        title="CLASSES"
                        value={stats.totalClasses}
                        color="#3b82f6"
                        onPress={() => fetchClasses()}
                        loading={loading}
                    />
                    <StatCard
                        icon={faFootballBall}
                        title="SOCIETIES"
                        value={stats.totalClubs}
                        color="#7c3aed"
                        onPress={() => fetchClubs()}
                        loading={loading}
                    />
                    <StatCard
                        icon={faBullhorn}
                        title="NEWS"
                        value={stats.totalAnnouncements}
                        color="#e11d48"
                        onPress={() => fetchContentByType('announcements')}
                        loading={loading}
                    />
                    <StatCard
                        icon={faClipboardList}
                        title="TASKS"
                        value={stats.totalHomework}
                        color="#10b981"
                        onPress={() => fetchContentByType('homework')}
                        loading={loading}
                    />
                    <StatCard
                        icon={faPoll}
                        title="POLLS"
                        value={stats.activePolls}
                        color="#f59e0b"
                        onPress={() => fetchContentByType('polls')}
                        loading={loading}
                    />
                    <StatCard
                        icon={faShoppingCart}
                        title="MARKET"
                        value={stats.totalMarketItems}
                        color="#db2777"
                        onPress={() => fetchContentByType('market')}
                        loading={loading}
                    />
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    sectionDescription: {
        fontSize: 9,
        fontWeight: '900',
        marginBottom: 20,
        letterSpacing: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
});

export default DashboardStats;
