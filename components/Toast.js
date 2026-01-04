import React, { useState, useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const { height } = Dimensions.get('window');

const Toast = React.memo(({ message, type = 'default', duration = 3000, onHide }) => {
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Initial value for opacity: 0
  const { theme } = useTheme(); // Use the theme hook

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setIsVisible(false);
            if (onHide) {
              onHide();
            }
          });
        }, duration);
      });
    }
  }, [message, type, duration, fadeAnim, onHide]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'error':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      default:
        return theme.colors.backdrop; // Use backdrop color for default
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View style={[styles.toastContainer, { opacity: fadeAnim, backgroundColor: getBackgroundColor(), borderColor: 'rgba(0,0,0,0.1)', borderWidth: 1 }]}>
      <Text style={[styles.toastText, { color: '#fff' }]}>{message}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 20,
    alignSelf: 'center',
    zIndex: 99999,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});

export default Toast;
