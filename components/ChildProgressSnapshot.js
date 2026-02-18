import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar, faBookOpen, faTrophy, faChevronRight, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SkeletonPiece } from './skeletons/DashboardScreenSkeleton';
import WalkthroughTarget from './WalkthroughTarget';

// Import services
import { getCurrentUser } from '../services/authService';
import { getUserProfile, fetchParentChildren, fetchUsersByIdsWithPreferences } from '../services/userService';
import { fetchUserGamification, fetchGamificationForUsers } from '../services/gamificationService';
import { fetchUserMemberships, fetchClassMembershipsForUsers } from '../services/classService';
import { fetchUpcomingHomework, fetchUpcomingHomeworkBulk } from '../services/homeworkService';
import { fetchUpcomingAssignments, fetchUpcomingAssignmentsBulk } from '../services/assignmentService';

const ChildProgressSnapshot = React.memo(({ id, loading }) => {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const [childrenData, setChildrenData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchChildrenData();
    }, []);

    const fetchChildrenData = async () => {
        setIsLoading(true);
        try {
            const user = await getCurrentUser();
            if (!user) return;

            // 1. Get linked children
            const childIds = await fetchParentChildren(user.id);

            if (childIds.length === 0) {
                setChildrenData([]);
                setIsLoading(false);
                return;
            }

            // 2. Bulk fetch essential data
            const [profiles, gamificationList, allMemberships] = await Promise.all([
                fetchUsersByIdsWithPreferences(childIds),
                fetchGamificationForUsers(childIds),
                fetchClassMembershipsForUsers(childIds)
            ]);

            // 3. Collect unique class IDs to fetch upcoming tasks
            const allClassIds = [...new Set(allMemberships.map(m => m.class_id))];
            
            const [upcomingHw, upcomingAsgn] = await Promise.all([
                fetchUpcomingHomeworkBulk(allClassIds),
                fetchUpcomingAssignmentsBulk(allClassIds)
            ]);

            // 4. Map data to each child
            const results = childIds.map((childId) => {
                const profile = profiles.find(p => p.id === childId);
                if (!profile) return null;

                const gamification = gamificationList.find(g => g.user_id === childId);
                const childMemberships = allMemberships.filter(m => m.user_id === childId);
                const childClassIds = childMemberships.map(m => m.class_id);

                const childHw = upcomingHw.filter(h => childClassIds.includes(h.class_id));
                const childAsgn = upcomingAsgn.filter(a => childClassIds.includes(a.class_id));

                const upcomingCount = childHw.length + childAsgn.length;
                
                const dates = [
                    ...childHw.map(h => new Date(h.due_date)),
                    ...childAsgn.map(a => new Date(a.due_date))
                ].filter(Boolean);

                let nextDue = null;
                if (dates.length > 0) {
                    nextDue = new Date(Math.min(...dates));
                }

                return {
                    id: childId,
                    name: profile.full_name,
                    avatar: profile.avatar_url,
                    level: gamification?.current_level || 1,
                    xp: gamification?.current_xp || 0,
                    upcomingCount,
                    nextDue
                };
            });

            setChildrenData(results.filter(Boolean));

        } catch (error) {
            console.error('Error fetching child progress:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (loading || isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <SkeletonPiece style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                    <View>
                        <SkeletonPiece style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 6 }} />
                        <SkeletonPiece style={{ width: 60, height: 12, borderRadius: 4 }} />
                    </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <SkeletonPiece style={{ width: '48%', height: 60, borderRadius: 8 }} />
                    <SkeletonPiece style={{ width: '48%', height: 60, borderRadius: 8 }} />
                </View>
            </View>
        );
    }

    if (childrenData.length === 0) return null;

    return (
        <WalkthroughTarget id={id}>
            <View style={{ marginBottom: 32 }}>
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: theme.colors.text }]}>Learning Pulse</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Real-time monitoring for your children.</Text>
                    </View>
                </View>

                {childrenData.map((child) => (
                    <TouchableOpacity
                        key={child.id}
                        style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                        onPress={() => navigation.navigate('MyChildren')}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.cardHeader, { borderBottomColor: theme.colors.cardBorder }]}>
                            <View style={styles.profileInfo}>
                                <Image
                                    source={child.avatar ? { uri: child.avatar } : require('../assets/user.png')}
                                    style={styles.avatar}
                                />
                                <View>
                                    <Text style={[styles.childName, { color: theme.colors.text }]}>{child.name}</Text>
                                    <View style={styles.levelBadge}>
                                        <FontAwesomeIcon icon={faStar} size={10} color="#F59E0B" />
                                        <Text style={styles.levelText}>Lvl {child.level}</Text>
                                    </View>
                                </View>
                            </View>
                            <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.placeholder} />
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={[styles.statBox, { backgroundColor: theme.colors.primary + '10' }]}>
                                <View style={styles.statLabelRow}>
                                    <FontAwesomeIcon icon={faBookOpen} size={10} color={theme.colors.primary} />
                                    <Text style={[styles.statLabel, { color: theme.colors.primary }]}>UPCOMING</Text>
                                </View>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>{child.upcomingCount}</Text>
                                {child.nextDue && (
                                    <Text style={[styles.statSubtext, { color: theme.colors.placeholder }]}>
                                        {child.nextDue.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                                    </Text>
                                )}
                            </View>

                            <View style={[styles.statBox, { backgroundColor: '#f59e0b' + '10' }]}>
                                <View style={styles.statLabelRow}>
                                    <FontAwesomeIcon icon={faTrophy} size={10} color="#D97706" />
                                    <Text style={[styles.statLabel, { color: '#D97706' }]}>EXPERIENCE</Text>
                                </View>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>{child.xp}</Text>
                                <Text style={[styles.statSubtext, { color: theme.colors.placeholder }]}>TOTAL XP</Text>
                            </View>
                        </View>

                        {child.upcomingCount > 0 && child.nextDue && (new Date(child.nextDue) - new Date() < 86400000 * 2) && (
                            <View style={[styles.alertBox, { backgroundColor: '#ef4444' + '10', borderColor: '#ef4444' + '20' }]}>
                                <FontAwesomeIcon icon={faExclamationCircle} size={12} color="#EF4444" />
                                <Text style={[styles.alertText, { color: '#EF4444' }]}>CRITICAL DEADLINE APPROACHING</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </WalkthroughTarget>
    );
});

const styles = StyleSheet.create({
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    card: {
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        marginRight: 12,
        backgroundColor: '#f3f4f6',
    },
    childName: {
        fontSize: 16,
        fontWeight: '900',
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    levelText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#F59E0B',
        marginLeft: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statBox: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -1,
    },
    statSubtext: {
        fontSize: 9,
        fontWeight: '800',
        marginTop: 4,
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 16,
        marginTop: 0,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    alertText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    }
});

export default ChildProgressSnapshot;