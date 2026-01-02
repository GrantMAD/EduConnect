import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const ChatMessageSkeleton = ({ align }) => {
    const { theme } = useTheme();
    const isRight = align === 'right';

    return (
        <View style={[
            styles.messageContainer,
            isRight ? styles.rightContainer : styles.leftContainer
        ]}>
            {!isRight && <SkeletonBase style={styles.avatar} backgroundColor={theme.colors.textSecondary} opacityRange={[0.3, 0.7]} />}
            <View style={[
                styles.bubble,
                {
                    backgroundColor: isRight ? theme.colors.primary + '20' : theme.colors.surface,
                    borderBottomRightRadius: isRight ? 0 : 12,
                    borderBottomLeftRadius: isRight ? 12 : 0,
                }
            ]}>
                <SkeletonBase style={{ width: 150, height: 14, borderRadius: 4, marginBottom: 6 }} backgroundColor={theme.colors.textSecondary} opacityRange={[0.3, 0.7]} />
                <SkeletonBase style={{ width: 100, height: 14, borderRadius: 4 }} backgroundColor={theme.colors.textSecondary} opacityRange={[0.3, 0.7]} />
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
});

export default ChatMessagesSkeleton;