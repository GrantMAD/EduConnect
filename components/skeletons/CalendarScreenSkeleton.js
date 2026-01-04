import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';
import { useTheme } from '../../context/ThemeContext';

export { SkeletonPiece };

const CalendarScreenSkeleton = React.memo(() => {
  const { theme } = useTheme(); 
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
      <SkeletonBase style={{ width: '60%', height: 24, borderRadius: 4, marginBottom: 5 }} />
      <SkeletonBase style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 15 }} />

      <SkeletonBase style={{ width: '100%', height: 370, borderRadius: 10, marginBottom: 20 }} />

      <SkeletonBase style={{ width: '50%', height: 20, borderRadius: 4, marginBottom: 5 }} />
      <View style={styles.dropdownContainer}>
        <SkeletonBase style={{ width: '100%', height: 50, borderRadius: 10 }} />
      </View>
      <View style={styles.dropdownContainer}>
        <SkeletonBase style={{ width: '100%', height: 50, borderRadius: 10 }} />
      </View>

      <SkeletonBase style={{ width: '40%', height: 20, borderRadius: 4, marginTop: 20, marginBottom: 5 }} />
      <View style={styles.dropdownContainer}>
        <SkeletonBase style={{ width: '100%', height: 50, borderRadius: 10 }} />
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  dropdownContainer: { marginBottom: 15 },
});

export default CalendarScreenSkeleton;