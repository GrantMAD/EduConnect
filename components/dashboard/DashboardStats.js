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
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>User Statistics</Text>
                    <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Overview of all users in your school</Text>
                    <View style={styles.statsGrid}>
                        <StatCard
                            icon={faUsers}
                            title="Total Users"
                            value={stats.totalUsers}
                            color="#007AFF"
                            onPress={() => fetchUsersByCategory('total')}
                            loading={loading}
                        />
                        <StatCard
                            icon={faUserTie}
                            title="Admins"
                            value={stats.adminCount}
                            color="#FF3B30"
                            onPress={() => fetchUsersByCategory('admin')}
                            loading={loading}
                        />
                        <StatCard
                            icon={faChalkboardTeacher}
                            title="Teachers"
                            value={stats.teacherCount}
                            color="#34C759"
                            onPress={() => fetchUsersByCategory('teacher')}
                            loading={loading}
                        />
                        <StatCard
                            icon={faUserGraduate}
                            title="Students"
                            value={stats.studentCount}
                            color="#5856D6"
                            onPress={() => fetchUsersByCategory('student')}
                            loading={loading}
                        />
                        <StatCard
                            icon={faChild}
                            title="Parents"
                            value={stats.parentCount}
                            color="#FF9500"
                            onPress={() => fetchUsersByCategory('parent')}
                            loading={loading}
                        />
                    </View>
                </WalkthroughTarget>
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
                        loading={loading}
                    />
                    <StatCard
                        icon={faFootballBall}
                        title="Clubs"
                        value={stats.totalClubs}
                        color="#AF52DE"
                        onPress={() => fetchClubs()}
                        loading={loading}
                    />
                    <StatCard
                        icon={faBullhorn}
                        title="Announcements"
                        value={stats.totalAnnouncements}
                        color="#FF3B30"
                        onPress={() => fetchContentByType('announcements')}
                        loading={loading}
                    />
                    <StatCard
                        icon={faClipboardList}
                        title="Homework"
                        value={stats.totalHomework}
                        color="#34C759"
                        onPress={() => fetchContentByType('homework')}
                        loading={loading}
                    />
                    <StatCard
                        icon={faClipboardList}
                        title="Assignments"
                        value={stats.totalAssignments}
                        color="#5856D6"
                        onPress={() => fetchContentByType('assignments')}
                        loading={loading}
                    />
                    <StatCard
                        icon={faPoll}
                        title="Active Polls"
                        value={stats.activePolls}
                        color="#FF9500"
                        onPress={() => fetchContentByType('polls')}
                        loading={loading}
                    />
                    <StatCard
                        icon={faShoppingCart}
                        title="Marketplace"
                        value={stats.totalMarketItems}
                        color="#FF2D55"
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
});

export default DashboardStats;
