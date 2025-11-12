import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const SkeletonElement = ({ style }) => {
  const { theme } = useTheme();
  // A simple shimmering effect can be added here later if desired
  return <View style={[styles.skeleton, { backgroundColor: theme.colors.cardBorder }, style]} />;
};

const ChildCardSkeleton = () => {
  return (
    <View style={styles.childCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SkeletonElement style={styles.avatar} />
        <View>
          <SkeletonElement style={{ width: 150, height: 20, borderRadius: 4 }} />
          <SkeletonElement style={{ width: 200, height: 15, borderRadius: 4, marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
};

const MyChildrenScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      <SkeletonElement style={{ width: '60%', height: 30, borderRadius: 4, alignSelf: 'center', marginBottom: 10 }} />
      <SkeletonElement style={{ width: '80%', height: 20, borderRadius: 4, alignSelf: 'center', marginBottom: 20 }} />
      
      <ChildCardSkeleton />
      <ChildCardSkeleton />
      <ChildCardSkeleton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  skeleton: {
    opacity: 0.3,
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
