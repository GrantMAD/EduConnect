import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStar, faBookOpen, faTrophy, faChevronRight, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { SkeletonPiece } from './skeletons/DashboardScreenSkeleton';

export default function ChildProgressSnapshot() {
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
                 <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                    <SkeletonPiece style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                    <View>
                        <SkeletonPiece style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 6 }} />
                        <SkeletonPiece style={{ width: 60, height: 12, borderRadius: 4 }} />
                    </View>
                 </View>
                 <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <SkeletonPiece style={{ width: '48%', height: 60, borderRadius: 8 }} />
                    <SkeletonPiece style={{ width: '48%', height: 60, borderRadius: 8 }} />
                 </View>
            </View>
        );
    }

    if (childrenData.length === 0) return null;

    return (
        <View>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Children's Progress</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Monitor performance & deadlines.</Text>
                </View>
                {/* Removed Detailed Report link per web instructions */}
            </View>
            
            {childrenData.map((child) => (
                <TouchableOpacity 
                    key={child.id} 
                    style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                    onPress={() => navigation.navigate('MyChildren')}
                >
                    <View style={[styles.cardHeader, { borderBottomColor: theme.colors.border }]}>
                        <View style={styles.profileInfo}>
                            <Image 
                                source={child.avatar ? { uri: child.avatar } : require('../assets/user.png')} 
                                style={[styles.avatar, { borderColor: theme.colors.border }]}
                            />
                            <View>
                                <Text style={[styles.childName, { color: theme.colors.text }]}>{child.name}</Text>
                                <View style={styles.levelBadge}>
                                    <FontAwesomeIcon icon={faStar} size={10} color="#F59E0B" />
                                    <Text style={styles.levelText}>Level {child.level}</Text>
                                </View>
                            </View>
                        </View>
                        <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.placeholder} />
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={[styles.statBox, { backgroundColor: theme.dark ? '#312e8140' : '#e0e7ff' }]}>
                            <View style={styles.statLabelRow}>
                                <FontAwesomeIcon icon={faBookOpen} size={10} color={theme.colors.primary} />
                                <Text style={[styles.statLabel, { color: theme.colors.primary }]}>Upcoming</Text>
                            </View>
                            <Text style={[styles.statValue, { color: theme.colors.text }]}>{child.upcomingCount}</Text>
                            {child.nextDue && (
                                <Text style={[styles.statSubtext, { color: theme.colors.placeholder }]}>
                                    Next: {child.nextDue.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </Text>
                            )}
                        </View>

                        <View style={[styles.statBox, { backgroundColor: theme.dark ? '#78350f40' : '#fef3c7' }]}>
                            <View style={styles.statLabelRow}>
                                <FontAwesomeIcon icon={faTrophy} size={10} color="#D97706" />
                                <Text style={[styles.statLabel, { color: '#D97706' }]}>Total XP</Text>
                            </View>
                            <Text style={[styles.statValue, { color: theme.colors.text }]}>{child.xp}</Text>
                        </View>
                    </View>

                    {child.upcomingCount > 0 && child.nextDue && (new Date(child.nextDue) - new Date() < 86400000 * 2) && (
                        <View style={[styles.alertBox, { backgroundColor: theme.dark ? '#7f1d1d40' : '#fee2e2', borderColor: theme.dark ? '#991b1b' : '#fecaca' }]}>
                            <FontAwesomeIcon icon={faExclamationCircle} size={12} color="#EF4444" />
                            <Text style={[styles.alertText, { color: theme.dark ? '#fca5a5' : '#b91c1c' }]}>Assignment due soon!</Text>
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    card: {
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    profileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        marginRight: 10,
        backgroundColor: '#f3f4f6',
    },
    childName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    levelText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#F59E0B',
        marginLeft: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 12,
        gap: 10,
    },
    statBox: {
        flex: 1,
        borderRadius: 8,
        padding: 10,
    },
    statLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 4,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
    },
    statSubtext: {
        fontSize: 9,
        marginTop: 2,
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 12,
        marginTop: 0,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        gap: 8,
    },
    alertText: {
        fontSize: 11,
        fontWeight: '600',
    }
});
