import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const SchoolSetupScreenSkeleton = React.memo(() => {
  const { theme } = useTheme(); 
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonBase style={{ width: '80%', height: 26, borderRadius: 4, alignSelf: 'center', marginBottom: 4 }} />
      <SkeletonBase style={{ width: '90%', height: 16, borderRadius: 4, alignSelf: 'center', marginBottom: 24 }} />

      {/* Join Existing School Section */}
      <SkeletonBase style={{ width: '60%', height: 20, borderRadius: 4, marginTop: 16, marginBottom: 8 }} />
      <SkeletonBase style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 15 }} />
      <SkeletonBase style={{ width: '100%', height: 40, borderRadius: 12, marginBottom: 12 }} />

      <View style={[styles.schoolCard, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
        <SkeletonBase style={{ width: '60%', height: 16, borderRadius: 4 }} />
        <SkeletonBase style={{ width: '20%', height: 30, borderRadius: 8 }} />
      </View>
      <View style={[styles.schoolCard, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
        <SkeletonBase style={{ width: '60%', height: 16, borderRadius: 4 }} />
        <SkeletonBase style={{ width: '20%', height: 30, borderRadius: 8 }} />
      </View>

      {/* Sign Out Button */}
      <SkeletonBase style={{ width: '30%', height: 16, borderRadius: 4, alignSelf: 'center', marginTop: 20 }} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 60 },
  schoolCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default SchoolSetupScreenSkeleton;