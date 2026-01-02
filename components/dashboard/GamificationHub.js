import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useGamification } from '../../context/GamificationContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCoins, faFire, faTrophy, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function GamificationHub() {
    const { theme } = useTheme();
    const { current_xp, current_level, coins, streak, nextBadge, loading } = useGamification();

    // Calculate progress to next level (Assuming 1000 XP per level for now)
    const xpForNextLevel = 1000;
    const progress = Math.min(((current_xp || 0) % xpForNextLevel) / xpForNextLevel, 1);

    if (loading) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Your Stats</Text>
            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>
                TRACK PERFORMANCE METRICS AND ACHIEVEMENTS
            </Text>

            <View style={styles.mainRow}>
                {/* Level & XP */}
                <View style={styles.xpSection}>
                    <View style={styles.levelRow}>
                        <View>
                            <Text style={[styles.levelText, { color: theme.colors.primary }]}>LVL {current_level || 1}</Text>
                            <Text style={[styles.xpText, { color: theme.colors.placeholder }]}>
                                {(current_xp || 0) % xpForNextLevel} / {xpForNextLevel} XP
                            </Text>
                        </View>
                        <Text style={[styles.nextLevelLabel, { color: '#94a3b8' }]}>NEXT LEVEL</Text>
                    </View>

                    <View style={[styles.progressBarBg, { backgroundColor: theme.colors.background }]}>
                        <View
                            style={[
                                styles.progressBarFill,
                                { backgroundColor: theme.colors.primary, width: `${progress * 100}%` }
                            ]}
                        />
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <View style={[styles.iconBox, { backgroundColor: '#f59e0b' + '15' }]}>
                                <FontAwesomeIcon icon={faCoins} color="#f59e0b" size={10} />
                            </View>
                            <View>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>{coins || 0}</Text>
                                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>COINS</Text>
                            </View>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <View style={[styles.iconBox, { backgroundColor: '#ef4444' + '15' }]}>
                                <FontAwesomeIcon icon={faFire} color="#ef4444" size={10} />
                            </View>
                            <View>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>{streak?.current_streak || 0}D</Text>
                                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>STREAK</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Next Badge Card */}
                <View style={[styles.badgeCard, { backgroundColor: theme.colors.primary + '05', borderColor: theme.colors.primary + '20', borderWidth: 1 }]}>
                    <Text style={[styles.badgeGoalLabel, { color: theme.colors.primary }]}>GOAL</Text>
                    {nextBadge ? (
                        <>
                            <View style={[styles.badgeIconContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                <FontAwesomeIcon icon={nextBadge.icon} color={theme.colors.primary} size={20} />
                            </View>
                            <Text style={[styles.badgeName, { color: theme.colors.text }]} numberOfLines={1}>{nextBadge.name.toUpperCase()}</Text>
                            <View style={styles.badgeXpRow}>
                                <Text style={[styles.badgeXpText, { color: theme.colors.primary }]}>
                                    +{nextBadge.min_xp - (current_xp || 0)} XP
                                </Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={[styles.badgeIconContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                <FontAwesomeIcon icon={faTrophy} color="#f59e0b" size={20} />
                            </View>
                            <Text style={[styles.badgeName, { color: theme.colors.text }]}>ELITE</Text>
                            <Text style={[styles.badgeXpText, { color: theme.colors.placeholder }]}>MAX</Text>
                        </>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        borderRadius: 32,
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 9,
        fontWeight: '900',
        marginBottom: 24,
        letterSpacing: 1,
    },
    mainRow: {
        flexDirection: 'row',
        gap: 16,
    },
    xpSection: {
        flex: 1,
    },
    levelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
    levelText: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -1,
    },
    xpText: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 2,
    },
    nextLevelLabel: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    progressBarBg: {
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 5,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
    },
    statBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 16,
        gap: 8,
    },
    iconBox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 7,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '900',
    },
    badgeCard: {
        width: 100,
        borderRadius: 24,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeGoalLabel: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 12,
    },
    badgeIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 9,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    badgeXpRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeXpText: {
        fontSize: 9,
        fontWeight: '900',
    },
});
