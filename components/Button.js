import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Button({ onPress, title, variant = 'primary', loading = false, style, textStyle }) {
  const { theme } = useTheme();

  const getBackgroundColor = () => {
    if (variant === 'primary') return theme.primary || '#4f46e5';
    if (variant === 'secondary') return theme.cardBackground || '#fff';
    if (variant === 'outline') return 'transparent';
    if (variant === 'danger') return theme.error || '#ef4444';
    return theme.primary;
  };

  const getTextColor = () => {
    if (variant === 'primary') return '#fff';
    if (variant === 'secondary') return theme.text || '#000';
    if (variant === 'outline') return theme.primary;
    if (variant === 'danger') return '#fff';
    return '#fff';
  };

  const getBorder = () => {
      if (variant === 'secondary' || variant === 'outline') {
          return { borderWidth: 1, borderColor: theme.border || '#e5e7eb' };
      }
      return {};
  };

  return (
    <TouchableOpacity
      onPress={loading ? null : onPress}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        getBorder(),
        style,
        loading && { opacity: 0.7 }
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
