import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

export const ResourceCardSkeleton = React.memo(() => {
    const { theme } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <SkeletonBase style={{ width: 40, height: 40, borderRadius: 12, marginRight: 16 }} />
            <View style={{ flex: 1 }}>
                <SkeletonBase style={{ width: '60%', height: 16, borderRadius: 4, marginBottom: 8 }} />
                <SkeletonBase style={{ width: '90%', height: 12, borderRadius: 4, marginBottom: 8 }} />
                <SkeletonBase style={{ width: '40%', height: 10, borderRadius: 4 }} />
            </View>
        </View>
    );
});

const ResourcesScreenSkeleton = React.memo(() => {
    const { theme } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View>
                    <SkeletonBase style={{ width: 180, height: 28, borderRadius: 4, marginBottom: 8 }} />
                    <SkeletonBase style={{ width: 240, height: 14, borderRadius: 4 }} />
                </View>
                <SkeletonBase style={{ width: 56, height: 56, borderRadius: 16 }} />
            </View>

            {/* Search Input */}
            <SkeletonBase style={{ width: '100%', height: 52, borderRadius: 16, marginTop: 24, marginBottom: 32 }} />

            {/* Category Header */}
            <SkeletonBase style={{ width: 120, height: 18, borderRadius: 4, marginBottom: 20, marginLeft: 4 }} />

            {/* Resource Cards */}
            <ScrollView showsVerticalScrollIndicator={false}>
                {[1, 2, 3, 4].map((key) => (
                    <ResourceCardSkeleton key={key} />
                ))}
            </ScrollView>
        </View>
    );
});

export default ResourcesScreenSkeleton;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    card: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 12,
    },
});