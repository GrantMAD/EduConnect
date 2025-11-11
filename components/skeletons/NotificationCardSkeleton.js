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

const NotificationCardSkeleton = () => {
  const { theme } = useTheme(); // Use the theme hook
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
        <SkeletonPiece style={{ width: 24, height: 24, borderRadius: 4, marginRight: 16, marginTop: 4 }} />
        <View style={styles.contentContainer}>
            <SkeletonPiece style={{ width: '70%', height: 17, borderRadius: 4, marginBottom: 4 }} />
            <SkeletonPiece style={{ width: '90%', height: 15, borderRadius: 4, marginBottom: 8 }} />
            <SkeletonPiece style={{ width: '50%', height: 12, borderRadius: 4 }} />
        </View>
        <View style={styles.actionsContainer}>
            <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 10, marginBottom: 8 }} />
            <SkeletonPiece style={{ width: 20, height: 20, borderRadius: 10 }} />
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
    skeleton: {
        // backgroundColor handled by theme
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    contentContainer: { flex: 1 },
    actionsContainer: { flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', marginLeft: 16 },
});

export default NotificationCardSkeleton;
