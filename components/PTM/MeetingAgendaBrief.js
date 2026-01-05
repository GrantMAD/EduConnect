import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faChartLine,
    faTrophy,
    faGraduationCap,
    faExclamationCircle,
    faClipboardCheck
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

// Import services
import { fetchUserGamification } from '../../services/gamificationService';
import { fetchStudentCompletionCount, fetchStudentMarks } from '../../services/userService';

const MeetingAgendaBrief = React.memo(({ studentId, isTeacher }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        gamification: null,
        completionRate: 0,
        recentMarks: [],
    });

    useEffect(() => {
        if (studentId) {
            fetchStudentBrief();
        }
    }, [studentId]);

    const fetchStudentBrief = async () => {
        setLoading(true);
        try {
            // 1. Fetch Gamification Stats
            const gamification = await fetchUserGamification(studentId);

            // 2. Fetch Completion Rate
            const completedCount = await fetchStudentCompletionCount(studentId);

            // 3. Fetch Recent Marks
            const marks = await fetchStudentMarksSimple(studentId, 3);

            setData({
                gamification,
                completionRate: completedCount || 0,
                recentMarks: marks || [],
            });
        } catch (error) {
            console.error('Error fetching student brief:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.inputBackground }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.placeholder }]}>Generating Brief...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Unified Section Header */}
            <View style={styles.headerRow}>
                <Text style={[styles.headerLabel, { color: '#94a3b8' }]}>
                    {isTeacher ? 'ACADEMIC INSIGHTS' : 'PERFORMANCE BRIEF'}
                </Text>
            </View>

            {/* Top Grid Stats */}
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <View style={styles.statLabelRow}>
                        <View style={[styles.statIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
                            <FontAwesomeIcon icon={faGraduationCap} color={theme.colors.primary} size={10} />
                        </View>
                        <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>TASKS</Text>
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {data.completionRate} <Text style={styles.statUnit}>DONE</Text>
                    </Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <View style={styles.statLabelRow}>
                        <View style={[styles.statIconBox, { backgroundColor: '#f59e0b' + '10' }]}>
                            <FontAwesomeIcon icon={faTrophy} color="#f59e0b" size={10} />
                        </View>
                        <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>RANK</Text>
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        LVL {data.gamification?.current_level || 1}
                    </Text>
                </View>
            </View>

            {/* Performance List */}
            {data.recentMarks.length > 0 && (
                <View style={[styles.marksSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <Text style={[styles.marksTitle, { color: '#94a3b8' }]}>RECENT GRADES</Text>
                    {data.recentMarks.map((mark, i) => (
                        <View key={i} style={[styles.markRow, i !== data.recentMarks.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }]}>
                            <Text style={[styles.markName, { color: theme.colors.text }]} numberOfLines={1}>
                                {mark.assessment_name}
                            </Text>
                            <View style={[styles.markValueBox, { backgroundColor: theme.colors.primary + '10' }]}>
                                <Text style={[styles.markValue, { color: theme.colors.primary }]}>{mark.mark}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            {/* Teacher Only Tip */}
            {isTeacher && (
                <View style={[styles.tipBox, { backgroundColor: theme.colors.primary + '05', borderColor: theme.colors.primary + '10', borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faExclamationCircle} color={theme.colors.primary} size={12} style={{ marginRight: 12 }} />
                    <Text style={[styles.tipText, { color: theme.colors.primary }]}>
                        Review recent grades and XP consistency to guide the meeting.
                    </Text>
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create({
    container: { marginTop: 16 },
    loadingContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
    loadingText: { marginTop: 12, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    headerRow: { marginBottom: 16, paddingHorizontal: 4 },
    headerLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 24,
    },
    statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    statIconBox: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    statLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    statValue: { fontSize: 18, fontWeight: '900' },
    statUnit: { fontSize: 9, fontWeight: '800' },

    marksSection: {
        padding: 20,
        borderRadius: 24,
    },
    marksTitle: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
    markRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12
    },
    markName: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
    markValueBox: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    markValue: { fontSize: 11, fontWeight: '900' },

    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        padding: 16,
        borderRadius: 20,
    },
    tipText: { fontSize: 11, fontWeight: '700', lineHeight: 16, flex: 1 },
    headerLine: { flex: 1, height: 1, opacity: 0.5 },
});

export default MeetingAgendaBrief;
