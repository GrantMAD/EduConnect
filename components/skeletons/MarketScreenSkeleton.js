import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

export const MarketplaceItemCardSkeleton = () => {
    const { theme } = useTheme(); 
    return (
        <View style={[styles.cardContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <SkeletonBase style={styles.cardImage} />
            <View style={styles.cardContent}>
                <SkeletonBase style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 8 }} />
                <SkeletonBase style={{ width: '40%', height: 12, borderRadius: 4 }} />
            </View>
        </View>
    );
};

const MarketScreenSkeleton = () => {
  const { theme } = useTheme(); 
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.mainHeaderContainer}>
            <SkeletonBase style={{ width: 200, height: 32, borderRadius: 4 }} />
        </View>
        <SkeletonBase style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 24 }} />
        <SkeletonBase style={{ width: '100%', height: 52, borderRadius: 16, marginBottom: 32 }} />

        {[1, 2].map(i => (
            <View key={i} style={styles.sectionContainer}>
                <View style={styles.sectionHeaderContainer}>
                    <SkeletonBase style={{ width: 120, height: 18, borderRadius: 4, marginBottom: 8 }} />
                    <SkeletonBase style={{ width: 220, height: 10, borderRadius: 4 }} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                    <MarketplaceItemCardSkeleton />
                    <MarketplaceItemCardSkeleton />
                    <MarketplaceItemCardSkeleton />
                </ScrollView>
            </View>
        ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    mainHeaderContainer: { marginBottom: 12 },
    sectionContainer: { marginBottom: 32 },
    sectionHeaderContainer: { marginBottom: 20 },
    cardContainer: {
        borderRadius: 24,
        marginRight: 16,
        width: 180,
        overflow: 'hidden',
    },
    cardImage: {
        width: 180,
        height: 120,
    },
    cardContent: {
        padding: 16,
    },
});

export default MarketScreenSkeleton;