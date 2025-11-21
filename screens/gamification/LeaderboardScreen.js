import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrophy, faMedal, faCrown, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { BORDER_STYLES } from '../../constants/GamificationStyles';

export default function LeaderboardScreen({ navigation }) {
    const { theme } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all_time'); // 'all_time', 'weekly' (weekly requires more complex SQL, sticking to all_time for MVP)

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            // 1. Get top 50 scores
            const { data: scores, error: scoresError } = await supabase
                .from('user_gamification')
                .select('user_id, current_xp, current_level')
                .order('current_xp', { ascending: false })
                .limit(50);

            if (scoresError) throw scoresError;

            if (!scores || scores.length === 0) {
                setUsers([]);
                return;
            }

            // 2. Get user details for these scores
            const userIds = scores.map(s => s.user_id);
            const { data: userDetails, error: usersError } = await supabase
                .from('users')
                .select('id, full_name, avatar_url, user_inventory(shop_items(*), is_equipped)')
                .in('id', userIds);

            if (usersError) throw usersError;

            // 3. Merge data
            const leaderboardData = scores.map(score => {
                const user = userDetails.find(u => u.id === score.user_id);
                const equippedItem = user?.user_inventory?.find(i => i.is_equipped)?.shop_items;

                return {
                    ...score,
                    users: user || { full_name: 'Unknown User', avatar_url: null },
                    equippedItem
                };
            });

            setUsers(leaderboardData);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }) => {
        const user = item.users;
        const rank = index + 1;
        let rankIcon = null;
        let rankColor = theme.colors.text;

        if (rank === 1) {
            rankIcon = faCrown;
            rankColor = '#FFD700'; // Gold
        } else if (rank === 2) {
            rankIcon = faMedal;
            rankColor = '#C0C0C0'; // Silver
        } else if (rank === 3) {
            rankIcon = faMedal;
            rankColor = '#CD7F32'; // Bronze
        }

        return (
            <View style={[styles.itemContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <View style={styles.rankContainer}>
                    {rankIcon ? (
                        <FontAwesomeIcon icon={rankIcon} size={24} color={rankColor} />
                    ) : (
                        <Text style={[styles.rankText, { color: theme.colors.text }]}>{rank}</Text>
                    )}
                </View>

                <Image
                    source={user.avatar_url ? { uri: user.avatar_url } : require('../../assets/user.png')}
                    style={[styles.avatar, item.equippedItem ? BORDER_STYLES[item.equippedItem.image_url] : {}]}
                />

                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.colors.text }]}>{user.full_name || 'Unknown User'}</Text>
                    <Text style={[styles.userLevel, { color: theme.colors.placeholder }]}>Level {item.current_level}</Text>
                </View>

                <View style={styles.xpContainer}>
                    <Text style={[styles.xpText, { color: theme.colors.primary }]}>{item.current_xp} XP</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.contentHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.customBackButton}>
                    <FontAwesomeIcon icon={faArrowLeft} size={16} color={theme.colors.primary} />
                    <Text style={[styles.customBackButtonText, { color: theme.colors.primary }]}>Back to Profile</Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <FontAwesomeIcon icon={faTrophy} size={32} color="#FFD700" />
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Leaderboard</Text>
                </View>
                <Text style={[styles.headerDescription, { color: theme.colors.placeholder }]}>
                    See who's topping the charts this week!
                </Text>
            </View>

            <FlatList
                data={users}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentHeader: {
        padding: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    customBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    customBackButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    headerDescription: {
        fontSize: 16,
        marginLeft: 4,
    },
    listContent: {
        padding: 16,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
        elevation: 1,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginHorizontal: 12,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
    },
    userLevel: {
        fontSize: 14,
    },
    xpContainer: {
        alignItems: 'flex-end',
    },
    xpText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
