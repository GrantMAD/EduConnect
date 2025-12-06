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

export const ChatListItemSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[
            styles.itemContainer,
            {
                backgroundColor: theme.colors.surface,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                elevation: 3
            }
        ]}>
            <SkeletonPiece style={styles.avatar} />
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <SkeletonPiece style={styles.name} />
                    <SkeletonPiece style={styles.time} />
                </View>
                <SkeletonPiece style={styles.message} />
            </View>
        </View>
    );
};

const ChatListScreenSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[styles.container, { backgroundColor: theme.dark ? theme.colors.background : '#F5F5F5' }]}>
            <View style={styles.header}>
                <SkeletonPiece style={styles.headerIcon} />
                <SkeletonPiece style={styles.headerTitle} />
            </View>
            <SkeletonPiece style={styles.headerSubtitle} />

            <FlatList
                data={[1, 2, 3, 4, 5, 6, 7, 8]}
                keyExtractor={(item) => item.toString()}
                renderItem={() => <ChatListItemSkeleton />}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 10,
    },
    headerIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        marginRight: 10,
    },
    headerTitle: {
        width: 150,
        height: 28,
        borderRadius: 4,
    },
    headerSubtitle: {
        width: 200,
        height: 16,
        borderRadius: 4,
        marginBottom: 20,
    },
    listContent: {
        paddingBottom: 20,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        alignItems: 'center',
        elevation: 2, // Slightly lower elevation for skeleton
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    name: {
        width: '50%',
        height: 16,
        borderRadius: 4,
    },
    time: {
        width: 40,
        height: 12,
        borderRadius: 4,
    },
    message: {
        width: '80%',
        height: 14,
        borderRadius: 4,
    },
    skeleton: {
        // backgroundColor handled by theme and inline style
    },
});

export default ChatListScreenSkeleton;
