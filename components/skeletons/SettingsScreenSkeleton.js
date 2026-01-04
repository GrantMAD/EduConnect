import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase, { SkeletonPiece } from './SkeletonBase';

export { SkeletonPiece };

const SettingsScreenSkeleton = React.memo(() => {
  const { theme } = useTheme(); 
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SkeletonBase style={{ width: '50%', height: 32, borderRadius: 4, marginBottom: 8 }} />
      <SkeletonBase style={{ width: '80%', height: 16, borderRadius: 4, marginBottom: 32 }} />

      <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
      <View style={styles.section}>
        <SkeletonBase style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonBase style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <View style={styles.button}>
          <SkeletonBase style={{ width: 18, height: 18, borderRadius: 4 }} />
          <View>
            <SkeletonBase style={{ width: 100, height: 16, borderRadius: 4, marginLeft: 15 }} />
            <SkeletonBase style={{ width: 150, height: 12, borderRadius: 4, marginLeft: 15, marginTop: 5 }} />
          </View>
        </View>
      </View>

      <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
      <View style={styles.section}>
        <SkeletonBase style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonBase style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <View style={styles.button}>
          <SkeletonBase style={{ width: 18, height: 18, borderRadius: 4 }} />
          <View>
            <SkeletonBase style={{ width: 100, height: 16, borderRadius: 4, marginLeft: 15 }} />
            <SkeletonBase style={{ width: 150, height: 12, borderRadius: 4, marginLeft: 15, marginTop: 5 }} />
          </View>
        </View>
      </View>

      <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
      <View style={styles.section}>
        <SkeletonBase style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 8 }} />
        <SkeletonBase style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 16 }} />
        <View style={styles.button}>
          <SkeletonBase style={{ width: 18, height: 18, borderRadius: 4 }} />
          <View>
            <SkeletonBase style={{ width: 100, height: 16, borderRadius: 4, marginLeft: 15 }} />
            <SkeletonBase style={{ width: 150, height: 12, borderRadius: 4, marginLeft: 15, marginTop: 5 }} />
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  separator: {
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SettingsScreenSkeleton;