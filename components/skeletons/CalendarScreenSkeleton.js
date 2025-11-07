import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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

const CalendarScreenSkeleton = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <SkeletonPiece style={{ width: '60%', height: 24, borderRadius: 4, marginBottom: 5 }} />
      <SkeletonPiece style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 15 }} />

      <SkeletonPiece style={{ width: '100%', height: 370, borderRadius: 10, marginBottom: 20 }} />

      <SkeletonPiece style={{ width: '50%', height: 20, borderRadius: 4, marginBottom: 5 }} />
      <View style={styles.dropdownContainer}>
        <SkeletonPiece style={{ width: '100%', height: 50, borderRadius: 10 }} />
      </View>
      <View style={styles.dropdownContainer}>
        <SkeletonPiece style={{ width: '100%', height: 50, borderRadius: 10 }} />
      </View>

      <SkeletonPiece style={{ width: '40%', height: 20, borderRadius: 4, marginTop: 20, marginBottom: 5 }} />
      <View style={styles.dropdownContainer}>
        <SkeletonPiece style={{ width: '100%', height: 50, borderRadius: 10 }} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16, paddingBottom: 24 },
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  dropdownContainer: { marginBottom: 15 },
});

export default CalendarScreenSkeleton;
