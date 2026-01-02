import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const SkeletonBase = ({ style, duration = 1000, opacityRange = [0.5, 1], backgroundColor }) => {
  const progress = useSharedValue(0);
  const { theme } = useTheme();

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration }), -1, true);
  }, [duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 1], opacityRange);
    return {
      opacity,
    };
  });

  const finalBackgroundColor = backgroundColor || theme.colors.cardBorder;

  return <Animated.View style={[{ backgroundColor: finalBackgroundColor }, animatedStyle, style]} />;
};

export const SkeletonPiece = SkeletonBase;
export default SkeletonBase;
