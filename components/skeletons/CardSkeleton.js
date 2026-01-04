import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';

export { SkeletonPiece };

const CardSkeleton = React.memo(() => {
  const { theme } = useTheme(); 
  return (
    <View style={[styles.cardContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.cardContent}>
        <SkeletonBase style={{ width: '60%', height: 18, borderRadius: 4, marginBottom: 12 }} />
        <SkeletonBase style={{ width: '90%', height: 12, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonBase style={{ width: '80%', height: 12, borderRadius: 4 }} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 24,
    marginBottom: 12,
    padding: 20,
  },
  cardContent: {
    flex: 1,
  },
});

export default CardSkeleton;