import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonPiece } from './SkeletonBase';

const ExamSessionCardSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <SkeletonPiece style={styles.cardIconBox} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <SkeletonPiece style={{ width: '60%', height: 16, borderRadius: 4 }} />
                    <SkeletonPiece style={{ width: 50, height: 14, borderRadius: 6 }} />
                </View>
                <SkeletonPiece style={{ width: '40%', height: 12, borderRadius: 4, marginTop: 8, marginBottom: 8 }} />
                <SkeletonPiece style={{ width: '30%', height: 18, borderRadius: 6, marginBottom: 12 }} />
                
                <View style={styles.cardFooter}>
                    <View style={styles.statsContainer}>
                        <SkeletonPiece style={{ width: 60, height: 14, borderRadius: 4 }} />
                        <SkeletonPiece style={{ width: 60, height: 14, borderRadius: 4 }} />
                    </View>
                    <SkeletonPiece style={{ width: 24, height: 24, borderRadius: 6 }} />
                </View>
            </View>
        </View>
    );
};

const ExamManagementScreenSkeleton = () => {
    return (
        <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => <ExamSessionCardSkeleton />}
            contentContainerStyle={{ padding: 20 }}
            scrollEnabled={false}
        />
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
});

export default ExamManagementScreenSkeleton;
