import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
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

const ChatRoomScreenSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header Skeleton */}
            <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
                <SkeletonPiece style={styles.backButton} />
                <SkeletonPiece style={styles.headerAvatar} />
                <SkeletonPiece style={styles.headerTitle} />
            </View>

            <View style={styles.chatArea}>
                <ChatMessageSkeleton align="left" />
                <ChatMessageSkeleton align="right" />
                <ChatMessageSkeleton align="left" />
                <ChatMessageSkeleton align="left" />
                <ChatMessageSkeleton align="right" />
                <ChatMessageSkeleton align="right" />
                <ChatMessageSkeleton align="left" />
            </View>

            {/* Input Skeleton */}
            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                <SkeletonPiece style={styles.inputButton} />
                <SkeletonPiece style={styles.inputField} />
                <SkeletonPiece style={styles.inputButton} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 16,
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 12,
    },
    headerTitle: {
        width: 120,
        height: 20,
        borderRadius: 4,
    },
    chatArea: {
        flex: 1,
        padding: 16,
        justifyContent: 'flex-end', // Start from bottom like a chat
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
    inputContainer: {
        padding: 10,
        borderTopWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginHorizontal: 8,
    },
    inputField: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        marginHorizontal: 8,
    },
    skeleton: {
        // backgroundColor handled by theme
    },
});

export default ChatRoomScreenSkeleton;
