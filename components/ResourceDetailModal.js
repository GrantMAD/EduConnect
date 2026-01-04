import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Share } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faTimes,
  faUser,
  faCalendar,
  faFileAlt,
  faThumbsUp,
  faThumbsDown,
  faDownload,
  faTrash,
  faEdit,
  faShareAlt
} from '@fortawesome/free-solid-svg-icons';
import RNFetchBlob from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';
import { supabase } from '../lib/supabase';
import { useGamification } from '../context/GamificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

const timeSince = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return Math.floor(seconds) + ' seconds ago';
};

const ResourceDetailModal = React.memo(
  ({ visible, onClose, resource, onVotesChanged, onResourceDeleted, onResourceUpdated, onEditPress }) => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const gamificationData = useGamification();
    const { awardXP = () => { } } = gamificationData || {};
    const insets = useSafeAreaInsets();

    const [userId, setUserId] = useState(null);
    const [userVote, setUserVote] = useState(null);
    const [upvotes, setUpvotes] = useState(0);
    const [downvotes, setDownvotes] = useState(0);
    const [isVoting, setIsVoting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

      const handleResourceView = async () => {
        if (!visible || !resource || !awardXP) return;

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: existingView } = await supabase
            .from('resource_views')
            .select('xp_awarded')
            .eq('user_id', user.id)
            .eq('resource_id', resource.id)
            .maybeSingle();

          if (!existingView) {
            const { error } = await supabase
              .from('resource_views')
              .insert({
                user_id: user.id,
                resource_id: resource.id,
                xp_awarded: true
              });

            if (!error) {
              awardXP('resource_view', 5);
            }
          }
        } catch (error) {
          console.error('Error tracking resource view:', error);
        }
      };

      if (visible) {
        fetchData();
        handleResourceView();
      }

      return () => {
        isMounted = false;
      };
    }, [visible, resource, awardXP]);

    const handleShare = async () => {
      try {
        await Share.share({
          title: resource.title,
          message: `${resource.title}\n\n${resource.description}${resource.file_url ? '\n\nFile Link: ' + resource.file_url : ''}`,
        });
      } catch {
        showToast('Error sharing resource', 'error');
      }
    };

    const handleDelete = async () => {
      Alert.alert(
        'Delete Resource',
        'Are you sure you want to delete this resource? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              setIsDeleting(true);
              try {
                const { error } = await supabase
                  .from('resources')
                  .delete()
                  .eq('id', resource.id);

                if (error) throw error;

                showToast('Resource deleted successfully', 'success');
                onResourceDeleted?.(resource.id);
                onClose();
              } catch (err) {
                console.error('Delete failed:', err);
                showToast('Failed to delete resource', 'error');
              } finally {
                setIsDeleting(false);
              }
            }
          }
        ]
      );
    };

    const castVote = async (voteValue) => {
      if (!userId || !resource || userVote !== null || isVoting) return;

      setIsVoting(true);
      try {
        const { error } = await supabase
          .from('resource_votes')
          .upsert(
            { resource_id: resource.id, user_id: userId, vote: voteValue },
            { onConflict: 'resource_id,user_id' }
          );

        if (error) throw error;

        const { data: votesData } = await supabase
          .react.memo(() => { }) // no-op to preserve formatting
          .from('resource_votes')
          .select('vote')
          .eq('resource_id', resource.id);

        setUpvotes(votesData.filter(v => v.vote === 1).length);
        setDownvotes(votesData.filter(v => v.vote === -1).length);
        setUserVote(voteValue);

        onVotesChanged?.();
      } catch (err) {
        console.error('Vote failed:', err);
        Alert.alert('Error', 'Failed to submit vote.');
      } finally {
        setIsVoting(false);
      }
    };

    const handleOpenFile = async (url) => {
      if (!url) return;
      try {
        const decodedUrl = decodeURIComponent(url);
        const fileName = decodedUrl.split('/').pop();
        const localPath = `${RNFetchBlob.fs.dirs.CacheDir}/${fileName}`;
        const res = await RNFetchBlob.config({ path: localPath, fileCache: true }).fetch('GET', url);
        if (res.info().status === 200) {
          await FileViewer.open(localPath, { showOpenWithDialog: true });
        }
      } catch (err) {
        console.error('Cannot open file:', err);
        Alert.alert('Error', 'Failed to open file.');
      }
    };

    if (!resource) return null;

    return (
      <Modal
        isVisible={visible}
        onBackdropPress={onClose}
        onSwipeComplete={onClose}
        swipeDirection={['down']}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.4}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 40) }]}>
          <View style={styles.swipeIndicator} />
          <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
              <FontAwesomeIcon icon={faFileAlt} size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{resource.title}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                <FontAwesomeIcon icon={faShareAlt} size={18} color={theme.colors.placeholder} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
            <View style={styles.descriptionWrapper}>
              <Text style={[styles.descriptionText, { color: theme.colors.text }]}>{resource.description}</Text>
            </View>

            <View style={[styles.metaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <View style={styles.metaRow}>
                <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                  <FontAwesomeIcon icon={faUser} size={12} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>UPLOADED BY</Text>
                  <Text style={[styles.metaValue, { color: theme.colors.text }]}>{resource.users?.full_name ?? "Member"}</Text>
                </View>
              </View>
              <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />
              <View style={styles.metaRow}>
                <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                  <FontAwesomeIcon icon={faCalendar} size={12} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>TIMESTAMP</Text>
                  <Text style={[styles.metaValue, { color: theme.colors.text }]}>{timeSince(resource.created_at).toUpperCase()}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.voteSection, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              {isVoting ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : userVote === null ? (
                <>
                  <Text style={[styles.votePrompt, { color: theme.colors.placeholder }]}>WAS THIS RESOURCE HELPFUL?</Text>
                  <View style={styles.voteContainer}>
                    <TouchableOpacity onPress={() => castVote(1)} style={[styles.voteBtn, { borderColor: '#10b981' }]}>
                      <FontAwesomeIcon icon={faThumbsUp} size={16} color="#10b981" />
                      <Text style={[styles.voteCount, { color: '#10b981' }]}>{upvotes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => castVote(-1)} style={[styles.voteBtn, { borderColor: '#ef4444' }]}>
                      <FontAwesomeIcon icon={faThumbsDown} size={16} color="#ef4444" />
                      <Text style={[styles.voteCount, { color: '#ef4444' }]}>{downvotes}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.votedWrapper}>
                  <FontAwesomeIcon icon={faThumbsUp} size={16} color="#10b981" />
                  <Text style={[styles.votedText, { color: '#10b981' }]}>FEEDBACK RECEIVED</Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footerContainer}>
            {resource.file_url && (
              <TouchableOpacity style={[styles.primaryAction, { backgroundColor: theme.colors.primary }]} onPress={() => handleOpenFile(resource.file_url)}>
                <FontAwesomeIcon icon={faDownload} size={14} color="#fff" />
                <Text style={styles.primaryActionText}>VIEW ATTACHMENT</Text>
              </TouchableOpacity>
            )}

            {userId === resource.uploaded_by && (
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  style={[styles.secondaryAction, { borderColor: theme.colors.primary, borderWidth: 1 }]}
                  onPress={() => onEditPress(resource)}
                >
                  <Text style={[styles.secondaryActionText, { color: theme.colors.primary }]}>EDIT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryAction, { borderColor: '#ef4444', borderWidth: 1 }]}
                  onPress={handleDelete}
                  disabled={isDeleting}
                >
                  <Text style={[styles.secondaryActionText, { color: '#ef4444' }]}>DELETE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '85%',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  descriptionWrapper: {
    marginBottom: 32,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
  metaCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metaDivider: {
    height: 1,
    marginVertical: 16,
    marginLeft: 48,
  },
  voteSection: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
  },
  votePrompt: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 20,
  },
  voteContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '900',
  },
  votedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  votedText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerContainer: {
    paddingTop: 24,
    gap: 12,
  },
  primaryAction: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  shareAltButton: {
    padding: 8,
    marginRight: 5,
  },
  descriptionContainer: {
    paddingVertical: 20,
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
  ownerFooter: {
    flexDirection: 'row',
    paddingTop: 15,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  editButtonText: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 16,
  },
  deleteButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  deleteButtonTextSmall: {
    color: '#FF3B30',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ResourceDetailModal;
