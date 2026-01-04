import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const SchoolDataScreenSkeleton = React.memo(() => {
  const { theme } = useTheme(); 
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonBase style={{ width: '60%', height: 24, borderRadius: 4, marginBottom: 10 }} />
      <SkeletonBase style={{ width: '90%', height: 16, borderRadius: 4, marginBottom: 20 }} />

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <SkeletonBase style={{ width: 20, height: 20, borderRadius: 4, marginRight: 10 }} />
          <SkeletonBase style={{ width: '40%', height: 20, borderRadius: 4 }} />
        </View>
        <SkeletonBase style={{ width: '80%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <SkeletonBase style={[styles.logoPlaceholder, { backgroundColor: theme.colors.cardBorder }]} />
        <SkeletonBase style={{ width: '50%', height: 14, borderRadius: 4, alignSelf: 'center' }} />
      </View>

      <SkeletonBase style={{ width: '100%', height: 40, borderRadius: 8, marginTop: 20 }} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  logoPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 16,
  },
});

export default SchoolDataScreenSkeleton;