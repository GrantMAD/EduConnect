import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const ProfileScreenSkeleton = () => {
  const { theme } = useTheme(); 
  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
      <SkeletonBase style={[styles.avatar, { borderColor: theme.colors.cardBorder }]} />
      <SkeletonBase style={{ width: '60%', height: 32, borderRadius: 4, marginBottom: 12 }} />
      <SkeletonBase style={{ width: '40%', height: 16, borderRadius: 4, marginBottom: 32 }} />

      {/* Card 1: User Information */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
        <View style={styles.cardHeader}>
          <SkeletonBase style={{ width: 24, height: 24, borderRadius: 8, marginRight: 12 }} />
          <SkeletonBase style={{ width: '50%', height: 20, borderRadius: 4 }} />
        </View>
        <SkeletonBase style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 20 }} />

        {[1, 2, 3].map(i => (
            <View key={i} style={styles.infoContainer}>
                <SkeletonBase style={{ width: '30%', height: 10, borderRadius: 4, marginBottom: 8 }} />
                <SkeletonBase style={{ width: '80%', height: 16, borderRadius: 4 }} />
            </View>
        ))}
        <SkeletonBase style={{ width: '100%', height: 56, borderRadius: 16, marginTop: 16 }} />
      </View>

      {/* Card 2: Associated Data */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
        <View style={styles.cardHeader}>
          <SkeletonBase style={{ width: 24, height: 24, borderRadius: 8, marginRight: 12 }} />
          <SkeletonBase style={{ width: '50%', height: 20, borderRadius: 4 }} />
        </View>
        
        <View style={styles.childItem}>
            <SkeletonBase style={{ width: 44, height: 44, borderRadius: 12, marginRight: 12 }} />
            <View>
                <SkeletonBase style={{ width: 120, height: 16, borderRadius: 4, marginBottom: 6 }} />
                <SkeletonBase style={{ width: 180, height: 12, borderRadius: 4 }} />
            </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, alignItems: 'center' },
  avatar: { width: 112, height: 112, borderRadius: 36, borderWidth: 1, marginBottom: 24 },
  card: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContainer: { width: '100%', marginBottom: 24 },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
});

export default ProfileScreenSkeleton;