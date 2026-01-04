import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import CardSkeleton from './CardSkeleton';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';

export { SkeletonPiece };

const CardListSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SkeletonBase style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 10 }} />
        <View style={[styles.hr, { borderBottomColor: theme.colors.cardBorder }]} />
        <FlatList
            data={[1, 2, 3, 4, 5]}
            keyExtractor={(item) => item.toString()}
            renderItem={() => <CardSkeleton />}
        />
    </View>
  );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    hr: {
        borderBottomWidth: 1,
        marginVertical: 10,
    },
});

export default CardListSkeleton;