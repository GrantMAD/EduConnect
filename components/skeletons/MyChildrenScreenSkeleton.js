import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

export const ChildCardSkeleton = React.memo(() => {
  return (
    <View style={styles.childCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonBase style={styles.avatar} />
        <View>
          <SkeletonBase style={{ width: 150, height: 20, borderRadius: 4 }} />
          <SkeletonBase style={{ width: 200, height: 15, borderRadius: 4, marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
});

const MyChildrenScreenSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonBase style={{ width: '60%', height: 30, borderRadius: 4, alignSelf: 'center', marginBottom: 10 }} />
      <SkeletonBase style={{ width: '80%', height: 20, borderRadius: 4, alignSelf: 'center', marginBottom: 20 }} />
      
      <ChildCardSkeleton />
      <ChildCardSkeleton />
      <ChildCardSkeleton />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  childCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
});

export default MyChildrenScreenSkeleton;