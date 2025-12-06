import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import Animated,
{
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

const SkeletonPiece = ({ style }) => {
    const progress = useSharedValue(0);
    const { theme } = useTheme();

    React.useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 1000 + Math.random() * 300 }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(progress.value, [0, 1], [0.3, 0.7]);
        return { opacity };
    });

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: theme.dark
                        ? 'rgba(255,255,255,0.12)'
                        : 'rgba(0,0,0,0.08)',
                },
                styles.skeleton,
                animatedStyle,
                style,
            ]}
        />
    );
};

export const ChatListItemSkeleton = () => {
    const { theme } = useTheme();

    /** Fade-in animation */
    const fade = useSharedValue(0);

    React.useEffect(() => {
        fade.value = withTiming(1, { duration: 350 });
    }, []);

    const fadeStyle = useAnimatedStyle(() => ({
        opacity: fade.value,
        transform: [
            {
                translateY: interpolate(fade.value, [0, 1], [8, 0]),
            },
        ],
    }));

    return (
        <Animated.View
            style={[
                styles.itemContainer,
                fadeStyle,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.dark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.05)',
                },
            ]}
        >
            {/* Avatar Container */}
            <View
                style={[
                    styles.iconContainer,
                    { backgroundColor: theme.colors.primary + '20' },
                ]}
            >
                <SkeletonPiece style={styles.avatar} />
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>

                {/* Header */}
                <View style={styles.headerRow}>
                    <SkeletonPiece style={styles.name} />

                    <View style={styles.rightHeader}>
                        <SkeletonPiece style={styles.newBadge} />
                        <SkeletonPiece style={styles.time} />
                    </View>
                </View>

                {/* Message lines */}
                <SkeletonPiece style={styles.message} />
                <SkeletonPiece style={styles.messageLine2} />
            </View>
        </Animated.View>
    );
};

const ChatListScreenSkeleton = () => {
    const { theme } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.dark
                        ? theme.colors.background
                        : '#F5F5F5',
                },
            ]}
        >
            {/* Header */}
            <View style={styles.screenHeader}>
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

    /* Screen Header */
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 10,
    },
    headerIcon: {
        width: 26,
        height: 26,
        borderRadius: 13,
        marginRight: 10,
    },
    headerTitle: {
        width: 180,
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

    /* Skeleton Card */
    itemContainer: {
        flexDirection: 'row',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        alignItems: 'center',
        borderWidth: 1,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },

    /* Avatar */
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },

    contentContainer: {
        flex: 1,
    },

    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },

    name: {
        width: '50%',
        height: 16,
        borderRadius: 4,
    },

    rightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    newBadge: {
        width: 35,
        height: 14,
        borderRadius: 4,
        marginRight: 6,
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
        marginBottom: 6,
    },
    messageLine2: {
        width: '60%',
        height: 14,
        borderRadius: 4,
    },

    skeleton: {
        overflow: 'hidden',
    },
});

export default ChatListScreenSkeleton;
