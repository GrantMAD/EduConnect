import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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

const SchoolSetupScreenSkeleton = () => {
  const { theme } = useTheme(); // Use the theme hook
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonPiece style={{ width: '80%', height: 26, borderRadius: 4, alignSelf: 'center', marginBottom: 4 }} />
      <SkeletonPiece style={{ width: '90%', height: 16, borderRadius: 4, alignSelf: 'center', marginBottom: 24 }} />

      {/* Join Existing School Section */}
      <SkeletonPiece style={{ width: '60%', height: 20, borderRadius: 4, marginTop: 16, marginBottom: 8 }} />
      <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 15 }} />
      <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 12, marginBottom: 12 }} />

      <View style={[styles.schoolCard, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
        <SkeletonPiece style={{ width: '60%', height: 16, borderRadius: 4 }} />
        <SkeletonPiece style={{ width: '20%', height: 30, borderRadius: 8 }} />
      </View>
      <View style={[styles.schoolCard, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
        <SkeletonPiece style={{ width: '60%', height: 16, borderRadius: 4 }} />
        <SkeletonPiece style={{ width: '20%', height: 30, borderRadius: 8 }} />
      </View>

      {/* Sign Out Button */}
      <SkeletonPiece style={{ width: '30%', height: 16, borderRadius: 4, alignSelf: 'center', marginTop: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  skeleton: {
    // backgroundColor handled by theme
  },
  schoolCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default SchoolSetupScreenSkeleton;
