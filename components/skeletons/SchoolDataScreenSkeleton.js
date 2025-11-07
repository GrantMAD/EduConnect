import React from 'react';
import { View, StyleSheet } from 'react-native';
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

const SchoolDataScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      <SkeletonPiece style={{ width: '60%', height: 24, borderRadius: 4, marginBottom: 10 }} />
      <SkeletonPiece style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 20 }} />

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 4, marginRight: 10 }} />
          <SkeletonPiece style={{ width: '40%', height: 20, borderRadius: 4 }} />
        </View>
        <SkeletonPiece style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <SkeletonPiece style={styles.logoPlaceholder} />
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
    backgroundColor: '#f8f9fa',
  },
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  section: {
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
});

export default SchoolDataScreenSkeleton;
