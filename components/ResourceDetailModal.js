import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUser, faCalendar, faFileAlt, faThumbsUp, faThumbsDown, faDownload } from '@fortawesome/free-solid-svg-icons';
import RNFetchBlob from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';
import { supabase } from '../lib/supabase';
import { useGamification } from '../context/GamificationContext';

const timeSince = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

export default function ResourceDetailModal({ visible, onClose, resource, onVotesChanged }) {
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const [userId, setUserId] = useState(null);
  const [userVote, setUserVote] = useState(null); // 1 or -1
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);

  useEffect(() => {
    if (!resource) return;
    let isMounted = true;

    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted || !user) return;
      setUserId(user.id);

      const { data: votesData } = await supabase
        .from('resource_votes')
        .select('vote,user_id')
        .eq('resource_id', resource.id);

      if (!isMounted || !votesData) return;
      setUpvotes(votesData.filter(v => v.vote === 1).length);
      setDownvotes(votesData.filter(v => v.vote === -1).length);

      const userVoteData = votesData.find(v => v.user_id === user.id);
      setUserVote(userVoteData?.vote || null);
    };

    if (visible) fetchData();

    // Award XP for viewing resource
    if (visible && resource && awardXP) {
      awardXP('resource_view', 5);
    }

    return () => { isMounted = false; };
  }, [visible, resource]);

  const castVote = async (voteValue) => {
    if (!userId || !resource || userVote !== null) return; // Prevent re-voting

    try {
      const { error } = await supabase
        .from('resource_votes')
        .upsert(
          { resource_id: resource.id, user_id: userId, vote: voteValue },
          { onConflict: 'resource_id,user_id' }
        );

      if (error) throw error;

      const { data: votesData } = await supabase
        .from('resource_votes')
        .select('vote')
        .eq('resource_id', resource.id);

      setUpvotes(votesData.filter(v => v.vote === 1).length);
      setDownvotes(votesData.filter(v => v.vote === -1).length);
      setUserVote(voteValue);

      if (onVotesChanged) onVotesChanged();
    } catch (err) {
      console.error('Vote failed:', err);
      Alert.alert('Error', 'Failed to submit vote.');
    }
  };

  const handleOpenFile = async (url) => {
    if (!url) return;
    try {
      const decodedUrl = decodeURIComponent(url);
      const fileName = decodedUrl.split('/').pop();
      const localPath = `${RNFetchBlob.fs.dirs.CacheDir}/${fileName}`;
      const res = await RNFetchBlob.config({ path: localPath, fileCache: true }).fetch('GET', url);
      if (res.info().status === 200) await FileViewer.open(localPath, { showOpenWithDialog: true });
    } catch (err) {
      console.error('Cannot open file:', err);
      Alert.alert('Error', 'Failed to open file. Make sure you have an app that can open this file type.');
    }
  };

  if (!resource) return null;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <FontAwesomeIcon icon={faFileAlt} size={26} color="#007AFF" />
          <Text style={styles.modalTitle}>{resource.title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <FontAwesomeIcon icon={faTimes} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{resource.description}</Text>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.modalDetailRow}>
              <FontAwesomeIcon icon={faUser} size={16} color="#555" style={styles.modalIcon} />
              <Text style={styles.modalDetailText}>
                Uploaded by {resource.users?.full_name ?? resource.users?.email ?? "Unknown"}
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.modalDetailRow}>
              <FontAwesomeIcon icon={faCalendar} size={16} color="#555" style={styles.modalIcon} />
              <Text style={styles.modalDetailText}>Posted {timeSince(resource.created_at)}</Text>
            </View>
          </View>

          <View style={styles.voteSection}>
            {userVote === null ? (
              <>
                <Text style={styles.votePrompt}>Was this resource helpful?</Text>
                <View style={styles.voteContainer}>
                  <TouchableOpacity onPress={() => castVote(1)} style={[styles.voteButton, styles.upvoteButton]}>
                    <FontAwesomeIcon icon={faThumbsUp} size={20} color="#28A745" />
                    <Text style={styles.voteCount}>{upvotes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => castVote(-1)} style={[styles.voteButton, styles.downvoteButton]}>
                    <FontAwesomeIcon icon={faThumbsDown} size={20} color="#FF3B30" />
                    <Text style={styles.voteCount}>{downvotes}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.votedText}>Thanks for your feedback!</Text>
            )}
          </View>
        </ScrollView>

        {resource.file_url && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.openFileButton} onPress={() => handleOpenFile(resource.file_url)}>
              <FontAwesomeIcon icon={faDownload} size={18} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.openFileButtonText}>View Attached File</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#F7F9FC',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  modalCloseButton: {
    padding: 5,
  },
  descriptionContainer: {
    paddingVertical: 20,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 20,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIcon: {
    marginRight: 12,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#444',
  },
  separator: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginVertical: 12,
  },
  voteSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 20,
  },
  votePrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  votedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28A745',
  },
  voteContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    borderWidth: 1,
  },
  upvoteButton: {
    borderColor: '#28A745',
  },
  downvoteButton: {
    borderColor: '#FF3B30',
  },
  voteCount: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  openFileButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openFileButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
