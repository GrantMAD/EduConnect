import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const AnimatedAvatarBorder = ({
    avatarSource,
    size = 80,
    borderStyle = {},
    isRainbow = false,
    isAnimated = false
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rainbowRotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isAnimated) {
            // Pulsating animation for neon and rainbow - MORE DRAMATIC
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.5,
                        duration: 800,
                        useNativeDriver: false,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        }

        if (isRainbow) {
            // Continuous rotation for rainbow effect
            Animated.loop(
                Animated.timing(rainbowRotation, {
                    toValue: 1,
                    duration: 3000,
                    useNativeDriver: true,
                })
            ).start();
        }
    }, [isAnimated, isRainbow]);

    const animatedShadowOpacity = pulseAnim.interpolate({
        inputRange: [1, 1.5],
        outputRange: [0.5, 1],
    });

    const animatedShadowRadius = pulseAnim.interpolate({
        inputRange: [1, 1.5],
        outputRange: [borderStyle.shadowRadius || 10, (borderStyle.shadowRadius || 10) * 2],
    });

    // Add border width animation for more visibility
    const animatedBorderWidth = pulseAnim.interpolate({
        inputRange: [1, 1.5],
        outputRange: [borderStyle.borderWidth || 4, (borderStyle.borderWidth || 4) * 1.75],
    });

    // Add scale animation for even more visibility
    const animatedScale = pulseAnim.interpolate({
        inputRange: [1, 1.5],
        outputRange: [1, 1.05],
    });

    if (isRainbow) {
        // Rainbow border with gradient
        return (
            <View style={[styles.container, { width: size + 12, height: size + 12 }]}>
                <Animated.View
                    style={[
                        styles.rainbowContainer,
                        {
                            width: size + 12,
                            height: size + 12,
                            borderRadius: (size + 12) / 2,
                            shadowOpacity: isAnimated ? animatedShadowOpacity : 0.8,
                            shadowRadius: isAnimated ? animatedShadowRadius : 14,
                            shadowColor: '#FF00FF',
                            shadowOffset: { width: 0, height: 0 },
                            elevation: 10,
                            transform: isAnimated ? [{ scale: animatedScale }] : [],
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3', '#FF0000']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.rainbowGradient,
                            {
                                width: size + 12,
                                height: size + 12,
                                borderRadius: (size + 12) / 2,
                            },
                        ]}
                    >
                        <View
                            style={[
                                styles.innerCircle,
                                {
                                    width: size,
                                    height: size,
                                    borderRadius: size / 2,
                                },
                            ]}
                        >
                            <Image
                                source={avatarSource}
                                style={[
                                    styles.avatar,
                                    {
                                        width: size,
                                        height: size,
                                        borderRadius: size / 2,
                                    },
                                ]}
                                resizeMode="cover"
                            />
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        );
    }

    // Regular border (with optional animation for neon)
    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Animated.Image
                source={avatarSource}
                style={[
                    styles.avatar,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                    },
                    borderStyle,
                    isAnimated && {
                        shadowOpacity: animatedShadowOpacity,
                        shadowRadius: animatedShadowRadius,
                        borderWidth: animatedBorderWidth,
                        transform: [{ scale: animatedScale }],
                    },
                ]}
                resizeMode="cover"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    rainbowContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    rainbowGradient: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 6,
    },
    innerCircle: {
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        // Styles applied dynamically
    },
});

export default AnimatedAvatarBorder;
