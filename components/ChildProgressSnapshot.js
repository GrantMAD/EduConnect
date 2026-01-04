import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar, faBookOpen, faTrophy, faChevronRight, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { SkeletonPiece } from './skeletons/DashboardScreenSkeleton';

const ChildProgressSnapshot = React.memo(() => {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const [childrenData, setChildrenData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChildrenData();
    }, []);

    const fetchChildrenData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get linked children
            let childIds = [];

            const { data: relData } = await supabase
                .from('parent_child_relationships')
                .select('child_id')
                .eq('parent_id', user.id);

            if (relData && relData.length > 0) {
                childIds = relData.map(r => r.child_id);
            } else {
                const { data: linkData } = await supabase
                    .from('parent_student_links')
                    .select('student_id')
                    .eq('parent_id', user.id);

                if (linkData) {
                    childIds = linkData.map(l => l.student_id);
                }
            }

            if (childIds.length === 0) {
                setChildrenData([]);
                setLoading(false);
                return;
            }

            // 2. Fetch data for each child
            const promises = childIds.map(async (childId) => {
                // Profile
                const { data: profile } = await supabase
                    .from('users')
                    .select('id, full_name, avatar_url')
                    .eq('id', childId)
                    .single();

                if (!profile) return null;

                // Gamification Stats
                const { data: gamification } = await supabase
                    .from('user_gamification')
                    .select('current_level, current_xp')
                    .eq('user_id', childId)
                    .maybeSingle();

                // Upcoming Assignments
                const { data: members } = await supabase
                    .from('class_members')
                    .select('class_id')
                    .eq('user_id', childId);

                let upcomingCount = 0;
                let nextDue = null;

                if (members && members.length > 0) {
                    const classIds = members.map(m => m.class_id);
                    const now = new Date().toISOString();

                    const { count: hwCount, data: hwData } = await supabase
                        .from('homework')
                        .select('due_date', { count: 'exact' })
                        .in('class_id', classIds)
                        .gt('due_date', now)
                        .order('due_date', { ascending: true })
                        .limit(1);

                    const { count: asgCount, data: asgData } = await supabase
                        .from('assignments')
                        .select('due_date', { count: 'exact' })
                        .in('class_id', classIds)
                        .gt('due_date', now)
                        .order('due_date', { ascending: true })
                        .limit(1);

                    upcomingCount = (hwCount || 0) + (asgCount || 0);

                    const dates = [
                        hwData?.[0]?.due_date ? new Date(hwData[0].due_date) : null,
                        asgData?.[0]?.due_date ? new Date(asgData[0].due_date) : null
                    ].filter(Boolean);

                    if (dates.length > 0) {
                        nextDue = new Date(Math.min(...dates));
                    }
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

            const results = await Promise.all(promises);
            setChildrenData(results.filter(Boolean));

        } catch (error) {
            console.error('Error fetching child progress:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
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