import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrophy, faMedal, faCrown, faArrowUp, faArrowDown, faMinus, faArrowLeft, faInfoCircle, faChevronRight, faStar, faFire, faPoll, faClipboardCheck, faShareAlt, faFilter, faCalendarAlt, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useSchool } from '../../context/SchoolContext';
import { useChat } from '../../context/ChatContext';
import { getAvatarUrl } from '../../lib/utils';
import { BORDER_STYLES, NAME_COLOR_STYLES, TITLE_STYLES } from '../../constants/GamificationStyles';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import UserProfileModal from '../../components/UserProfileModal';
import LeaderboardSkeleton from '../../components/skeletons/LeaderboardSkeleton';
import { SkeletonPiece } from '../../components/skeletons/DashboardScreenSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { fetchEnhancedLeaderboard, fetchUsersEquippedItems } from '../../services/gamificationService';
import { fetchAllClasses } from '../../services/classService';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, fetchUsersBySchool } from '../../services/userService';

const LeaderboardScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { schoolId } = useSchool();
    const { createChannel } = useChat();
    const insets = useSafeAreaInsets();
    
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Enhanced Controls State
    const [metric, setMetric] = useState('xp'); // 'xp', 'streak', 'polls', 'tasks', 'resources'
    const [timeRange, setTimeRange] = useState('all'); // 'all', 'weekly', 'monthly'
    const [filterType, setFilterType] = useState('school'); // 'school' or 'class'
    const [filterValue, setFilterValue] = useState(null);
    const [classes, setClasses] = useState([]);
    
    // Modal state
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isClassModalVisible, setIsClassModalVisible] = useState(false);

    // Fetch Classes for Filter
    useEffect(() => {
        if (schoolId) {
            fetchAllClasses(schoolId).then(setClasses).catch(console.error);
        }
    }, [schoolId]);

    const fetchLeaderboard = useCallback(async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const leaderboardData = await fetchEnhancedLeaderboard({
                schoolId,
                timeRange,
                metric,
                filterType,
                filterValue
            });
            setUsers(leaderboardData);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [schoolId, metric, timeRange, filterType, filterValue]);

    useEffect(() => {
        if (schoolId) {
            fetchLeaderboard();
        }
    }, [schoolId, fetchLeaderboard]);

    const handleUserPress = useCallback((user) => {
        setSelectedUser(user);
        setIsModalVisible(true);
    }, []);

    const handleMessageUser = useCallback(async (user) => {
        try {
            const channel = await createChannel(user.full_name, 'direct', [user.id]);
            navigation.navigate('Chat', { channelId: channel.id, channelName: user.full_name });
        } catch (error) {
            console.error('Error creating chat channel:', error);
        }
    }, [createChannel, navigation]);

    const getMetricLabel = (m) => {
        switch(m) {
            case 'streak': return 'Days';
            case 'polls': return 'Votes';
            case 'tasks': return 'Tasks';
            case 'resources': return 'Shared';
            default: return 'XP';
        }
    }

    const getMetricUnit = (m) => {
        switch(m) {
            case 'streak': return 'Day Streak';
            case 'polls': return 'Votes';
            case 'tasks': return 'Tasks';
            case 'resources': return 'Resources';
            default: return 'XP';
        }
    }

    const renderMetricSelector = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsScroll} contentContainerStyle={styles.metricsContent}>
            {[
                { id: 'xp', icon: faStar, label: 'XP', color: '#6366f1' },
                { id: 'streak', icon: faFire, label: 'Streak', color: '#f97316' },
                { id: 'polls', icon: faPoll, label: 'Polls', color: '#3b82f6' },
                { id: 'tasks', icon: faClipboardCheck, label: 'Tasks', color: '#10b981' },
                { id: 'resources', icon: faShareAlt, label: 'Resources', color: '#8b5cf6' },
            ].map((item) => (
                <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                        setMetric(item.id);
                        if (item.id === 'streak') setTimeRange('all');
                    }}
                    style={[
                        styles.metricChip,
                        { borderColor: theme.colors.border },
                        metric === item.id && { backgroundColor: item.color + '20', borderColor: item.color }
                    ]}
                >
                    <FontAwesomeIcon 
                        icon={item.icon} 
                        size={12} 
                        color={metric === item.id ? item.color : theme.colors.placeholder} 
                    />
                    <Text style={[
                        styles.metricChipText, 
                        { color: theme.colors.text },
                        metric === item.id && { color: item.color, fontWeight: 'bold' }
                    ]}>
                        {item.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );

    const renderFilters = () => (
        <View style={styles.filterContainer}>
            {metric !== 'streak' ? (
                <View style={[styles.timeRangeContainer, { backgroundColor: theme.colors.card }]}>
                    {['all', 'weekly', 'monthly'].map((range) => (
                        <TouchableOpacity
                            key={range}
                            onPress={() => setTimeRange(range)}
                            style={[
                                styles.timeRangeButton,
                                timeRange === range && { backgroundColor: theme.colors.background, shadowOpacity: 0.1 }
                            ]}
                        >
                            <Text style={[
                                styles.timeRangeText,
                                { color: theme.colors.placeholder },
                                timeRange === range && { color: theme.colors.text, fontWeight: 'bold' }
                            ]}>
                                {range === 'all' ? 'All Time' : range === 'weekly' ? 'Week' : 'Month'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
                onPress={() => setIsClassModalVisible(true)}
                style={[styles.filterButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            >
                <FontAwesomeIcon icon={faFilter} size={12} color={theme.colors.text} />
                <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
                    {filterType === 'school' ? 'School' : classes.find(c => c.id === filterValue)?.name || 'Class'}
                </Text>
                <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.placeholder} />
            </TouchableOpacity>
        </View>
    );

    const renderUser = useCallback(({ item, index }) => {
        const nameColorStyle = item.equippedNameColor ? NAME_COLOR_STYLES[item.equippedNameColor.image_url] : null;
        const titleStyle = item.equippedTitle ? TITLE_STYLES[item.equippedTitle.image_url] : null;
        const isTop3 = index < 3;

        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handleUserPress(item.user)}
                style={[styles.userCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }, isTop3 && { backgroundColor: theme.colors.primary + '05' }]}
            >
                <View style={styles.rankContainer}>
                    <View style={[
                        styles.rankBadge,
                        index === 0 ? { backgroundColor: '#fef3c7' } : 
                        index === 1 ? { backgroundColor: '#f3f4f6' } :
                        index === 2 ? { backgroundColor: '#fff7ed' } :
                        { backgroundColor: 'transparent' }
                    ]}>
                        {index === 0 ? <FontAwesomeIcon icon={faTrophy} size={16} color="#b45309" /> : 
                         index === 1 ? <FontAwesomeIcon icon={faMedal} size={16} color="#374151" /> : 
                         index === 2 ? <FontAwesomeIcon icon={faMedal} size={16} color="#9a3412" /> : 
                         <Text style={[styles.rankText, { color: theme.colors.placeholder }]}>#{index + 1}</Text>}
                    </View>
                </View>

                <View style={styles.avatarContainer}>
                    <AnimatedAvatarBorder
                        avatarSource={getAvatarUrl(item.user.avatar_url, item.user.email, item.user.id)}
                        size={44}
                        borderStyle={item.equippedBorder ? BORDER_STYLES[item.equippedBorder.image_url] : {}}
                    />
                </View>

                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text 
                            style={[styles.userName, nameColorStyle?.style, !nameColorStyle && { color: theme.colors.text }]}
                            numberOfLines={1}
                        >
                            {item.user.full_name}
                        </Text>
                        {titleStyle && (
                            <View style={[styles.titleTag, { backgroundColor: titleStyle.colors.bg }]}>
                                <Text style={[styles.titleTagText, { color: titleStyle.colors.text }]}>{titleStyle.label}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[styles.userLevel, { color: theme.colors.placeholder }]}>Level {item.current_level}</Text>
                </View>

                <View style={styles.pointsContainer}>
                    <Text style={[styles.pointsText, { color: theme.colors.primary }]}>{item.display_score.toLocaleString()}</Text>
                    <Text style={styles.pointsLabel}>{getMetricLabel(metric)}</Text>
                </View>
            </TouchableOpacity>
        );
    }, [theme, handleUserPress, metric]);

    const topScore = useMemo(() => users[0]?.display_score.toLocaleString() || '0', [users]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#f59e0b', '#ea580c']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroContainer}
            >
                {/* Back Button */}
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={[styles.backButtonContainer, { marginBottom: 16, paddingHorizontal: 0 }]}
                >
                    <FontAwesomeIcon icon={faArrowLeft} size={14} color="#fff" />
                    <Text style={[styles.backButtonText, { color: "#fff" }]}>Back to Profile</Text>
                </TouchableOpacity>

                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>
                            {filterType === 'class' ? 'Class Leaderboard' : 'School Leaderboard'}
                        </Text>
                        <Text style={styles.heroDescription}>
                            {timeRange === 'all' ? 'All Time' : timeRange === 'weekly' ? 'This Week' : 'This Month'} • {getMetricUnit(metric)}
                        </Text>
                    </View>
                    <View style={styles.topScoreBadge}>
                        <FontAwesomeIcon icon={faTrophy} size={20} color="#fcd34d" />
                        <View style={{ marginLeft: 8 }}>
                            <Text style={styles.topScoreLabel}>TOP SCORE</Text>
                            <Text style={styles.topScoreValue}>{topScore}</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.controlsSection}>
                {renderMetricSelector()}
                {renderFilters()}
            </View>

            {loading ? (
                <LeaderboardSkeleton />
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={item => item.user_id}
                    contentContainerStyle={styles.listContent}
                    removeClippedSubviews={true}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                                No rankings available for this category yet.
                            </Text>
                        </View>
                    }
                />
            )}

            <UserProfileModal
                visible={isModalVisible}
                user={selectedUser}
                onClose={() => setIsModalVisible(false)}
                onMessageUser={handleMessageUser}
            />

            {/* Class Filter Modal */}
            <Modal
                visible={isClassModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsClassModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Filter by Class</Text>
                            <TouchableOpacity onPress={() => setIsClassModalVisible(false)} style={styles.closeButton}>
                                <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.classScroll}>
                            <TouchableOpacity
                                style={[styles.classItem, filterType === 'school' && { backgroundColor: theme.colors.primary + '10' }]}
                                onPress={() => {
                                    setFilterType('school');
                                    setFilterValue(null);
                                    setIsClassModalVisible(false);
                                }}
                            >
                                <Text style={[styles.classItemText, { color: theme.colors.text }, filterType === 'school' && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                                    School
                                </Text>
                                {filterType === 'school' && <FontAwesomeIcon icon={faClipboardCheck} color={theme.colors.primary} size={16} />}
                            </TouchableOpacity>

                            <Text style={[styles.sectionHeader, { color: theme.colors.placeholder }]}>Classes</Text>
                            
                            {classes.map(cls => (
                                <TouchableOpacity
                                    key={cls.id}
                                    style={[styles.classItem, filterType === 'class' && filterValue === cls.id && { backgroundColor: theme.colors.primary + '10' }]}
                                    onPress={() => {
                                        setFilterType('class');
                                        setFilterValue(cls.id);
                                        setIsClassModalVisible(false);
                                    }}
                                >
                                    <Text style={[styles.classItemText, { color: theme.colors.text }, filterType === 'class' && filterValue === cls.id && { color: theme.colors.primary, fontWeight: 'bold' }]}>
                                        {cls.name}
                                    </Text>
                                    {filterType === 'class' && filterValue === cls.id && <FontAwesomeIcon icon={faClipboardCheck} color={theme.colors.primary} size={16} />}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default React.memo(LeaderboardScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroContainer: {
        padding: 20,
        paddingTop: 40,
        marginBottom: 8,
        elevation: 0,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    backButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 6,
    },
    backButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    heroTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    heroDescription: {
        color: '#fef3c7',
        fontSize: 14,
        fontWeight: '600',
    },
    topScoreBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    topScoreLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 8,
        fontWeight: '900',
    },
    topScoreValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '900',
    },
    controlsSection: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    metricsScroll: {
        marginBottom: 12,
    },
    metricsContent: {
        paddingRight: 16,
        gap: 8,
    },
    metricChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: 'transparent',
        gap: 6,
    },
    metricChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    timeRangeContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 12,
        flex: 1,
    },
    timeRangeButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        borderRadius: 8,
    },
    timeRangeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        minWidth: 120,
        justifyContent: 'space-between'
    },
    filterButtonText: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 30 },
    userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 10 },
    rankContainer: { width: 40, alignItems: 'center', marginRight: 8 },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: { fontSize: 13, fontWeight: '900' },
    avatarContainer: { marginRight: 12 },
    userInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    userName: { fontSize: 15, fontWeight: 'bold' },
    userLevel: { fontSize: 11, fontWeight: '700' },
    titleTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    titleTagText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
    pointsContainer: { 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 10, 
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        alignItems: 'center',
        minWidth: 70
    },
    pointsText: { fontSize: 13, fontWeight: '900' },
    pointsLabel: { fontSize: 8, fontWeight: 'bold', color: 'rgba(99, 102, 241, 0.6)', marginTop: -2 },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    classScroll: {
        marginBottom: 10,
    },
    classItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 4,
    },
    classItemText: {
        fontSize: 15,
        fontWeight: '600',
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 16,
        marginBottom: 8,
        paddingLeft: 12,
    }
});
