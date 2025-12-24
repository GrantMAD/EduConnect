import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonPiece } from './DashboardScreenSkeleton';

const LeaderboardSkeleton = () => {
    const { theme } = useTheme();

    const renderItem = (i) => (
        <View 
            key={i} 
            style={[styles.userCard, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.cardBorder }]}
        >
            <View style={styles.rankContainer}>
                <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 10 }} />
            </View>

            <View style={styles.avatarContainer}>
                <SkeletonPiece style={{ width: 44, height: 44, borderRadius: 22 }} />
            </View>

            <View style={styles.userInfo}>
                <SkeletonPiece style={{ width: 120, height: 16, borderRadius: 4, marginBottom: 6 }} />
                <SkeletonPiece style={{ width: 60, height: 12, borderRadius: 4 }} />
            </View>

            <View style={styles.pointsContainer}>
                <SkeletonPiece style={{ width: 50, height: 20, borderRadius: 10 }} />
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => renderItem(i))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        marginBottom: 10,
        borderBottomWidth: 1,
    },
    rankContainer: {
        width: 30,
        alignItems: 'center',
        marginRight: 10,
    },
    avatarContainer: {
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    pointsContainer: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
});

export default LeaderboardSkeleton;
