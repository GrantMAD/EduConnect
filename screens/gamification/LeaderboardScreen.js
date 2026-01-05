import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrophy, faMedal, faCrown, faArrowUp, faArrowDown, faMinus, faArrowLeft, faInfoCircle, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useSchool } from '../../context/SchoolContext';
import { useChat } from '../../context/ChatContext';
import { BORDER_STYLES, NAME_COLOR_STYLES, TITLE_STYLES } from '../../constants/GamificationStyles';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import UserProfileModal from '../../components/UserProfileModal';
import LeaderboardSkeleton from '../../components/skeletons/LeaderboardSkeleton';
import { SkeletonPiece } from '../../components/skeletons/DashboardScreenSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { fetchSchoolGamification, fetchUsersEquippedItems } from '../../services/gamificationService';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, fetchUsersBySchool } from '../../services/userService';

const defaultUserImage = require('../../assets/user.png');

const LeaderboardScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { schoolId } = useSchool();
    const { createChannel } = useChat();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const fetchLeaderboard = useCallback(async () => {
        if (!schoolId) return;
        setLoading(true);
        try {
            const schoolUsers = await fetchUsersBySchool(schoolId);

            if (!schoolUsers || schoolUsers.length === 0) {
                setUsers([]);
                setLoading(false);
                return;
            }

            const schoolUserIds = schoolUsers.map(u => u.id);

            const scores = await fetchSchoolGamification(schoolUserIds);

            if (scores && scores.length > 0) {
                const topScorerIds = scores.map(s => s.user_id);

                const inventoryData = await fetchUsersEquippedItems(topScorerIds);

                const resolveItem = (item) => Array.isArray(item) ? item[0] : item;

                const leaderboardData = scores.map(score => {
                    const user = schoolUsers.find(u => u.id === score.user_id);
                    const userEquipped = inventoryData?.filter(i => i.user_id === score.user_id).map(i => resolveItem(i.shop_items)) || [];

                    const equippedBorder = userEquipped.find(i => i?.category === 'avatar_border' || i?.category === 'border' || !i?.category);
                    const equippedNameColor = userEquipped.find(i => i?.category === 'name_color');
                    const equippedTitle = userEquipped.find(i => i?.category === 'title');

                    return {
                        ...score,
                        user: user || { full_name: 'Unknown User' },
                        equippedBorder,
                        equippedNameColor,
                        equippedTitle
                    };
                });

                setUsers(leaderboardData);
            } else {
                setUsers([]);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    }, [schoolId]);

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
                        avatarSource={item.user.avatar_url ? { uri: item.user.avatar_url } : defaultUserImage}
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
                    <Text style={[styles.pointsText, { color: theme.colors.primary }]}>{item.current_xp.toLocaleString()}</Text>
                    <Text style={styles.pointsLabel}>XP</Text>
                </View>
            </TouchableOpacity>
        );
    }, [theme, handleUserPress]);

    const topScore = useMemo(() => users[0]?.current_xp.toLocaleString() || '0', [users]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#f59e0b', '#ea580c']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroContainer}
            >
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <FontAwesomeIcon icon={faArrowLeft} size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <Text style={styles.heroTitle}>School Leaderboard</Text>
                        <Text style={styles.heroDescription}>
                            Celebrate the top performers in your school community.
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
                />
            )}

            <UserProfileModal
                visible={isModalVisible}
                user={selectedUser}
                onClose={() => setIsModalVisible(false)}
                onMessageUser={handleMessageUser}
            />
        </View>
    );
}

export default React.memo(LeaderboardScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroContainer: {
        padding: 20,
        marginBottom: 16,
        elevation: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
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
    heroTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 6,
    },
    heroDescription: {
        color: '#fef3c7',
        fontSize: 14,
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
    pointsLabel: { fontSize: 8, fontWeight: 'bold', color: 'rgba(99, 102, 241, 0.6)', marginTop: -2 }
});
