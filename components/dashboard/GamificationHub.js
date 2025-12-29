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
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Your Progress</Text>
            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>
                Track your experience, level up, and earn rewards.
            </Text>
            
            <View style={styles.mainRow}>
                {/* Level & XP */}
                <View style={styles.xpSection}>
                    <View style={styles.levelRow}>
                        <View>
                            <Text style={[styles.levelText, { color: theme.colors.primary }]}>Lvl {current_level || 1}</Text>
                            <Text style={[styles.xpText, { color: theme.colors.placeholder }]}>
                                {(current_xp || 0) % xpForNextLevel} / {xpForNextLevel} XP
                            </Text>
                        </View>
                        <Text style={[styles.nextLevelLabel, { color: theme.colors.placeholder }]}>NEXT LEVEL</Text>
                    </View>

                    <View style={[styles.progressBarBg, { backgroundColor: theme.colors.border }]}>
                        <View 
                            style={[
                                styles.progressBarFill, 
                                { backgroundColor: theme.colors.primary, width: `${progress * 100}%` }
                            ]} 
                        />
                    </View>
                    
                    <View style={styles.statsGrid}>
                        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                <FontAwesomeIcon icon={faCoins} color="#F59E0B" size={12} />
                            </View>
                            <View>
                                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>Coins</Text>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>{coins || 0}</Text>
                            </View>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
                            <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.1)' }]}>
                                <FontAwesomeIcon icon={faFire} color="#F97316" size={12} />
                            </View>
                            <View>
                                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>Streak</Text>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>{streak?.current_streak || 0}d</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Next Badge Card */}
                <View style={[styles.badgeCard, { backgroundColor: 'rgba(99, 102, 241, 0.05)', borderColor: theme.colors.cardBorder }]}>
                    <Text style={[styles.badgeGoalLabel, { color: theme.colors.primary }]}>GOAL</Text>
                    {nextBadge ? (
                        <>
                            <View style={styles.badgeIconContainer}>
                                <FontAwesomeIcon icon={nextBadge.icon} color={theme.colors.primary} size={24} />
                            </View>
                            <Text style={[styles.badgeName, { color: theme.colors.text }]} numberOfLines={1}>{nextBadge.name}</Text>
                            <View style={styles.badgeXpRow}>
                                <FontAwesomeIcon icon={faArrowUp} color={theme.colors.primary} size={8} style={{ marginRight: 4 }} />
                                <Text style={[styles.badgeXpText, { color: theme.colors.primary }]}>
                                    {nextBadge.min_xp - (current_xp || 0)} XP
                                </Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.badgeIconContainer}>
                                <FontAwesomeIcon icon={faTrophy} color="#F59E0B" size={24} />
                            </View>
                            <Text style={[styles.badgeName, { color: theme.colors.text }]}>Elite</Text>
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
        padding: 20,
        borderRadius: 24,
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 20,
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
        marginBottom: 8,
    },
    levelText: {
        fontSize: 24,
        fontWeight: '900',
    },
    xpText: {
        fontSize: 11,
        fontWeight: '700',
    },
    nextLevelLabel: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
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
        borderWidth: 1,
        gap: 8,
    },
    iconBox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statLabel: {
        fontSize: 8,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 12,
        fontWeight: '900',
    },
    badgeCard: {
        width: 100,
        borderRadius: 20,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeGoalLabel: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 8,
    },
    badgeIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    badgeName: {
        fontSize: 10,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
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
