import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import CardSkeleton from './CardSkeleton';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const ManagementListSkeleton = () => {
  const { theme } = useTheme(); 
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerContainer}>
            <SkeletonBase style={{ width: '60%', height: 24, borderRadius: 4 }} />
            <SkeletonBase style={{ width: '30%', height: 30, borderRadius: 8 }} />
        </View>
        <SkeletonBase style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 20 }} />
        <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => <CardSkeleton />}
        />
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
});

export default ManagementListSkeleton;