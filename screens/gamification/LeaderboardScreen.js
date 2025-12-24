import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrophy, faMedal } from '@fortawesome/free-solid-svg-icons';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES, NAME_COLOR_STYLES, TITLE_STYLES } from '../../constants/GamificationStyles';
import LeaderboardSkeleton from '../../components/skeletons/LeaderboardSkeleton';

const defaultUserImage = require('../../assets/user.png');

export default function LeaderboardScreen() {
    const { theme } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            // 1. Get top scores
            const { data: scores, error: scoresError } = await supabase
                .from('user_gamification')
                .select('user_id, current_xp, current_level')
                .order('current_xp', { ascending: false })
                .limit(50);

            if (scoresError) throw scoresError;

            if (scores && scores.length > 0) {
                const userIds = scores.map(s => s.user_id);

                // 2. Get user details
                const { data: userDetails } = await supabase
                    .from('users')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds);

                // 3. Get equipped items for all users
                const { data: inventoryData } = await supabase
                    .from('user_inventory')
                    .select('user_id, shop_items(*)')
                    .in('user_id', userIds)
                    .eq('is_equipped', true);

                // Helper to resolve shop_items
                const resolveItem = (item) => Array.isArray(item) ? item[0] : item;

                // 4. Merge data
                const leaderboardData = scores.map(score => {
                    const user = userDetails?.find(u => u.id === score.user_id);
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
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderUser = ({ item, index }) => {
        const nameColorStyle = item.equippedNameColor ? NAME_COLOR_STYLES[item.equippedNameColor.image_url] : null;
        const titleStyle = item.equippedTitle ? TITLE_STYLES[item.equippedTitle.image_url] : null;

        return (
            <View style={[styles.userCard, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.cardBorder }]}>
                <View style={styles.rankContainer}>
                    {index === 0 && <FontAwesomeIcon icon={faTrophy} size={18} color="#FFD700" />}
                    {index === 1 && <FontAwesomeIcon icon={faMedal} size={18} color="#C0C0C0" />}
                    {index === 2 && <FontAwesomeIcon icon={faMedal} size={18} color="#CD7F32" />}
                    {index > 2 && <Text style={[styles.rankText, { color: theme.colors.placeholder }]}>{index + 1}</Text>}
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
                    <Text style={[styles.pointsText, { color: theme.colors.primary }]}>{item.current_xp} XP</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Global Leaderboard</Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.placeholder }]}>The top students in your community</Text>
            </View>

            {loading ? (
                <LeaderboardSkeleton />
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUser}
                    keyExtractor={item => item.user_id}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 24, paddingTop: 20 },
    headerTitle: { fontSize: 24, fontWeight: '900' },
    headerSubtitle: { fontSize: 14, marginTop: 4, fontWeight: '600' },
    listContent: { paddingHorizontal: 16, paddingBottom: 30 },
    userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 10, borderBottomWidth: 1 },
    rankContainer: { width: 30, alignItems: 'center', marginRight: 10 },
    rankText: { fontSize: 14, fontWeight: 'bold' },
    avatarContainer: { marginRight: 12 },
    userInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    userName: { fontSize: 15, fontWeight: 'bold' },
    userLevel: { fontSize: 11, fontWeight: '700' },
    titleTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    titleTagText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
    pointsContainer: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
    pointsText: { fontSize: 13, fontWeight: '900' }
});