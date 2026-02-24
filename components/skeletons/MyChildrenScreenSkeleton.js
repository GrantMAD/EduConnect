import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import SkeletonBase from './SkeletonBase';

// --- Sub-components ---

export const ChildSelectorSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={styles.selectorScroll}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.childBtn, { borderColor: theme.colors.cardBorder }]}>
          <SkeletonBase style={styles.selectorAvatar} />
          <View>
            <SkeletonBase style={{ width: 60, height: 14, borderRadius: 4 }} />
            <SkeletonBase style={{ width: 40, height: 8, borderRadius: 2, marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
});

export const ChildHeroSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={[styles.childHero, { backgroundColor: theme.colors.cardBorder + '30' }]}>
      <SkeletonBase style={styles.heroAvatar} />
      <View style={{ flex: 1 }}>
        <SkeletonBase style={{ width: '70%', height: 24, borderRadius: 6, marginBottom: 8 }} />
        <SkeletonBase style={{ width: '50%', height: 16, borderRadius: 4, marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBase style={{ width: 60, height: 20, borderRadius: 10 }} />
          <SkeletonBase style={{ width: 100, height: 20, borderRadius: 10 }} />
        </View>
      </View>
    </View>
  );
});

export const DashboardStatsSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={styles.statsGrid}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.statItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <SkeletonBase style={styles.statIconBox} />
          <SkeletonBase style={{ width: 30, height: 24, borderRadius: 4, marginBottom: 4 }} />
          <SkeletonBase style={{ width: 50, height: 10, borderRadius: 2 }} />
        </View>
      ))}
    </View>
  );
});

export const ClassCardSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={[styles.clsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.clsCardHeader}>
        <View style={styles.clsIconNameRow}>
          <SkeletonBase style={styles.clsIconBox} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonBase style={{ width: '60%', height: 18, borderRadius: 4 }} />
            <SkeletonBase style={{ width: '40%', height: 14, borderRadius: 4, marginTop: 6 }} />
          </View>
          <SkeletonBase style={styles.avgBadge} />
        </View>
        <View style={[styles.clsFooter, { borderTopColor: theme.colors.cardBorder, borderTopWidth: 1 }]}>
          <View style={{ flexDirection: 'column', gap: 6 }}>
            <SkeletonBase style={{ width: 100, height: 12, borderRadius: 3 }} />
            <SkeletonBase style={{ width: 120, height: 12, borderRadius: 3 }} />
          </View>
          <SkeletonBase style={{ width: 14, height: 14, borderRadius: 7 }} />
        </View>
      </View>
    </View>
  );
});

export const CandidateInfoCardSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={[styles.candidateInfoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.candidateInfoLeft}>
        <SkeletonBase style={styles.candidateAvatarBox} />
        <View style={{ flex: 1 }}>
          <SkeletonBase style={{ width: '60%', height: 18, borderRadius: 4, marginBottom: 6 }} />
          <View style={{ flexDirection: 'row' }}>
            <SkeletonBase style={{ width: 40, height: 12, borderRadius: 3 }} />
            <SkeletonBase style={{ width: 60, height: 12, borderRadius: 3, marginLeft: 12 }} />
          </View>
        </View>
      </View>
      <SkeletonBase style={styles.examCountBadge} />
    </View>
  );
});

export const ExamCardSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={[styles.examCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.examDateBox}>
        <SkeletonBase style={{ width: 25, height: 10, borderRadius: 2, marginBottom: 4 }} />
        <SkeletonBase style={{ width: 30, height: 24, borderRadius: 4 }} />
      </View>
      <View style={styles.examMain}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <SkeletonBase style={{ width: 50, height: 16, borderRadius: 4, marginRight: 8 }} />
          <SkeletonBase style={{ width: 60, height: 14, borderRadius: 3 }} />
        </View>
        <SkeletonBase style={{ width: '80%', height: 18, borderRadius: 4, marginBottom: 16 }} />
        <View style={[styles.examVenueRow, { borderTopColor: theme.colors.cardBorder, borderTopWidth: 1, paddingTop: 8 }]}>
          <SkeletonBase style={{ width: 80, height: 12, borderRadius: 3 }} />
          <SkeletonBase style={{ width: 60, height: 12, borderRadius: 3 }} />
        </View>
      </View>
    </View>
  );
});

// --- Main Exported Skeletons ---

export const PerformanceDashboardSkeleton = React.memo(() => {
  return (
    <View>
      <DashboardStatsSkeleton />
      <SkeletonBase style={{ width: 180, height: 22, borderRadius: 4, marginBottom: 16 }} />
      <ClassCardSkeleton />
      <ClassCardSkeleton />
    </View>
  );
});

export const ExamsDashboardSkeleton = React.memo(() => {
  return (
    <View style={{ gap: 12 }}>
      <CandidateInfoCardSkeleton />
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
        <SkeletonBase style={{ flex: 1, height: 36, borderRadius: 12 }} />
        <SkeletonBase style={{ flex: 1, height: 36, borderRadius: 12 }} />
      </View>
      <ExamCardSkeleton />
      <ExamCardSkeleton />
    </View>
  );
});

const MyChildrenScreenSkeleton = React.memo(() => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ChildSelectorSkeleton />
      <View style={{ padding: 20 }}>
        <ChildHeroSkeleton />
        <PerformanceDashboardSkeleton />
      </View>
    </View>
  );
});

// --- Styles ---

const styles = StyleSheet.create({
  selectorScroll: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 24 },
  childBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 8, paddingRight: 16, borderRadius: 30, borderWidth: 1, marginRight: 12, minWidth: 120 },
  selectorAvatar: { width: 34, height: 34, borderRadius: 17, marginRight: 10 },
  
  childHero: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 32, marginBottom: 24 },
  heroAvatar: { width: 70, height: 70, borderRadius: 24, marginRight: 20 },
  
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statItem: { flex: 1, padding: 16, borderRadius: 24, alignItems: 'center' },
  statIconBox: { width: 32, height: 32, borderRadius: 10, marginBottom: 12 },
  
  clsCard: { borderRadius: 24, marginBottom: 16, overflow: 'hidden' },
  clsCardHeader: { padding: 20 },
  clsIconNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  clsIconBox: { width: 44, height: 44, borderRadius: 14 },
  avgBadge: { width: 45, height: 24, borderRadius: 12 },
  clsFooter: { paddingVertical: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  candidateInfoCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 24, marginBottom: 20, justifyContent: 'space-between' },
  candidateInfoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  candidateAvatarBox: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  examCountBadge: { width: 70, height: 45, borderRadius: 16 },

  examCard: { flexDirection: 'row', borderRadius: 20, overflow: 'hidden', padding: 16, marginBottom: 12 },
  examDateBox: { alignItems: 'center', justifyContent: 'center', width: 50, marginRight: 16 },
  examMain: { flex: 1 },
  examVenueRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, gap: 16 },
});

export default MyChildrenScreenSkeleton;
