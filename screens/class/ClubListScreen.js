import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Dimensions } from 'react-native';
import { useSchool } from '../../context/SchoolContext';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUsers, faUsersCog, faPlus, faChevronRight, faFootballBall, faDoorOpen, faSpinner, faArrowLeft, faChess } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import { SkeletonPiece } from '../../components/skeletons/DashboardScreenSkeleton';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../../services/authService';
import { getUserProfile } from '../../services/userService';
import { fetchUserMemberships, fetchClubsBySchool } from '../../services/classService';
import { sendNotification } from '../../services/notificationService';

const { width } = Dimensions.get('window');

const ClubCard = React.memo(({ item, theme, navigation, activeTab, handleJoinRequest, applyingId }) => (
  <TouchableOpacity
    style={[styles.clubCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
    onPress={() => activeTab === 'my-clubs' ? navigation.navigate('ClubDetail', { clubId: item.id }) : null}
    activeOpacity={activeTab === 'my-clubs' ? 0.7 : 1}
  >
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: '#AF52DE15' }]}>
        <FontAwesomeIcon icon={faFootballBall} size={20} color="#AF52DE" />
      </View>
      <View style={styles.headerInfo}>
        <Text style={[styles.clubName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.coordinatorName, { color: theme.colors.placeholder }]} numberOfLines={1}>
          Coordinator: {item.teacher?.full_name || 'Assigning...'}
        </Text>
      </View>
      {activeTab === 'my-clubs' && (
        <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.cardBorder} />
      )}
    </View>

    <View style={[styles.cardDivider, { backgroundColor: theme.colors.cardBorder, opacity: 0.3 }]} />

    {activeTab === 'my-clubs' ? (
      <View style={styles.cardFooter}>
        <View style={[styles.memberBadge, { backgroundColor: '#AF52DE10' }]}>
          <FontAwesomeIcon icon={faUsers} size={10} color="#AF52DE" style={{ marginRight: 6 }} />
          <Text style={[styles.badgeText, { color: '#AF52DE' }]}>ACTIVE MEMBER</Text>
        </View>
        <Text style={[styles.viewDetails, { color: '#AF52DE' }]}>ENTER HUB</Text>
      </View>
    ) : (
      <TouchableOpacity
        style={[styles.joinButton, { backgroundColor: '#AF52DE' }]}
        onPress={() => handleJoinRequest(item)}
        disabled={applyingId === item.id}
        activeOpacity={0.8}
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
));

const ClubListScreen = ({ navigation }) => {
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

  const fetchData = useCallback(async () => {
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;

      const profile = await getUserProfile(authUser.id);
      setUserProfile(profile);

      const memberships = await fetchUserMemberships(authUser.id);
      const myIds = new Set(memberships?.map(m => m.class_id) || []);
      setUserClubIds(myIds);

      const data = await fetchClubsBySchool(schoolId);
      setClubs(data || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
      showToast('Failed to load clubs.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, showToast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleJoinRequest = useCallback(async (club) => {
    if (!userProfile) return;
    setApplyingId(club.id);
    try {
      if (userClubIds.has(club.id)) return;

      await sendNotification({
        user_id: club.teacher_id,
        type: 'club_join_request',
        title: 'Club Join Request',
        message: `${userProfile.full_name} wants to join ${club.name}`,
        related_user_id: userProfile.id,
        is_read: false
      });

      showToast('Join request sent to club coordinator!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to send join request.', 'error');
    } finally {
      setApplyingId(null);
    }
  }, [userProfile, userClubIds, showToast]);

  const isAdmin = useMemo(() => userProfile?.role === 'admin', [userProfile]);
  
  const { myClubs, availableClubs } = useMemo(() => {
    return {
        myClubs: clubs.filter(c => isAdmin || userClubIds.has(c.id) || c.teacher_id === userProfile?.id),
        availableClubs: clubs.filter(c => !isAdmin && !userClubIds.has(c.id) && c.teacher_id !== userProfile?.id)
    };
  }, [clubs, isAdmin, userClubIds, userProfile]);

  const currentClubs = useMemo(() => activeTab === 'my-clubs' ? myClubs : availableClubs, [activeTab, myClubs, availableClubs]);

  const renderClubCard = useCallback(({ item }) => (
    <ClubCard 
      item={item} 
      theme={theme} 
      navigation={navigation} 
      activeTab={activeTab} 
      handleJoinRequest={handleJoinRequest} 
      applyingId={applyingId} 
    />
  ), [theme, activeTab, navigation, applyingId, handleJoinRequest]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#9333ea', '#4f46e5']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.heroTitle}>Clubs & Teams</Text>
                </View>
                <Text style={styles.heroDescription}>
                    Explore extracurricular activities and join your community.
                </Text>
            </View>
            {['admin', 'teacher'].includes(userProfile?.role) && (
                <TouchableOpacity
                    style={styles.heroButton}
                    onPress={() => navigation.navigate('CreateClub')}
                >
                    <FontAwesomeIcon icon={faPlus} size={14} color="#9333ea" />
                    <Text style={styles.heroButtonText}>New</Text>
                </TouchableOpacity>
            )}
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('my-clubs')}
          style={[styles.tab, activeTab === 'my-clubs' && { backgroundColor: theme.colors.card }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'my-clubs' ? '#AF52DE' : theme.colors.placeholder }]}>
            {isAdmin ? 'All Clubs' : 'My Clubs'} ({myClubs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('browse')}
          style={[styles.tab, activeTab === 'browse' && { backgroundColor: theme.colors.card }]}
        >
          <Text style={[styles.tabText, { color: activeTab === 'browse' ? '#AF52DE' : theme.colors.placeholder }]}>
            {isAdmin ? 'Discovery' : 'Browse'} ({availableClubs.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading ? [1, 2, 3, 4] : currentClubs}
        keyExtractor={(item, index) => loading ? `skeleton-${index}` : item.id}
        renderItem={({ item }) => loading ? (
          <View style={{ paddingHorizontal: 20 }}><CardSkeleton /></View>
        ) : renderClubCard({ item })}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AF52DE" />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <FontAwesomeIcon icon={activeTab === 'my-clubs' ? faDoorOpen : faChess} size={48} color={theme.colors.placeholder} style={{ opacity: 0.2, marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: theme.colors.text }]}>
                {activeTab === 'my-clubs' ? "You haven't joined any clubs yet." : "No other clubs found."}
              </Text>
              {activeTab === 'my-clubs' && (
                <TouchableOpacity onPress={() => setActiveTab('browse')} style={styles.exploreButton}>
                  <Text style={{ color: '#AF52DE', fontWeight: '900', textTransform: 'uppercase', fontSize: 12 }}>Explore Clubs</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    </View>
  );
}

export default React.memo(ClubListScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    padding: 24,
    paddingTop: 40,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  heroTextContainer: {
      flex: 1,
      paddingRight: 10,
  },
  heroTitle: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '900',
      marginBottom: 8,
      letterSpacing: -1,
  },
  heroDescription: {
      color: '#f5f3ff',
      fontSize: 14,
      fontWeight: '500',
  },
  heroButton: {
      backgroundColor: '#fff',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
  },
  heroButtonText: {
      color: '#9333ea',
      fontWeight: 'bold',
      marginLeft: 6,
      fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 20,
    overflow: 'hidden',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  clubCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  clubName: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  coordinatorName: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  viewDetails: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  exploreButton: {
    marginTop: 20,
    padding: 12,
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
});