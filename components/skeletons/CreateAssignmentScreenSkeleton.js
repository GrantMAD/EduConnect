import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const CreateAssignmentScreenSkeleton = () => {
    const { theme } = useTheme();

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Back Button */}
            <SkeletonBase style={{ width: 150, height: 20, borderRadius: 4, marginBottom: 20 }} />

            {/* Title */}
            <SkeletonBase style={{ width: 220, height: 30, borderRadius: 4, marginBottom: 10 }} />

            {/* Screen Description */}
            <SkeletonBase style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 20 }} />

            {/* Select Class */}
            <SkeletonBase style={{ width: 120, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonBase style={{ width: '100%', height: 50, borderRadius: 8, marginBottom: 20 }} />

            {/* Title Input */}
            <SkeletonBase style={{ width: 80, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonBase style={{ width: '100%', height: 50, borderRadius: 8, marginBottom: 20 }} />

            {/* Description */}
            <SkeletonBase style={{ width: 100, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonBase style={{ width: '100%', height: 100, borderRadius: 8, marginBottom: 20 }} />

            {/* Calendar */}
            <SkeletonBase style={{ width: 80, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonBase style={{ width: '100%', height: 300, borderRadius: 8, marginBottom: 20 }} />

            {/* File Picker */}
            <SkeletonBase style={{ width: 150, height: 20, borderRadius: 4, marginBottom: 10 }} />
            <SkeletonBase style={{ width: 120, height: 40, borderRadius: 8, marginBottom: 20 }} />

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        flex: 1,
    },
});

export default CreateAssignmentScreenSkeleton;