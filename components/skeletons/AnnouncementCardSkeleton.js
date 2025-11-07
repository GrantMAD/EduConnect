import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';

const SkeletonPiece = ({ style }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
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

const AnnouncementCardSkeleton = () => {
  return (
    <View style={styles.cardContainer}>
      <View style={styles.cardContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <SkeletonPiece style={{ width: '60%', height: 20, borderRadius: 4 }} />
          <SkeletonPiece style={{ width: 40, height: 20, borderRadius: 4 }} />
        </View>
        <SkeletonPiece style={{ width: '40%', height: 15, borderRadius: 4, marginTop: 5 }} />
        <View style={styles.separator} />
        <SkeletonPiece style={{ width: '100%', height: 15, borderRadius: 4, marginTop: 5 }} />
        <SkeletonPiece style={{ width: '100%', height: 15, borderRadius: 4, marginTop: 5 }} />
        <SkeletonPiece style={{ width: '80%', height: 15, borderRadius: 4, marginTop: 5 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
});

export default AnnouncementCardSkeleton;
