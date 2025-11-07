import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';

const SkeletonPiece = ({ style }) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], [0.5, 1]);
    return {
      opacity,
    };
  });

  return <Animated.View style={[styles.skeleton, animatedStyle, style]} />;
};

const UserItemSkeleton = () => (
    <View style={styles.userItem}>
        <SkeletonPiece style={styles.avatar} />
        <View style={styles.userInfo}>
            <SkeletonPiece style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 5 }} />
            <SkeletonPiece style={{ width: '50%', height: 14, borderRadius: 4 }} />
        </View>
    </View>
);

const UserManagementScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      <SkeletonPiece style={{ width: '60%', height: 32, borderRadius: 4, marginBottom: 8 }} />
      <SkeletonPiece style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 24 }} />
      <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8, marginBottom: 16 }} />
      <FlatList
        data={[1, 2, 3, 4, 5]}
        keyExtractor={(item) => item.toString()}
        renderItem={() => <UserItemSkeleton />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  userItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
});

export default UserManagementScreenSkeleton;
