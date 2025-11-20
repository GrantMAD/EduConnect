import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Animated } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faPoll, faClock, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import CardListSkeleton from '../components/skeletons/CardListSkeleton';
import PollVoteModal from '../components/PollVoteModal';

import { useGamification } from '../context/GamificationContext';

export default function PollsScreen({ navigation, route }) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [isVoteModalVisible, setIsVoteModalVisible] = useState(false);
  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};

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
      // Fetch polls and user's votes separately for better performance
      const [pollsResult, userVotesResult] = await Promise.all([
        supabase
          .from('polls')
          .select('id, question, options, end_date, created_at, users:created_by(full_name)')
          .eq('school_id', schoolId)
          .order('created_at', { ascending: false })
          .limit(50),  // Pagination: Load first 50 polls

        // Only fetch current user's votes, not all votes
        userId ? supabase
          .from('poll_votes')
          .select('poll_id, selected_option')
          .eq('user_id', userId)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (pollsResult.error) throw pollsResult.error;

      // Merge user votes into polls data
      const pollsWithUserVotes = (pollsResult.data || []).map(poll => ({
        ...poll,
        poll_votes: userVotesResult.data?.filter(v => v.poll_id === poll.id) || []
      }));

      setPolls(pollsWithUserVotes);
    } catch (error) {
      console.error('Error fetching polls:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      initializeScreen();
    }, [schoolId])
  );

  const handleVote = async (pollId, option) => {
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
      alert('Failed to vote. Please try again.');
    }
  };

  if (loading) {
    return <CardListSkeleton />;
  }

  const renderPollCard = (item) => {
    const userVote = item.poll_votes.find(vote => vote.user_id === userId);
    const totalVotes = item.poll_votes.length;
    const isExpired = item.end_date ? new Date(item.end_date) < new Date() : false;

    return (
      <View style={[styles.card, { backgroundColor: theme.dark ? '#282828' : '#f0f0f0' }]}>
        <View style={styles.cardContent}>
          {userVote || isExpired ? (
            <>
              <View style={styles.cardHeader}>
                <FontAwesomeIcon icon={faPoll} size={20} color={theme.colors.primary} />
                <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.question}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.cardMeta, { color: theme.colors.text }]}>
                  Created by {item.users.full_name} on {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              {item.end_date && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <FontAwesomeIcon icon={isExpired ? faCheckCircle : faClock} size={14} color={isExpired ? theme.colors.error : theme.colors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.endDateText, { color: isExpired ? theme.colors.error : theme.colors.text }]}>
                    {isExpired ? 'Ended' : 'Ends'}: {new Date(item.end_date).toLocaleDateString()} at {new Date(item.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )}
              {userVote && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, backgroundColor: theme.colors.success + '20', padding: 8, borderRadius: 6 }}>
                  <FontAwesomeIcon icon={faCheckCircle} size={14} color={theme.colors.success} style={{ marginRight: 6 }} />
                  <Text style={[styles.votedText, { color: theme.colors.success }]}>
                    You have already voted on this poll
                  </Text>
                </View>
              )}
              <View style={styles.resultsContainer}>
                {item.options.map((option, idx) => {
                  const voteCount = item.poll_votes.filter(v => v.selected_option === option).length;
                  const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

                  return (
                    <View key={idx} style={styles.resultItem}>
                      <View style={styles.resultLabelContainer}>
                        <Text style={[styles.resultLabel, { color: theme.colors.text }]}>{option}</Text>
                        <Text style={[styles.resultPercentage, { color: theme.colors.text }]}>{`${percentage.toFixed(0)}%`}</Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
                        <Animated.View
                          style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: theme.colors.primary }]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <View style={styles.cardBody}>
              <View style={styles.cardMainContent}>
                <View style={styles.cardHeader}>
                  <FontAwesomeIcon icon={faPoll} size={20} color={theme.colors.primary} />
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.question}</Text>
                </View>
                <Text style={[styles.cardMeta, { color: theme.colors.text }]}>
                  Created by {item.users.full_name} on {new Date(item.created_at).toLocaleDateString()}
                </Text>
                {item.end_date && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <FontAwesomeIcon icon={faClock} size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.endDateText, { color: theme.colors.text }]}>
                      Ends: {new Date(item.end_date).toLocaleDateString()} at {new Date(item.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.cardAction}>
                <TouchableOpacity
                  style={[styles.voteButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    setSelectedPoll(item);
                    setIsVoteModalVisible(true);
                  }}
                >
                  <Text style={styles.voteButtonText}>Vote</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: theme.colors.text }]}>Polls</Text>
        {(userRole === 'admin' || userRole === 'teacher') && (
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('CreatePoll')}
          >
            <FontAwesomeIcon icon={faPlus} size={16} color="#fff" />
            <Text style={styles.createButtonText}>Create Poll</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.description, { color: theme.colors.text }]}>
        Participate in school polls and share your opinions.
      </Text>

      <FlatList
        data={polls}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 80 }}
        renderItem={({ item }) => renderPollCard(item)}
        ListEmptyComponent={
          <Text style={{ color: theme.colors.text, marginTop: 40, textAlign: 'center' }}>
            No polls available yet.
          </Text>
        }
      />

      {selectedPoll && (
        <PollVoteModal
          visible={isVoteModalVisible}
          onClose={() => setIsVoteModalVisible(false)}
          poll={selectedPoll}
          onVote={handleVote}
          description={selectedPoll.question}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  header: { fontSize: 24, fontWeight: 'bold' },
  createButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  createButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  description: { fontSize: 14, marginBottom: 16 },

  // Card Styles
  card: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMainContent: {
    flex: 1,
    marginRight: 16,
  },
  cardAction: {
    // No specific styles needed here for now
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginLeft: 12, flexShrink: 1, lineHeight: 22 },
  cardMeta: { fontSize: 12, color: '#666' },

  voteButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  resultsContainer: { marginTop: 12 },
  resultItem: { marginBottom: 12 },
  resultLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  resultLabel: { fontSize: 14, fontWeight: '500' },
  resultPercentage: { fontSize: 14, fontWeight: 'bold' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  endDateText: { fontSize: 12, fontWeight: '500' },
  votedText: { fontSize: 14, fontWeight: '600' },
});
