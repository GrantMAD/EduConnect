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

const ResourceCardSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            <SkeletonPiece style={{ width: 24, height: 24, borderRadius: 8, marginRight: 10 }} />
            <View style={{ flex: 1 }}>
                <SkeletonPiece style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 8 }} />
                <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 4 }} />
                <SkeletonPiece style={{ width: '50%', height: 12, borderRadius: 4 }} />
            </View>
        </View>
    );
};

export default function ResourcesScreenSkeleton() {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SkeletonPiece style={{ width: 24, height: 24, borderRadius: 12, marginRight: 10 }} />
                    <SkeletonPiece style={{ width: 120, height: 24, borderRadius: 4 }} />
                </View>
                <SkeletonPiece style={{ width: 60, height: 32, borderRadius: 10 }} />
            </View>

            {/* Description */}
            <SkeletonPiece style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 20 }} />

            {/* Search Input */}
            <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8, marginBottom: 20 }} />

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <SkeletonPiece style={{ width: 100, height: 32, borderRadius: 20, marginRight: 10 }} />
                <SkeletonPiece style={{ width: 120, height: 32, borderRadius: 20 }} />
            </View>

            {/* Category Header */}
            <SkeletonPiece style={{ width: 100, height: 18, borderRadius: 4, marginBottom: 10, marginLeft: 5 }} />

            {/* Resource Cards */}
            <ScrollView showsVerticalScrollIndicator={false}>
                {[1, 2, 3, 4].map((key) => (
                    <ResourceCardSkeleton key={key} />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    skeleton: {
        // backgroundColor handled by theme
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    card: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 20,
    },
    controlsContainer: {
        flexDirection: 'row',
        marginBottom: 15,
    },
});
