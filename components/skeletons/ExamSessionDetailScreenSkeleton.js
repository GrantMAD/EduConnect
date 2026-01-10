import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonPiece } from './SkeletonBase';

const PaperCardSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[styles.paperCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <SkeletonPiece style={styles.cardIconBox} />
            <View style={styles.paperInfo}>
                <SkeletonPiece style={{ width: 50, height: 10, borderRadius: 2, marginBottom: 4 }} />
                <SkeletonPiece style={{ width: '70%', height: 15, borderRadius: 4, marginBottom: 6 }} />
                <View style={styles.timeInfo}>
                    <SkeletonPiece style={{ width: 100, height: 12, borderRadius: 4 }} />
                </View>
            </View>
            <SkeletonPiece style={{ width: 30, height: 30, borderRadius: 8 }} />
        </View>
    );
};

const ExamSessionDetailScreenSkeleton = () => {
    return (
        <FlatList
            data={[1, 2, 3, 4, 5, 6]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => <PaperCardSkeleton />}
            contentContainerStyle={{ padding: 20 }}
            scrollEnabled={false}
        />
    );
};

const styles = StyleSheet.create({
    paperCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    cardIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        marginRight: 16,
    },
    paperInfo: {
        flex: 1,
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
});

export default ExamSessionDetailScreenSkeleton;
