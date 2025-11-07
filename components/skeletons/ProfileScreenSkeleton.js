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

const ProfileScreenSkeleton = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SkeletonPiece style={styles.avatar} />
      <SkeletonPiece style={{ width: '60%', height: 32, borderRadius: 4, marginBottom: 8 }} />
      <SkeletonPiece style={{ width: '80%', height: 16, borderRadius: 4, marginBottom: 32 }} />

      {/* Card 1: User Information */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 4, marginRight: 10 }} />
          <SkeletonPiece style={{ width: '50%', height: 20, borderRadius: 4 }} />
        </View>
        <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 15 }} />

        <View style={styles.infoContainer}>
          <SkeletonPiece style={{ width: '40%', height: 14, borderRadius: 4, marginBottom: 5 }} />
          <SkeletonPiece style={{ width: '80%', height: 16, borderRadius: 4 }} />
        </View>
        <View style={styles.infoContainer}>
          <SkeletonPiece style={{ width: '40%', height: 14, borderRadius: 4, marginBottom: 5 }} />
          <SkeletonPiece style={{ width: '80%', height: 16, borderRadius: 4 }} />
        </View>
        <View style={styles.infoContainer}>
          <SkeletonPiece style={{ width: '40%', height: 14, borderRadius: 4, marginBottom: 5 }} />
          <SkeletonPiece style={{ width: '80%', height: 16, borderRadius: 4 }} />
        </View>
        <View style={styles.infoContainer}>
          <SkeletonPiece style={{ width: '40%', height: 14, borderRadius: 4, marginBottom: 5 }} />
          <SkeletonPiece style={{ width: '80%', height: 16, borderRadius: 4 }} />
        </View>
        <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8, marginTop: 20 }} />
      </View>

      {/* Card 2: My Children (for Parents) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 4, marginRight: 10 }} />
          <SkeletonPiece style={{ width: '50%', height: 20, borderRadius: 4 }} />
        </View>
        <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 15 }} />

        <View style={styles.associatedChildrenContainer}>
            <SkeletonPiece style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 10 }} />
            <View style={styles.childItem}>
                <SkeletonPiece style={{ width: 16, height: 16, borderRadius: 8, marginRight: 10 }} />
                <View>
                    <SkeletonPiece style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 5 }} />
                    <SkeletonPiece style={{ width: 150, height: 14, borderRadius: 4 }} />
                </View>
            </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f8f9fa', padding: 24, alignItems: 'center' },
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#E0E0E0', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoContainer: { width: '100%', marginBottom: 16 },
  associatedChildrenContainer: {
    marginTop: 10,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});

export default ProfileScreenSkeleton;
