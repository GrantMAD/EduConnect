import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../context/SchoolContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUsers, faUsersCog, faPlus, faChevronRight, faFootballBall, faDoorOpen, faSpinner, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import { SkeletonPiece } from '../../components/skeletons/DashboardScreenSkeleton';

export default function ClubListScreen({ navigation }) {
  const { theme } = useTheme();
  const { schoolId } = useSchool();
  const { showToast } = useToast();
  
  const [clubs, setClubs] = useState([]);
  const [userClubIds, setUserClubIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('my-clubs'); // 'my-clubs' | 'browse'
  const [userProfile, setUserProfile] = useState(null);
  const [applyingId, setApplyingId] = useState(null);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUserProfile(profile);

      // 1. Fetch User's Memberships
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);
      
      const myIds = new Set(memberships?.map(m => m.class_id) || []);
      setUserClubIds(myIds);

      // 2. Fetch All Extracurricular Clubs in the school
      const { data, error } = await supabase
        .from('classes')
        .select('*, teacher:users(email, full_name)')
        .eq('subject', 'Extracurricular')
        .eq('school_id', schoolId);

      if (error) throw error;
      setClubs(data || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      showToast('Failed to load clubs.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [schoolId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleJoinRequest = async (club) => {
    setApplyingId(club.id);
    try {
      if (userClubIds.has(club.id)) return;

      const { error } = await supabase.from('notifications').insert({
        user_id: club.teacher_id,
        type: 'club_join_request',
        title: 'Club Join Request',
        message: `${userProfile.full_name} wants to join ${club.name}`,
        related_user_id: userProfile.id,
        is_read: false
      });

      if (error) throw error;
      showToast('Join request sent to club coordinator!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to send join request.', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const myClubs = clubs.filter(c => isAdmin || userClubIds.has(c.id) || c.teacher_id === userProfile?.id);
  const availableClubs = clubs.filter(c => !isAdmin && !userClubIds.has(c.id) && c.teacher_id !== userProfile?.id);

  const currentClubs = activeTab === 'my-clubs' ? myClubs : availableClubs;

  const renderClubCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.clubCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
      onPress={() => activeTab === 'my-clubs' ? navigation.navigate('ClubDetail', { clubId: item.id }) : null}
      activeOpacity={activeTab === 'my-clubs' ? 0.7 : 1}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#AF52DE20' }]}>
          <FontAwesomeIcon icon={faFootballBall} size={20} color="#AF52DE" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.clubName, { color: theme.colors.text }]}>{item.name}</Text>
          <Text style={[styles.coordinatorName, { color: theme.colors.placeholder }]}>
            Coord: {item.teacher?.full_name || 'Assigning...'}
          </Text>
        </View>
        {activeTab === 'my-clubs' && (
          <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.colors.placeholder} />
        )}
      </View>

      <View style={styles.cardDivider} />

      {activeTab === 'my-clubs' ? (
        <View style={styles.cardFooter}>
          <View style={styles.memberBadge}>
            <FontAwesomeIcon icon={faUsers} size={12} color="#AF52DE" style={{ marginRight: 6 }} />
            <Text style={[styles.badgeText, { color: '#AF52DE' }]}>Member</Text>
          </View>
          <Text style={[styles.viewDetails, { color: theme.colors.primary }]}>Enter Hub</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.joinButton, { backgroundColor: '#AF52DE' }]}
          onPress={() => handleJoinRequest(item)}
          disabled={applyingId === item.id}
        >
          {applyingId === item.id ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <FontAwesomeIcon icon={faPlus} size={14} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.joinButtonText}>Request to Join</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <FontAwesomeIcon icon={faArrowLeft} size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Clubs & Teams</Text>
        {['admin', 'teacher'].includes(userProfile?.role) && (
          <TouchableOpacity 
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('CreateClub')}
          >
            <FontAwesomeIcon icon={faPlus} size={14} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('my-clubs')}
          style={[styles.tab, activeTab === 'my-clubs' && { backgroundColor: theme.colors.card, borderBottomWidth: 2, borderBottomColor: '#AF52DE' }]}
        >
          {loading && !clubs.length ? (
            <SkeletonPiece style={{ width: 80, height: 14, borderRadius: 4 }} />
          ) : (
            <Text style={[styles.tabText, { color: activeTab === 'my-clubs' ? '#AF52DE' : theme.colors.placeholder }]}>
              {isAdmin ? 'All Clubs' : 'My Clubs'} ({myClubs.length})
            </Text>
          )}
        </TouchableOpacity>
        {!isAdmin && (
          <TouchableOpacity
            onPress={() => setActiveTab('browse')}
            style={[styles.tab, activeTab === 'browse' && { backgroundColor: theme.colors.card, borderBottomWidth: 2, borderBottomColor: '#AF52DE' }]}
          >
            {loading && !clubs.length ? (
              <SkeletonPiece style={{ width: 80, height: 14, borderRadius: 4 }} />
            ) : (
              <Text style={[styles.tabText, { color: activeTab === 'browse' ? '#AF52DE' : theme.colors.placeholder }]}>
                Browse ({availableClubs.length})
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={loading ? [1, 2, 3, 4] : currentClubs}
        keyExtractor={(item, index) => loading ? `skeleton-${index}` : item.id}
        renderItem={({ item }) => loading ? (
          <View style={[styles.clubCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.cardHeader}>
              <SkeletonPiece style={[styles.iconContainer, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.headerInfo}>
                <SkeletonPiece style={{ width: '60%', height: 16, borderRadius: 4, marginBottom: 6 }} />
                <SkeletonPiece style={{ width: '40%', height: 12, borderRadius: 4 }} />
              </View>
            </View>
            <View style={styles.cardDivider} />
            <SkeletonPiece style={{ width: '100%', height: 36, borderRadius: 10 }} />
          </View>
        ) : renderClubCard({ item })}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AF52DE" />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <FontAwesomeIcon icon={activeTab === 'my-clubs' ? faDoorOpen : faUsers} size={48} color={theme.colors.placeholder} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                {activeTab === 'my-clubs' ? "You haven't joined any clubs yet." : "No other clubs found."}
              </Text>
              {activeTab === 'my-clubs' && !isAdmin && (
                <TouchableOpacity onPress={() => setActiveTab('browse')} style={styles.exploreButton}>
                  <Text style={{ color: '#AF52DE', fontWeight: 'bold' }}>Explore Clubs</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  clubCard: {
    borderRadius: 12,
    borderWidth: 0.2,
    padding: 16,
    marginBottom: 12,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  coordinatorName: {
    fontSize: 12,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#AF52DE10',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  viewDetails: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  exploreButton: {
    marginTop: 16,
    padding: 10,
  },
});
