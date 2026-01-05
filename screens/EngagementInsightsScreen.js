import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Image, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
    faChartLine, faBullhorn, faBook, faChalkboardTeacher, 
    faSearch, faSort, faSortUp, faSortDown, faSpinner,
    faFilter, faUserTie, faArrowLeft, faShieldAlt, faChevronRight, faTimes, faChevronLeft
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import StandardBottomModal from '../components/StandardBottomModal';

// Import services
import { getTeachersEngagementAudit } from '../services/dashboardService';

const defaultUserImage = require('../assets/user.png');

const AuditStat = React.memo(({ icon, label, count, color, theme }) => {
    return (
        <View style={[styles.auditStatItem, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.auditStatIcon, { backgroundColor: color + '15' }]}>
                <FontAwesomeIcon icon={icon} color={color} size={14} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.auditStatLabel, { color: theme.colors.placeholder }]}>{label.toUpperCase()}</Text>
                <Text style={[styles.auditStatValue, { color: theme.colors.text }]}>{count}</Text>
            </View>
            <View style={[styles.miniProgressBg, { backgroundColor: theme.colors.cardBorder }]}>
                <View style={[styles.miniProgressFill, { backgroundColor: color, width: `${Math.min(count * 10, 100)}%` }]} />
            </View>
        </View>
    );
});

const EngagementInsightsScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { schoolId } = useSchool();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [teachers, setTeachers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });
    
    const [selectedTeacher, setSelectedTeacher] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchEngagementData = useCallback(async () => {
        setLoading(true);
        try {
            const auditData = await getTeachersEngagementAudit(schoolId);
            setTeachers(auditData || []);
        } catch (error) {
            console.error('Error fetching engagement audit:', error);
        } finally {
            setLoading(false);
        }
    }, [schoolId]);

    useEffect(() => {
        if (schoolId) {
            fetchEngagementData();
        }
    }, [schoolId, fetchEngagementData]);

    const handleSort = useCallback((key) => {
        setSortConfig(prev => {
            let direction = 'desc';
            if (prev.key === key && prev.direction === 'desc') {
                direction = 'asc';
            }
            return { key, direction };
        });
    }, []);

    const sortedTeachers = useMemo(() => {
        const filtered = teachers.filter(t => 
            t.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return [...filtered].sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [teachers, searchTerm, sortConfig]);

    const SortIcon = React.memo(({ column }) => {
        if (sortConfig.key !== column) return <FontAwesomeIcon icon={faSort} size={10} color={theme.colors.placeholder} style={{ opacity: 0.3, marginLeft: 4 }} />;
        return <FontAwesomeIcon icon={sortConfig.direction === 'asc' ? faSortUp : faSortDown} size={10} color="#fff" style={{ marginLeft: 4 }} />;
    });

    const handleTeacherPress = useCallback((teacher) => {
        setSelectedTeacher(teacher);
        setIsModalOpen(true);
    }, []);

    const closeIdModal = useCallback(() => setIsModalOpen(false), []);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroContainer}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <View style={styles.breadcrumb}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                                <FontAwesomeIcon icon={faChevronLeft} size={14} color="#fff" />
                                <Text style={styles.breadcrumbText}>Management</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.intelBadge}>
                            <View style={styles.pingDot} />
                            <Text style={styles.intelBadgeText}>ADMINISTRATIVE INTELLIGENCE</Text>
                        </View>
                        <Text style={styles.heroTitle}>Engagement Audit</Text>
                        <Text style={styles.heroDescription}>
                            Monitor digital adoption and activity levels across your teaching staff.
                        </Text>
                    </View>
                    <View style={styles.statusBox}>
                        <View style={styles.statusIconBox}>
                            <FontAwesomeIcon icon={faChartLine} color="#fff" size={24} />
                        </View>
                        <View style={{ marginTop: 8, alignItems: 'center' }}>
                            <Text style={styles.statusLabel}>LIVE STATUS</Text>
                            <Text style={styles.statusValue}>{teachers.length}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faSearch} color={theme.colors.placeholder} size={14} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Search staff members..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                    />
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                        <Text style={[styles.loadingText, { color: theme.colors.placeholder }]}>Calculating staff scores...</Text>
                    </View>
                ) : (
                    <View style={styles.auditList}>
                        <View style={[styles.sortHeader, { backgroundColor: theme.colors.primary }]}>
                            <TouchableOpacity style={styles.colTeacher} onPress={() => handleSort('full_name')}>
                                <Text style={styles.sortHeaderText}>TEACHER</Text>
                                <SortIcon column="full_name" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.colStat} onPress={() => handleSort('total')}>
                                <Text style={styles.sortHeaderText}>ACTIVITY</Text>
                                <SortIcon column="total" />
                            </TouchableOpacity>
                        </View>

                        {sortedTeachers.map((teacher) => (
                            <TouchableOpacity 
                                key={teacher.id} 
                                style={[styles.teacherListItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                                onPress={() => handleTeacherPress(teacher)}
                                activeOpacity={0.7}
                            >
                                <Image 
                                    source={teacher.avatar_url ? { uri: teacher.avatar_url } : defaultUserImage}
                                    style={styles.avatarSmall}
                                />
                                <View style={styles.teacherInfoSmall}>
                                    <Text style={[styles.teacherNameSmall, { color: theme.colors.text }]}>{teacher.full_name}</Text>
                                    <Text style={[styles.teacherEmailSmall, { color: theme.colors.placeholder }]}>{teacher.email}</Text>
                                </View>
                                <View style={styles.listAction}>
                                    <View style={[styles.badgeSmall, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <Text style={[styles.badgeTextSmall, { color: theme.colors.primary }]}>{teacher.total}</Text>
                                    </View>
                                    <FontAwesomeIcon icon={faChevronRight} color={theme.colors.cardBorder} size={12} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            <StandardBottomModal
                visible={isModalOpen}
                onClose={closeIdModal}
                title="Staff Engagement"
                icon={faUserTie}
            >
                {selectedTeacher && (
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Image 
                                source={selectedTeacher.avatar_url ? { uri: selectedTeacher.avatar_url } : defaultUserImage}
                                style={styles.modalAvatar}
                            />
                            <View style={styles.modalInfo}>
                                <Text style={[styles.modalName, { color: theme.colors.text }]}>{selectedTeacher.full_name}</Text>
                                <Text style={[styles.modalEmail, { color: theme.colors.placeholder }]}>{selectedTeacher.email}</Text>
                            </View>
                        </View>

                        <View style={styles.activityStats}>
                            <AuditStat icon={faBullhorn} label="Announcements" count={selectedTeacher.announcements} color="#F43F5E" theme={theme} />
                            <AuditStat icon={faBook} label="Resources" count={selectedTeacher.resources} color="#8B5CF6" theme={theme} />
                            <AuditStat icon={faChalkboardTeacher} label="Active Classes" count={selectedTeacher.classes} color="#10B981" theme={theme} />
                        </View>

                        <View style={[styles.totalScoreBox, { backgroundColor: theme.colors.primary + '05', borderColor: theme.colors.primary + '10', borderWidth: 1 }]}>
                            <Text style={[styles.scoreLabel, { color: theme.colors.placeholder }]}>OVERALL ENGAGEMENT SCORE</Text>
                            <Text style={[styles.scoreValue, { color: theme.colors.primary }]}>{selectedTeacher.total}</Text>
                            <Text style={[styles.scoreStatus, { color: theme.colors.placeholder }]}>
                                {selectedTeacher.total > 10 ? 'Elite Adoption' : selectedTeacher.total > 5 ? 'High Adoption' : 'Developing Adoption'}
                            </Text>
                        </View>
                    </View>
                )}
            </StandardBottomModal>
        </View>
    );
}

export default React.memo(EngagementInsightsScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroContainer: {
        padding: 24,
        paddingTop: 40,
        marginBottom: 0,
        elevation: 0,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    breadcrumb: {
        marginBottom: 16,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    breadcrumbText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    intelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    pingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginRight: 6,
    },
    intelBadgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -1,
    },
    heroDescription: {
        color: '#e0e7ff',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    statusBox: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    statusIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statusValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
    },
    scrollContent: { padding: 20, paddingBottom: 40 },
    searchContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        borderRadius: 16, 
        marginBottom: 24, 
    },
    searchInput: { flex: 1, paddingVertical: 12, marginLeft: 12, fontSize: 14, fontWeight: '600' },
    loadingContainer: { padding: 40, alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 12, fontWeight: '700' },
    auditList: { gap: 10 },
    sortHeader: { flexDirection: 'row', padding: 12, borderRadius: 12, marginBottom: 8 },
    sortHeaderText: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
    colTeacher: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    colStat: { width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
    teacherListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
    },
    avatarSmall: { width: 44, height: 44, borderRadius: 14, marginRight: 12 },
    teacherInfoSmall: { flex: 1 },
    teacherNameSmall: { fontSize: 14, fontWeight: '800' },
    teacherEmailSmall: { fontSize: 10, fontWeight: '600', marginTop: 1 },
    listAction: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    badgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeTextSmall: { fontSize: 12, fontWeight: '900' },
    modalContent: { padding: 4 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    modalAvatar: { width: 64, height: 64, borderRadius: 20, marginRight: 16 },
    modalName: { fontSize: 20, fontWeight: '900' },
    modalEmail: { fontSize: 12, fontWeight: '600' },
    activityStats: { gap: 12, marginBottom: 24 },
    auditStatItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, gap: 12 },
    auditStatIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    auditStatLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    auditStatValue: { fontSize: 14, fontWeight: '900' },
    miniProgressBg: { width: 60, height: 4, borderRadius: 2, overflow: 'hidden' },
    miniProgressFill: { height: '100%', borderRadius: 2 },
    totalScoreBox: { padding: 24, borderRadius: 24, alignItems: 'center' },
    scoreLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
    scoreValue: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
    scoreStatus: { fontSize: 11, fontWeight: '700', fontStyle: 'italic' }
});
