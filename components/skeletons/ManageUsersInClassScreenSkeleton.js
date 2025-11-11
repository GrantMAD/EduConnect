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

const ManageUsersInClassScreenSkeleton = () => {
  const { theme } = useTheme(); // Use the theme hook
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonPiece style={{ width: '70%', height: 22, borderRadius: 4, alignSelf: 'center', marginBottom: 16 }} />
      <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, alignSelf: 'center', marginBottom: 20 }} />

      {/* Class Schedule Section */}
      <View style={{ marginBottom: 25 }}>
        <View style={styles.sectionHeader}>
          <SkeletonPiece style={{ width: 18, height: 18, borderRadius: 4 }} />
          <SkeletonPiece style={{ width: '40%', height: 16, borderRadius: 4, marginLeft: 8 }} />
        </View>
        <SkeletonPiece style={{ width: '80%', height: 13, borderRadius: 4, marginBottom: 10, marginLeft: 5 }} />
        <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
            <SkeletonPiece style={{ width: '60%', height: 14, borderRadius: 4, marginBottom: 5 }} />
            <SkeletonPiece style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 5 }} />
        </View>
      </View>

      {/* Students Section */}
      <View style={{ marginBottom: 25 }}>
        <View style={styles.sectionHeader}>
            <SkeletonPiece style={{ width: 18, height: 18, borderRadius: 4 }} />
            <SkeletonPiece style={{ width: '50%', height: 16, borderRadius: 4, marginLeft: 8 }} />
        </View>
        <SkeletonPiece style={{ width: '80%', height: 13, borderRadius: 4, marginBottom: 10, marginLeft: 5 }} />
        <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
            <View style={styles.cardRow}>
                <SkeletonPiece style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
                <View>
                    <SkeletonPiece style={{ width: 120, height: 15, borderRadius: 4, marginBottom: 5 }} />
                    <SkeletonPiece style={{ width: 180, height: 13, borderRadius: 4 }} />
                </View>
            </View>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
            <View style={styles.cardRow}>
                <SkeletonPiece style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
                <View>
                    <SkeletonPiece style={{ width: 120, height: 15, borderRadius: 4, marginBottom: 5 }} />
                    <SkeletonPiece style={{ width: 180, height: 13, borderRadius: 4 }} />
                </View>
            </View>
        </View>
      </View>

      {/* Add Students Section */}
        <View style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
                <SkeletonPiece style={{ width: 18, height: 18, borderRadius: 4 }} />
                <SkeletonPiece style={{ width: '40%', height: 16, borderRadius: 4, marginLeft: 8 }} />
            </View>
            <SkeletonPiece style={{ width: '80%', height: 13, borderRadius: 4, marginBottom: 10, marginLeft: 5 }} />
            <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 10, marginBottom: 8 }} />
            <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
                <View style={styles.cardRow}>
                    <SkeletonPiece style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
                    <View>
                        <SkeletonPiece style={{ width: 120, height: 15, borderRadius: 4, marginBottom: 5 }} />
                        <SkeletonPiece style={{ width: 180, height: 13, borderRadius: 4 }} />
                    </View>
                </View>
            </View>
        </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  skeleton: {
    // backgroundColor handled by theme
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  card: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
});

export default ManageUsersInClassScreenSkeleton;
