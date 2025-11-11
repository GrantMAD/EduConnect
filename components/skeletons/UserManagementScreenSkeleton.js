import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
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

const UserItemSkeleton = () => {
    const { theme } = useTheme(); // Use the theme hook
    return (
        <View style={[styles.userItem, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <SkeletonPiece style={[styles.avatar, { borderColor: theme.colors.cardBorder }]} />
            <View style={styles.userInfo}>
                <SkeletonPiece style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 5 }} />
                <SkeletonPiece style={{ width: '50%', height: 14, borderRadius: 4 }} />
            </View>
        </View>
    );
};

const UserManagementScreenSkeleton = () => {
  const { theme } = useTheme(); // Use the theme hook
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
    padding: 24,
  },
  skeleton: {
    // backgroundColor handled by theme
  },
  userItem: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
});

export default UserManagementScreenSkeleton;
