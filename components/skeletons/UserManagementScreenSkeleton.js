import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

export const UserItemSkeleton = React.memo(() => {
    const { theme } = useTheme(); 
    return (
        <View style={[styles.userItem, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <SkeletonBase style={[styles.avatar, { borderColor: theme.colors.cardBorder }]} />
            <View style={styles.userInfo}>
                <SkeletonBase style={{ width: '70%', height: 16, borderRadius: 4, marginBottom: 5 }} />
                <SkeletonBase style={{ width: '50%', height: 14, borderRadius: 4 }} />
            </View>
        </View>
    );
});

const UserManagementScreenSkeleton = React.memo(() => {
  const { theme } = useTheme(); 
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonBase style={{ width: '60%', height: 32, borderRadius: 4, marginBottom: 8 }} />
      <SkeletonBase style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 24 }} />
      <SkeletonBase style={{ width: '100%', height: 40, borderRadius: 8, marginBottom: 16 }} />
      <FlatList
        data={[1, 2, 3, 4, 5]}
        keyExtractor={(item) => item.toString()}
        renderItem={() => <UserItemSkeleton />}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  userItem: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
});

export default UserManagementScreenSkeleton;