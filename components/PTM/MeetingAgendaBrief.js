import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
    faChartLine, 
    faTrophy, 
    faGraduationCap, 
    faExclamationCircle, 
    faClipboardCheck 
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

export default function MeetingAgendaBrief({ studentId, isTeacher }) {
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
            const { data: gamification } = await supabase
                .from('user_gamification')
                .select('current_xp, current_level')
                .eq('user_id', studentId)
                .maybeSingle();

            // 2. Fetch Completion Rate
            const { count: completedCount } = await supabase
                .from('student_completions')
                .select('*', { count: 'exact', head: true })
                .eq('student_id', studentId);

            // 3. Fetch Recent Marks
            const { data: marks } = await supabase
                .from('student_marks')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })
                .limit(3);

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
                <Text style={[styles.headerLabel, { color: theme.colors.placeholder }]}>
                    {isTeacher ? 'STUDENT BRIEF' : 'PROGRESS SNAPSHOT'}
                </Text>
                <View style={[styles.headerLine, { backgroundColor: theme.colors.border }]} />
            </View>

            {/* Top Grid Stats - Themed backgrounds, no container border */}
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                    <View style={styles.statLabelRow}>
                        <FontAwesomeIcon icon={faGraduationCap} color={theme.colors.primary} size={10} />
                        <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>ACADEMIC</Text>
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {data.completionRate} <Text style={styles.statUnit}>Tasks</Text>
                    </Text>
                </View>

                <View style={[styles.statCard, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                    <View style={styles.statLabelRow}>
                        <FontAwesomeIcon icon={faTrophy} color="#F59E0B" size={10} />
                        <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>LEVEL</Text>
                    </View>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {data.gamification?.current_level || 1} <Text style={[styles.statUnit, { color: '#F59E0B' }]}>{data.gamification?.current_xp?.toLocaleString() || 0} XP</Text>
                    </Text>
                </View>
            </View>

            {/* Performance List - Themed background */}
            {data.recentMarks.length > 0 && (
                <View style={[styles.marksSection, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                    <Text style={[styles.marksTitle, { color: theme.colors.placeholder }]}>RECENT ASSESSMENTS</Text>
                    {data.recentMarks.map((mark, i) => (
                        <View key={i} style={[styles.markRow, i !== data.recentMarks.length - 1 && { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' }]}>
                            <Text style={[styles.markName, { color: theme.colors.text }]} numberOfLines={1}>
                                {mark.assessment_name}
                            </Text>
                            <Text style={[styles.markValue, { color: theme.colors.primary }]}>{mark.mark}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Teacher Only Tip */}
            {isTeacher && (
                <View style={[styles.tipBox, { backgroundColor: 'rgba(6, 182, 212, 0.05)', borderColor: 'rgba(6, 182, 212, 0.1)' }]}>
                    <FontAwesomeIcon icon={faExclamationCircle} color="#0891B2" size={12} style={{ marginRight: 8 }} />
                    <Text style={[styles.tipText, { color: '#0891B2' }]}>
                        Guide discussion based on digital engagement and task consistency.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginTop: 8 },
    loadingContainer: { padding: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
    loadingText: { marginTop: 8, fontSize: 12, fontWeight: '700' },
    
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingHorizontal: 4 },
    headerLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    headerLine: { flex: 1, height: 1, opacity: 0.5 },

    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12
    },
    statCard: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1
    },
    statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    statLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    statValue: { fontSize: 16, fontWeight: '900' },
    statUnit: { fontSize: 9, fontWeight: '700', color: '#9CA3AF' },
    
    marksSection: {
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1
    },
    marksTitle: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
    markRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10
    },
    markName: { fontSize: 12, fontWeight: '600', flex: 1, marginRight: 8 },
    markValue: { fontSize: 12, fontWeight: '900' },

    tipBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginTop: 16, 
        padding: 12, 
        borderRadius: 16, 
        borderWidth: 1 
    },
    tipText: { fontSize: 9, fontWeight: '600', fontStyle: 'italic' }
});