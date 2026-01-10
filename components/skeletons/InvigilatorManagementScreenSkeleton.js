import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonPiece } from './SkeletonBase';

const InvigilatorPaperCardSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <SkeletonPiece style={styles.iconBox} />
            <View style={styles.cardContent}>
                <SkeletonPiece style={{ width: '60%', height: 16, borderRadius: 4, marginBottom: 4 }} />
                <SkeletonPiece style={{ width: '40%', height: 12, borderRadius: 4, marginBottom: 8 }} />
                <SkeletonPiece style={{ width: 80, height: 18, borderRadius: 6 }} />
            </View>
            <SkeletonPiece style={{ width: 12, height: 12, borderRadius: 6 }} />
        </View>
    );
};

const InvigilatorManagementScreenSkeleton = () => {
    return (
        <FlatList
            data={[1, 2, 3, 4, 5, 6]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => <InvigilatorPaperCardSkeleton />}
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
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
    },
});

export default InvigilatorManagementScreenSkeleton;
