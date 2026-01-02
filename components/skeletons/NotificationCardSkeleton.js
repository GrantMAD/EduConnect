import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const NotificationCardSkeleton = () => {
  const { theme } = useTheme(); 
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
        <SkeletonBase style={{ width: 44, height: 44, borderRadius: 14, marginRight: 16 }} />
        <View style={styles.contentContainer}>
            <SkeletonBase style={{ width: '60%', height: 16, borderRadius: 4, marginBottom: 8 }} />
            <SkeletonBase style={{ width: '90%', height: 12, borderRadius: 4, marginBottom: 12 }} />
            <SkeletonBase style={{ width: '40%', height: 10, borderRadius: 4 }} />
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    contentContainer: { flex: 1 },
});

export default NotificationCardSkeleton;