import React from 'react';
import { View, StyleSheet } from 'react-native';
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

const SchoolDataScreenSkeleton = () => {
  const { theme } = useTheme(); // Use the theme hook
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonPiece style={{ width: '60%', height: 24, borderRadius: 4, marginBottom: 10 }} />
      <SkeletonPiece style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 20 }} />

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 4, marginRight: 10 }} />
          <SkeletonPiece style={{ width: '40%', height: 20, borderRadius: 4 }} />
        </View>
        <SkeletonPiece style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <SkeletonPiece style={[styles.logoPlaceholder, { backgroundColor: theme.colors.cardBorder }]} />
        <SkeletonPiece style={{ width: '50%', height: 14, borderRadius: 4, alignSelf: 'center' }} />
      </View>

      <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8, marginTop: 20 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  skeleton: {
    // backgroundColor handled by theme
  },
  section: {
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    // backgroundColor handled by theme
    marginBottom: 16,
  },
});

export default SchoolDataScreenSkeleton;
