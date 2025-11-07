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

const SettingsScreenSkeleton = () => {
  return (
    <View style={styles.container}>
      <SkeletonPiece style={{ width: '50%', height: 32, borderRadius: 4, marginBottom: 8 }} />
      <SkeletonPiece style={{ width: '80%', height: 16, borderRadius: 4, marginBottom: 32 }} />

      <View style={styles.separator} />
      <View style={styles.section}>
        <SkeletonPiece style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <View style={styles.button}>
          <SkeletonPiece style={{ width: 18, height: 18, borderRadius: 4 }} />
          <View>
            <SkeletonPiece style={{ width: 100, height: 16, borderRadius: 4, marginLeft: 15 }} />
            <SkeletonPiece style={{ width: 150, height: 12, borderRadius: 4, marginLeft: 15, marginTop: 5 }} />
          </View>
        </View>
      </View>

      <View style={styles.separator} />
      <View style={styles.section}>
        <SkeletonPiece style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <View style={styles.button}>
          <SkeletonPiece style={{ width: 18, height: 18, borderRadius: 4 }} />
          <View>
            <SkeletonPiece style={{ width: 100, height: 16, borderRadius: 4, marginLeft: 15 }} />
            <SkeletonPiece style={{ width: 150, height: 12, borderRadius: 4, marginLeft: 15, marginTop: 5 }} />
          </View>
        </View>
      </View>

      <View style={styles.separator} />
      <View style={styles.section}>
        <SkeletonPiece style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <View style={styles.button}>
          <SkeletonPiece style={{ width: 18, height: 18, borderRadius: 4 }} />
          <View>
            <SkeletonPiece style={{ width: 100, height: 16, borderRadius: 4, marginLeft: 15 }} />
            <SkeletonPiece style={{ width: 150, height: 12, borderRadius: 4, marginLeft: 15, marginTop: 5 }} />
          </View>
        </View>
      </View>
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
  separator: {
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SettingsScreenSkeleton;
