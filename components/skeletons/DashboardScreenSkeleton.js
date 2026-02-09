import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

export const StatCardSkeleton = React.memo(() => {
    const { theme } = useTheme();
    return (
        <View
            style={[
                styles.statCard,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }
            ]}
        >
            <SkeletonBase style={{ width: 44, height: 44, borderRadius: 14, marginBottom: 16 }} />
            <SkeletonBase style={{ width: 60, height: 24, borderRadius: 4, marginBottom: 4 }} />
            <SkeletonBase style={{ width: 80, height: 10, borderRadius: 4 }} />
        </View>
    );
});

export const ActionButtonSkeleton = React.memo(() => {
    const { theme } = useTheme();
    return (
        <View
            style={[
                styles.actionButton,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }
            ]}
        >
            <SkeletonBase style={{ width: 36, height: 36, borderRadius: 10, marginRight: 12 }} />
            <SkeletonBase style={{ width: 100, height: 12, borderRadius: 4 }} />
        </View>
    );
});

export const MissingAttendanceSkeleton = React.memo(() => {
    const { theme } = useTheme();
    return (
        <View style={{ marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <SkeletonBase style={{ width: 8, height: 8, borderRadius: 4, marginRight: 8 }} />
                <SkeletonBase style={{ width: 140, height: 18, borderRadius: 4 }} />
            </View>
            <View
                style={[
                    styles.itemPlaceholder,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
                ]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SkeletonBase style={{ width: 36, height: 36, borderRadius: 12, marginRight: 12 }} />
                    <View>
                        <SkeletonBase style={{ width: 100, height: 14, borderRadius: 4, marginBottom: 6 }} />
                        <SkeletonBase style={{ width: 140, height: 10, borderRadius: 4 }} />
                    </View>
                </View>
                <SkeletonBase style={{ width: 50, height: 24, borderRadius: 12 }} />
            </View>
        </View>
    );
});

const DashboardScreenSkeleton = React.memo(({ showActionRequired = false }) => {
    const { theme } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <SkeletonBase style={{ width: 180, height: 28, borderRadius: 4, marginBottom: 8 }} />
                    <SkeletonBase style={{ width: 120, height: 14, borderRadius: 4 }} />
                </View>
            </View>

            {/* School Image */}
            <SkeletonBase style={styles.schoolImagePlaceholder} />

            {/* Action Required Skeleton (Optional/Configurable) */}
            {showActionRequired && <MissingAttendanceSkeleton />}

            {/* Gamification Hub */}
            <View style={[styles.gamificationCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={styles.gamificationTop}>
                    <View>
                        <SkeletonBase style={{ width: 100, height: 18, borderRadius: 4, marginBottom: 6 }} />
                        <SkeletonBase style={{ width: 120, height: 10, borderRadius: 4 }} />
                    </View>
                    <SkeletonBase style={{ width: 60, height: 24, borderRadius: 12 }} />
                </View>
                <SkeletonBase style={styles.progressBarBg} />
                <View style={styles.gamificationBottom}>
                    <SkeletonBase style={{ width: 120, height: 40, borderRadius: 16 }} />
                    <SkeletonBase style={{ width: 100, height: 40, borderRadius: 16 }} />
                </View>
            </View>

            {/* Row Widgets */}
            <View style={styles.rowWidgets}>
                <View style={styles.halfSection}>
                    <SkeletonBase style={{ width: 80, height: 18, borderRadius: 4, marginBottom: 12 }} />
                    <View style={[styles.itemPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                        <SkeletonBase style={{ width: '100%', height: 44, borderRadius: 12 }} />
                    </View>
                </View>
                <View style={styles.halfSection}>
                    <SkeletonBase style={{ width: 80, height: 18, borderRadius: 4, marginBottom: 12 }} />
                    <View style={[styles.itemPlaceholder, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                        <SkeletonBase style={{ width: '100%', height: 44, borderRadius: 12 }} />
                    </View>
                </View>
            </View>

            <SkeletonBase style={{ width: 140, height: 20, borderRadius: 4, marginBottom: 16, marginTop: 16 }} />
            <View style={styles.statsGrid}>
                {[1, 2, 3, 4].map((item) => (
                    <StatCardSkeleton key={item} />
                ))}
            </View>
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    schoolImagePlaceholder: {
        width: '100%',
        height: 180,
        borderRadius: 32,
        marginBottom: 32,
    },
    gamificationCard: {
        padding: 24,
        borderRadius: 32,
        marginBottom: 32,
    },
    gamificationTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    progressBarBg: {
        height: 10,
        borderRadius: 5,
        width: '100%',
        marginBottom: 20,
    },
    gamificationBottom: {
        flexDirection: 'row',
        gap: 12,
    },
    rowWidgets: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    halfSection: {
        width: '48%',
    },
    itemPlaceholder: {
        padding: 12,
        borderRadius: 20,
        marginBottom: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    statCard: {
        width: '47%',
        margin: '1.5%',
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        minHeight: 140,
        justifyContent: 'center',
    },
    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
        marginBottom: 20,
    },
    actionButton: {
        width: '47%',
        margin: '1.5%',
        padding: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default DashboardScreenSkeleton;