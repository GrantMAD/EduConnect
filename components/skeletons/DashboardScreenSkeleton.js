import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const SkeletonPiece = ({ style }) => {
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

const DashboardScreenSkeleton = () => {
    const { theme } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <SkeletonPiece style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
                <SkeletonPiece style={{ width: 150, height: 32, borderRadius: 4 }} />
            </View>
            <SkeletonPiece style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 24 }} />

            {/* User Statistics Section */}
            <SkeletonPiece style={{ width: 140, height: 20, borderRadius: 4, marginBottom: 4 }} />
            <SkeletonPiece style={{ width: '70%', height: 14, borderRadius: 4, marginBottom: 16 }} />
            <View style={styles.statsGrid}>
                {[1, 2, 3, 4, 5].map((item) => (
                    <View
                        key={item}
                        style={[
                            styles.statCard,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }
                        ]}
                    >
                        <SkeletonPiece style={{ width: 48, height: 48, borderRadius: 24, marginBottom: 12 }} />
                        <SkeletonPiece style={{ width: 60, height: 28, borderRadius: 4, marginBottom: 4 }} />
                        <SkeletonPiece style={{ width: 80, height: 14, borderRadius: 4 }} />
                    </View>
                ))}
            </View>

            {/* Content & Activity Section */}
            <SkeletonPiece style={{ width: 160, height: 20, borderRadius: 4, marginBottom: 4, marginTop: 16 }} />
            <SkeletonPiece style={{ width: '85%', height: 14, borderRadius: 4, marginBottom: 16 }} />
            <View style={styles.statsGrid}>
                {[1, 2, 3, 4, 5, 6].map((item) => (
                    <View
                        key={item}
                        style={[
                            styles.statCard,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }
                        ]}
                    >
                        <SkeletonPiece style={{ width: 48, height: 48, borderRadius: 24, marginBottom: 12 }} />
                        <SkeletonPiece style={{ width: 60, height: 28, borderRadius: 4, marginBottom: 4 }} />
                        <SkeletonPiece style={{ width: 80, height: 14, borderRadius: 4 }} />
                    </View>
                ))}
            </View>

            {/* Quick Actions Section */}
            <SkeletonPiece style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 4, marginTop: 16 }} />
            <SkeletonPiece style={{ width: '75%', height: 14, borderRadius: 4, marginBottom: 16 }} />
            <View style={styles.actionsContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                    <View
                        key={item}
                        style={[
                            styles.actionButton,
                            { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }
                        ]}
                    >
                        <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 4, marginRight: 8 }} />
                        <SkeletonPiece style={{ width: 100, height: 14, borderRadius: 4 }} />
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    skeleton: {
        // backgroundColor handled by theme
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
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
