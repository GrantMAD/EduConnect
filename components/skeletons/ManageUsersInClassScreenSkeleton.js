import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const ManageUsersInClassScreenSkeleton = () => {
  const { theme } = useTheme(); 
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonBase style={{ width: '70%', height: 22, borderRadius: 4, alignSelf: 'center', marginBottom: 16 }} />
      <SkeletonBase style={{ width: '90%', height: 14, borderRadius: 4, alignSelf: 'center', marginBottom: 20 }} />

      {/* Class Schedule Section */}
      <View style={{ marginBottom: 25 }}>
        <View style={styles.sectionHeader}>
          <SkeletonBase style={{ width: 18, height: 18, borderRadius: 4 }} />
          <SkeletonBase style={{ width: '40%', height: 16, borderRadius: 4, marginLeft: 8 }} />
        </View>
        <SkeletonBase style={{ width: '80%', height: 13, borderRadius: 4, marginBottom: 10, marginLeft: 5 }} />
        <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
            <SkeletonBase style={{ width: '60%', height: 14, borderRadius: 4, marginBottom: 5 }} />
            <SkeletonBase style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 5 }} />
        </View>
      </View>

      {/* Students Section */}
      <View style={{ marginBottom: 25 }}>
        <View style={styles.sectionHeader}>
            <SkeletonBase style={{ width: 18, height: 18, borderRadius: 4 }} />
            <SkeletonBase style={{ width: '50%', height: 16, borderRadius: 4, marginLeft: 8 }} />
        </View>
        <SkeletonBase style={{ width: '80%', height: 13, borderRadius: 4, marginBottom: 10, marginLeft: 5 }} />
        <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
            <View style={styles.cardRow}>
                <SkeletonBase style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
                <View>
                    <SkeletonBase style={{ width: 120, height: 15, borderRadius: 4, marginBottom: 5 }} />
                    <SkeletonBase style={{ width: 180, height: 13, borderRadius: 4 }} />
                </View>
            </View>
        </View>
        <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
            <View style={styles.cardRow}>
                <SkeletonBase style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
                <View>
                    <SkeletonBase style={{ width: 120, height: 15, borderRadius: 4, marginBottom: 5 }} />
                    <SkeletonBase style={{ width: 180, height: 13, borderRadius: 4 }} />
                </View>
            </View>
        </View>
      </View>

      {/* Add Students Section */}
        <View style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
                <SkeletonBase style={{ width: 18, height: 18, borderRadius: 4 }} />
                <SkeletonBase style={{ width: '40%', height: 16, borderRadius: 4, marginLeft: 8 }} />
            </View>
            <SkeletonBase style={{ width: '80%', height: 13, borderRadius: 4, marginBottom: 10, marginLeft: 5 }} />
            <SkeletonBase style={{ width: '100%', height: 40, borderRadius: 10, marginBottom: 8 }} />
            <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
                <View style={styles.cardRow}>
                    <SkeletonBase style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} />
                    <View>
                        <SkeletonBase style={{ width: 120, height: 15, borderRadius: 4, marginBottom: 5 }} />
                        <SkeletonBase style={{ width: 180, height: 13, borderRadius: 4 }} />
                    </View>
                </View>
            </View>
        </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  card: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    elevation: 1,
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardRow: { flexDirection: "row", alignItems: "center" },
});

export default ManageUsersInClassScreenSkeleton;