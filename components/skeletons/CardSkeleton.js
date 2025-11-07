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

const CardSkeleton = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardContent}>
        <SkeletonPiece style={{ width: '70%', height: 20, borderRadius: 4, marginBottom: 10 }} />
        <SkeletonPiece style={{ width: '50%', height: 15, borderRadius: 4, marginBottom: 10 }} />
        <SkeletonPiece style={{ width: '90%', height: 15, borderRadius: 4 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    padding: 15,
  },
  cardContent: {
    flex: 1,
  },
});

export default CardSkeleton;
