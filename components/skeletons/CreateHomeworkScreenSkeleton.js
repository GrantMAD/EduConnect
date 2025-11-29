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

const CreateHomeworkScreenSkeleton = () => {
    const { theme } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Back Button */}
            <SkeletonPiece style={{ width: 150, height: 20, borderRadius: 4, marginBottom: 20 }} />

            {/* Title */}
            <SkeletonPiece style={{ width: 200, height: 30, borderRadius: 4, marginBottom: 10 }} />

            {/* Screen Description */}
            <SkeletonPiece style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 20 }} />

            {/* Select Class */}
            <SkeletonPiece style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonPiece style={{ width: '100%', height: 50, borderRadius: 8, marginBottom: 20 }} />

            {/* Select Class Day (Homework specific) */}
            <SkeletonPiece style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonPiece style={{ width: '100%', height: 50, borderRadius: 8, marginBottom: 20 }} />

            {/* Subject */}
            <SkeletonPiece style={{ width: 80, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonPiece style={{ width: '100%', height: 50, borderRadius: 8, marginBottom: 20 }} />

            {/* Description */}
            <SkeletonPiece style={{ width: 100, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonPiece style={{ width: '100%', height: 100, borderRadius: 8, marginBottom: 20 }} />

            {/* Calendar */}
            <SkeletonPiece style={{ width: 80, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonPiece style={{ width: '100%', height: 300, borderRadius: 8, marginBottom: 20 }} />

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        flex: 1,
    },
    skeleton: {
        // backgroundColor handled by theme
    },
});

export default CreateHomeworkScreenSkeleton;
