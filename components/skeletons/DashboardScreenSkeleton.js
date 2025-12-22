import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

export const SkeletonPiece = ({ style }) => {
    const progress = useSharedValue(0);
    const { theme } = useTheme();

    React.useEffect(() => {
        progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(progress.value, [0, 1], [0.5, 1]);
        return {
            opacity,
        };
    });

    return <Animated.View style={[styles.skeleton, { backgroundColor: theme.colors.cardBorder }, animatedStyle, style]} />;
};

export const StatCardSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View
            style={[
                styles.statCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }
            ]}
        >
            <SkeletonPiece style={{ width: 48, height: 48, borderRadius: 24, marginBottom: 12 }} />
            <SkeletonPiece style={{ width: 60, height: 28, borderRadius: 4, marginBottom: 4 }} />
            <SkeletonPiece style={{ width: 80, height: 14, borderRadius: 4 }} />
        </View>
    );
};

export const ActionButtonSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View
            style={[
                styles.actionButton,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }
            ]}
        >
            <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 4, marginRight: 8 }} />
            <SkeletonPiece style={{ width: 100, height: 14, borderRadius: 4 }} />
        </View>
    );
};

const DashboardScreenSkeleton = () => {
    const { theme } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <SkeletonPiece style={{ width: 180, height: 24, borderRadius: 4, marginBottom: 8 }} />
                    <SkeletonPiece style={{ width: 120, height: 14, borderRadius: 4 }} />
                </View>
            </View>

            {/* School Image */}
            <SkeletonPiece style={styles.schoolImagePlaceholder} />

            {/* Gamification Hub */}
            <View style={[styles.gamificationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <View style={styles.gamificationTop}>
                    <View>
                        <SkeletonPiece style={{ width: 80, height: 18, borderRadius: 4, marginBottom: 6 }} />
                        <SkeletonPiece style={{ width: 60, height: 12, borderRadius: 4 }} />
                    </View>
                    <SkeletonPiece style={{ width: 50, height: 24, borderRadius: 12 }} />
                </View>
                <SkeletonPiece style={styles.progressBarBg} />
                <View style={styles.gamificationBottom}>
                    <SkeletonPiece style={{ width: 70, height: 16, borderRadius: 4 }} />
                    <SkeletonPiece style={{ width: 90, height: 16, borderRadius: 4 }} />
                </View>
            </View>

            {/* Row Widgets: Schedule & Due Soon */}
            <View style={styles.rowWidgets}>
                <View style={styles.halfSection}>
                    <SkeletonPiece style={{ width: 80, height: 18, borderRadius: 4, marginBottom: 12 }} />
                    <View style={[styles.itemPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                        <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
                    </View>
                    <View style={[styles.itemPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                        <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
                    </View>
                </View>
                <View style={styles.halfSection}>
                    <SkeletonPiece style={{ width: 80, height: 18, borderRadius: 4, marginBottom: 12 }} />
                    <View style={[styles.itemPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                        <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
                    </View>
                    <View style={[styles.itemPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                        <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
                    </View>
                </View>
            </View>

            {/* User Statistics Section (Admin/Teacher view) */}
            <SkeletonPiece style={{ width: 140, height: 20, borderRadius: 4, marginBottom: 16, marginTop: 16 }} />
            <View style={styles.statsGrid}>
                {[1, 2, 3, 4].map((item) => (
                    <StatCardSkeleton key={item} />
                ))}
            </View>

            {/* Content & Activity Section */}
            <SkeletonPiece style={{ width: 160, height: 20, borderRadius: 4, marginBottom: 16, marginTop: 16 }} />
            <View style={styles.statsGrid}>
                {[1, 2, 3, 4].map((item) => (
                    <StatCardSkeleton key={item} />
                ))}
            </View>

            {/* Quick Actions Section */}
            <SkeletonPiece style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 16, marginTop: 16 }} />
            <View style={styles.actionsContainer}>
                {[1, 2, 3, 4].map((item) => (
                    <ActionButtonSkeleton key={item} />
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    skeleton: {
        // backgroundColor handled by theme
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    schoolImagePlaceholder: {
        width: '100%',
        height: 150,
        borderRadius: 16,
        marginBottom: 24,
    },
    gamificationCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    gamificationTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressBarBg: {
        height: 8,
        borderRadius: 4,
        width: '100%',
        marginBottom: 12,
    },
    gamificationBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowWidgets: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    halfSection: {
        width: '48%',
    },
    itemPlaceholder: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    statCard: {
        width: '48%',
        margin: '1%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        minHeight: 120,
        justifyContent: 'center',
    },
    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 20,
    },
    actionButton: {
        width: '48%',
        margin: '1%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default DashboardScreenSkeleton;
