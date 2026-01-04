import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';

export { SkeletonPiece };

const AnnouncementCardSkeleton = React.memo(() => {
  const { theme } = useTheme(); 
  return (
    <View style={[styles.cardContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.cardContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <SkeletonBase style={{ width: '60%', height: 20, borderRadius: 4 }} />
          <SkeletonBase style={{ width: 32, height: 32, borderRadius: 10 }} />
        </View>
        <SkeletonBase style={{ width: '40%', height: 12, borderRadius: 4, marginBottom: 16 }} />
        <SkeletonBase style={{ width: '100%', height: 14, borderRadius: 4, marginTop: 6 }} />
        <SkeletonBase style={{ width: '100%', height: 14, borderRadius: 4, marginTop: 6 }} />
        <SkeletonBase style={{ width: '80%', height: 14, borderRadius: 4, marginTop: 6 }} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 20,
  },
});

export default AnnouncementCardSkeleton;