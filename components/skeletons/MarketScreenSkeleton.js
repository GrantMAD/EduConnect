import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext'; // Import useTheme

const SkeletonPiece = ({ style }) => {
  const progress = useSharedValue(0);
  const { theme } = useTheme(); // Use the theme hook

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

const MarketplaceItemCardSkeleton = () => {
    const { theme } = useTheme(); // Use the theme hook
    return (
        <View style={[styles.cardContainer, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
            <SkeletonPiece style={styles.cardImage} />
            <View style={styles.cardContent}>
                <SkeletonPiece style={{ width: '80%', height: 16, borderRadius: 4, marginBottom: 5 }} />
                <SkeletonPiece style={{ width: '50%', height: 14, borderRadius: 4 }} />
            </View>
        </View>
    );
};

const MarketScreenSkeleton = () => {
  const { theme } = useTheme(); // Use the theme hook
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.mainHeaderContainer}>
            <SkeletonPiece style={{ width: 24, height: 24, borderRadius: 4, marginRight: 10 }} />
            <SkeletonPiece style={{ width: '60%', height: 24, borderRadius: 4 }} />
        </View>
        <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 10, marginBottom: 12 }} />

        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderContainer}>
                <SkeletonPiece style={{ width: 18, height: 18, borderRadius: 4, marginRight: 10 }} />
                <View>
                    <SkeletonPiece style={{ width: 100, height: 18, borderRadius: 4, marginBottom: 5 }} />
                    <SkeletonPiece style={{ width: 200, height: 12, borderRadius: 4 }} />
                </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <MarketplaceItemCardSkeleton />
                <MarketplaceItemCardSkeleton />
                <MarketplaceItemCardSkeleton />
            </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderContainer}>
                <SkeletonPiece style={{ width: 18, height: 18, borderRadius: 4, marginRight: 10 }} />
                <View>
                    <SkeletonPiece style={{ width: 120, height: 18, borderRadius: 4, marginBottom: 5 }} />
                    <SkeletonPiece style={{ width: 220, height: 12, borderRadius: 4 }} />
                </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <MarketplaceItemCardSkeleton />
                <MarketplaceItemCardSkeleton />
            </ScrollView>
        </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    skeleton: {
        // backgroundColor handled by theme
    },
    mainHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    sectionContainer: { marginBottom: 20 },
    sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    cardContainer: {
        borderRadius: 10,
        marginRight: 10,
        width: 150,
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardImage: {
        width: 150,
        height: 100,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
    },
    cardContent: {
        padding: 10,
    },
});

export default MarketScreenSkeleton;
