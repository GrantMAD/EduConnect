import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const SkeletonPiece = ({ style }) => {
    const progress = useSharedValue(0);
    const { theme } = useTheme();

    React.useEffect(() => {
        progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(progress.value, [0, 1], [0.3, 0.7]);
        return {
            opacity,
        };
    });

    return <Animated.View style={[styles.skeleton, { backgroundColor: theme.colors.textSecondary }, animatedStyle, style]} />;
};

const ChatMessageSkeleton = ({ align }) => {
    const { theme } = useTheme();
    const isRight = align === 'right';

    return (
        <View style={[
            styles.messageContainer,
            isRight ? styles.rightContainer : styles.leftContainer
        ]}>
            {!isRight && <SkeletonPiece style={styles.avatar} />}
            <View style={[
                styles.bubble,
                {
                    backgroundColor: isRight ? theme.colors.primary + '20' : theme.colors.surface,
                    borderBottomRightRadius: isRight ? 0 : 12,
                    borderBottomLeftRadius: isRight ? 12 : 0,
                }
            ]}>
                <SkeletonPiece style={{ width: 150, height: 14, borderRadius: 4, marginBottom: 6 }} />
                <SkeletonPiece style={{ width: 100, height: 14, borderRadius: 4 }} />
            </View>
        </View>
    );
};

const ChatMessagesSkeleton = () => {
    return (
        <View style={styles.container}>
            <ChatMessageSkeleton align="left" />
            <ChatMessageSkeleton align="right" />
            <ChatMessageSkeleton align="left" />
            <ChatMessageSkeleton align="left" />
            <ChatMessageSkeleton align="right" />
            <ChatMessageSkeleton align="right" />
            <ChatMessageSkeleton align="left" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        justifyContent: 'flex-end',
    },
    messageContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    leftContainer: {
        justifyContent: 'flex-start',
    },
    rightContainer: {
        justifyContent: 'flex-end',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    bubble: {
        padding: 12,
        borderRadius: 12,
        minWidth: 100,
    },
    skeleton: {
        // backgroundColor handled by theme
    },
});

export default ChatMessagesSkeleton;
