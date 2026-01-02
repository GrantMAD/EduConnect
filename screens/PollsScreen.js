import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faPoll, faClock, faCheckCircle, faInfoCircle, faTrophy, faGift, faInbox } from '@fortawesome/free-solid-svg-icons';
import CardListSkeleton, { SkeletonPiece } from '../components/skeletons/CardListSkeleton';
import CardSkeleton from '../components/skeletons/CardSkeleton';
import PollVoteModal from '../components/PollVoteModal';
import StandardBottomModal from '../components/StandardBottomModal';
import { useGamification } from '../context/GamificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

export default function PollsScreen({ navigation, route }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [isVoteModalVisible, setIsVoteModalVisible] = useState(false);
  const [votingLoading, setVotingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  const tabAnim = useRef(new Animated.Value(0)).current;

  const handleTabPress = (tab) => {
    setActiveTab(tab);
    Animated.timing(tabAnim, {
      toValue: tab === 'active' ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const insets = useSafeAreaInsets();

  const initializeScreen = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(userData?.role);
      }

      await fetchPolls();
    } catch (error) {
      console.error('Error initializing polls screen:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPolls = async () => {
    try {
      const [pollsResult, userVotesResult] = await Promise.all([
        supabase
          .from('polls')
          .select('id, question, options, end_date, created_at, users:created_by(full_name)')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(50),

        userId ? supabase
          .from('poll_votes')
          .select('poll_id, selected_option')
          .eq('user_id', userId)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (pollsResult.error) throw pollsResult.error;

      const pollsWithUserVotes = (pollsResult.data || []).map(poll => ({
        ...poll,
        poll_votes: userVotesResult.data?.filter(v => v.poll_id === poll.id) || []
      }));

      setPolls(pollsWithUserVotes);
    } catch (error) {
      console.error('Error fetching polls:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchPolls();
    setRefreshing(false);
  }, [schoolId, userId]);

  useFocusEffect(
    React.useCallback(() => {
      initializeScreen();
    }, [schoolId])
  );

  const handleVote = async (pollId, option) => {
    setVotingLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase.from('poll_votes').insert([
        { poll_id: pollId, user_id: user.id, selected_option: option },
      ]);

      if (error) throw error;

      awardXP('poll_vote', 5);
      showToast('Vote cast successfully! +5 XP', 'success');
      setIsVoteModalVisible(false);
      initializeScreen();
    } catch (error) {
      console.error('Error voting:', error);
      if (error.code === '23505') {
        showToast('You have already voted on this poll', 'info');
      } else {
        alert('Failed to vote. Please try again.');
      }
    } finally {
      setVotingLoading(false);
    }
  };

  const getFilteredPolls = () => {
    const now = new Date();
    return polls.filter(poll => {
      const endDate = poll.end_date ? new Date(poll.end_date) : null;
      const isExpired = endDate && endDate < now;

      if (activeTab === 'active') {
        return !isExpired;
      } else {
        return isExpired;
      }
    });
  };

  const renderPollCard = (item) => {
    if (loading) return <CardSkeleton />;

    const isExpired = item.end_date ? new Date(item.end_date) < new Date() : false;

    return (
      <PollCard
        item={item}
        userId={userId}
        theme={theme}
        onVotePress={() => {
          setSelectedPoll(item);
          setIsVoteModalVisible(true);
        }}
        isExpired={isExpired}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#4f46e5', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.heroTitle}>Polls</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(true)} style={styles.infoButton}>
                <FontAwesomeIcon icon={faInfoCircle} size={16} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
            <Text style={styles.heroDescription}>
              Participate in school polls and share your opinions.
            </Text>
          </View>
          {(userRole === 'admin' || userRole === 'teacher') && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('CreatePoll')}
            >
              <FontAwesomeIcon icon={faPlus} size={14} color="#4f46e5" />
              <Text style={styles.createButtonText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => handleTabPress('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && { color: theme.colors.primary, fontWeight: 'bold' }, { color: theme.colors.text }]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ended' && styles.activeTab]}
          onPress={() => handleTabPress('ended')}
        >
          <Text style={[styles.tabText, activeTab === 'ended' && { color: theme.colors.primary, fontWeight: 'bold' }, { color: theme.colors.text }]}>Past</Text>
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              backgroundColor: theme.colors.primary,
              left: tabAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '50%']
              })
            }
          ]}
        />
      </View>

      <FlatList
        data={loading ? [1, 2, 3] : getFilteredPolls()}
        keyExtractor={(item, index) => loading ? index.toString() : item.id.toString()}
        contentContainerStyle={{ paddingBottom: 80 + insets.bottom, paddingTop: 10, paddingHorizontal: 16 }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        renderItem={({ item }) => renderPollCard(item)}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <FontAwesomeIcon icon={faInbox} size={48} color={theme.colors.placeholder} />
              <Text style={[styles.emptyStateText, { color: theme.colors.text }]}>
                {activeTab === 'active' ? 'No active polls at the moment.' : 'No past polls found.'}
              </Text>
            </View>
          )
        }
      />

      {selectedPoll && (
        <PollVoteModal
          visible={isVoteModalVisible}
          onClose={() => setIsVoteModalVisible(false)}
          poll={selectedPoll}
          onVote={handleVote}
          description={selectedPoll.question}
          loading={votingLoading}
        />
      )}

      <StandardBottomModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
        title="About Polls"
        icon={faInfoCircle}
      >
        <View>
          <Text style={styles.modalText}>
            Make your voice heard! Here's how polls work:
          </Text>
          <Text style={styles.bulletPoint}>• <Text style={{ fontWeight: 'bold' }}>Vote:</Text> Participate in active polls to share your opinion.</Text>
          <Text style={styles.bulletPoint}>• <Text style={{ fontWeight: 'bold' }}>Earn XP:</Text> Get +5 XP for every poll you vote in!</Text>
          <Text style={styles.bulletPoint}>• <Text style={{ fontWeight: 'bold' }}>Results:</Text> See what others think once you've voted or when the poll ends.</Text>
        </View>
      </StandardBottomModal>
    </View>
  );
}

function PollCard({ item, userId, theme, onVotePress, isExpired }) {
  const [votes, setVotes] = useState([]);
  const [loadingVotes, setLoadingVotes] = useState(true);

  useEffect(() => {
    fetchVotes();
  }, [item.id]);

  const fetchVotes = async () => {
    const { data, error } = await supabase
      .from('poll_votes')
      .select('user_id, selected_option')
      .eq('poll_id', item.id);

    if (!error && data) {
      setVotes(data);
    }
    setLoadingVotes(false);
  };

  const userVote = votes.find(v => v.user_id === userId);
  const totalVotes = votes.length;

  let winningOption = null;
  let maxVotes = -1;

  if (isExpired && totalVotes > 0) {
    const counts = {};
    item.options.forEach(opt => counts[opt] = 0);
    votes.forEach(v => {
      if (counts[v.selected_option] !== undefined) counts[v.selected_option]++;
    });

    Object.keys(counts).forEach(opt => {
      if (counts[opt] > maxVotes) {
        maxVotes = counts[opt];
        winningOption = opt;
      }
    });
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.border }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <FontAwesomeIcon icon={faPoll} size={16} color={theme.colors.primary} />
              <Text style={[styles.cardMeta, { color: theme.colors.text, marginLeft: 6 }]}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.question}</Text>
            <Text style={[styles.authorText, { color: theme.colors.placeholder, marginBottom: 4 }]}>by {item.users?.full_name || 'Unknown'}</Text>
            {item.end_date && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesomeIcon icon={faClock} size={12} color={isExpired ? theme.colors.error : theme.colors.placeholder} />
                <Text style={[styles.endDateText, { color: isExpired ? theme.colors.error : theme.colors.placeholder, marginLeft: 4 }]}>
                  {isExpired ? 'Ended' : 'Ends'} {new Date(item.end_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {!userVote && !isExpired && (
            <View style={styles.xpBadge}>
              <FontAwesomeIcon icon={faGift} size={12} color="#fff" />
              <Text style={styles.xpText}>+5 XP</Text>
            </View>
          )}
        </View>

        {userVote && (
          <View style={[styles.votedCard, { backgroundColor: theme.colors.success + '15', borderColor: theme.colors.success + '40' }]}>
            <FontAwesomeIcon icon={faCheckCircle} size={16} color={theme.colors.success} />
            <Text style={[styles.votedText, { color: theme.colors.success }]}>You have already voted</Text>
          </View>
        )}

        {userVote || isExpired ? (
          <View style={styles.resultsContainer}>
            {item.options.map((option, idx) => {
              const optionVotes = votes.filter(v => v.selected_option === option).length;
              const percentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
              const isWinner = isExpired && option === winningOption;
              const isSelected = userVote?.selected_option === option;

              return (
                <View key={idx} style={styles.resultItem}>
                  <View style={styles.resultLabelContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.resultLabel, { color: theme.colors.text, fontWeight: isSelected || isWinner ? 'bold' : 'normal' }]}>
                        {option}
                      </Text>
                      {isWinner && <FontAwesomeIcon icon={faTrophy} size={14} color="#FFD700" style={{ marginLeft: 6 }} />}
                      {isSelected && <FontAwesomeIcon icon={faCheckCircle} size={14} color={theme.colors.success} style={{ marginLeft: 6 }} />}
                    </View>
                    <Text style={[styles.resultPercentage, { color: theme.colors.text }]}>{`${percentage.toFixed(0)}%`}</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: isWinner ? '#FFD700' : (isSelected ? theme.colors.success : theme.colors.primary)
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.voteCountText}>{optionVotes} votes</Text>
                </View>
              );
            })}
            <Text style={styles.totalVotesText}>{totalVotes} total votes</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.voteButton, { backgroundColor: theme.colors.primary }]}
            onPress={onVotePress}
          >
            <Text style={styles.voteButtonText}>Vote Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: {
    padding: 20,
    marginBottom: 0,
    elevation: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
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
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroDescription: {
    color: '#e0e7ff',
    fontSize: 14,
  },
  infoButton: { padding: 5, marginLeft: 5 },

  createButton: {
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
  createButtonText: { color: '#4f46e5', fontWeight: 'bold', marginLeft: 6, fontSize: 14 },

  tabContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    marginHorizontal: 16,
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    position: 'relative'
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  activeTab: {},
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    width: '50%',
  },
  tabText: { fontSize: 16 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyStateText: { marginTop: 16, fontSize: 16, color: '#888' },

  // Card Styles
  card: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    elevation: 0, // Zero elevation
  },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardMeta: { fontSize: 12 },
  endDateText: { fontSize: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  authorText: { fontSize: 12 },

  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  xpText: { color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },

  votedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  votedText: {
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },

  voteButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8
  },
  voteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  resultsContainer: { marginTop: 8 },
  resultItem: { marginBottom: 12 },
  resultLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resultLabel: { fontSize: 14 },
  resultPercentage: { fontSize: 14, fontWeight: 'bold' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  voteCountText: { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'right' },
  totalVotesText: { fontSize: 12, color: '#666', marginTop: 8, textAlign: 'center', fontStyle: 'italic' },

  modalText: { fontSize: 16, color: '#333', marginBottom: 10 },
  bulletPoint: { fontSize: 15, color: '#555', marginBottom: 8, marginLeft: 10 },
});
