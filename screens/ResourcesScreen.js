import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBook, faPlus, faFileAlt, faThumbsUp, faThumbsDown, faBookmark, faSortAmountDown, faFilter, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import CreateResourceModal from '../components/CreateResourceModal';
import ResourceDetailModal from '../components/ResourceDetailModal';
import StandardBottomModal from '../components/StandardBottomModal';
import { useSchool } from '../context/SchoolContext';
import { useTheme } from '../context/ThemeContext';
import RNFetchBlob from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';
import { useGamification } from '../context/GamificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ResourcesScreenSkeleton, { SkeletonPiece, ResourceCardSkeleton } from '../components/skeletons/ResourcesScreenSkeleton';

export default function ResourcesScreen() {
  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const insets = useSafeAreaInsets();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'popular'
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('public'); // 'public' or 'personal'
  const [editingResource, setEditingResource] = useState(null);

  useEffect(() => {
    fetchUserRole();
    fetchResources();
    fetchBookmarks();
  }, [schoolId, activeTab]);

  const fetchBookmarks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('resource_bookmarks')
        .select('resource_id')
        .eq('user_id', user.id);

      if (error) throw error;
      const ids = new Set(data.map(item => item.resource_id));
      setBookmarkedIds(ids);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const toggleBookmark = async (resourceId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (bookmarkedIds.has(resourceId)) {
        // Remove bookmark
        const { error } = await supabase
          .from('resource_bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('resource_id', resourceId);
        if (error) throw error;

        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('resource_bookmarks')
          .insert({ user_id: user.id, resource_id: resourceId });
        if (error) throw error;

        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.add(resourceId);
          return next;
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleEditPress = (resource) => {
    setDetailModalVisible(false);
    setEditingResource(resource);
    setShowCreateModal(true);
  };

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchResources = async (silent = false) => {
    if (!schoolId) return;

    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('resources')
        .select(`
          *,
          users (full_name, email)
        `);

      if (activeTab === 'personal') {
        query = query.eq('is_personal', true).eq('uploaded_by', user.id);
      } else {
        query = query.eq('school_id', schoolId).eq('is_personal', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate vote counts for each resource
      const resourcesWithVotes = await Promise.all(
        data.map(async (resource) => {
          const { data: votes } = await supabase
            .from('resource_votes')
            .select('vote')
            .eq('resource_id', resource.id);

          const upvotes = votes?.filter(v => v.vote === 1).length || 0;
          const downvotes = votes?.filter(v => v.vote === -1).length || 0;

          return { ...resource, upvotes, downvotes };
        })
      );

      setResources(resourcesWithVotes);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Filter and Sort resources
  const processResources = () => {
    let processed = [...resources];

    // 1. Filter by Search Term
    if (searchTerm) {
      processed = processed.filter(r =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 2. Filter by Bookmarks
    if (showBookmarkedOnly) {
      processed = processed.filter(r => bookmarkedIds.has(r.id));
    }

    // 3. Sort
    processed.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'popular') return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      return 0;
    });

    // 4. Group by Category
    return processed.reduce((acc, resource) => {
      const category = resource.category || 'General';
      if (!acc[category]) acc[category] = [];
      acc[category].push(resource);
      return acc;
    }, {});
  };

  const filteredResources = processResources();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <FontAwesomeIcon icon={faBook} size={24} color="#007AFF" style={styles.headerIcon} />
          <Text style={[styles.header, { color: theme.colors.text }]}>Resources</Text>
        </View>
        {loading ? (
          <SkeletonPiece style={{ width: 100, height: 35, borderRadius: 10 }} />
        ) : (userRole === 'teacher' || userRole === 'admin') && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <FontAwesomeIcon icon={faPlus} size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add Resource</Text>
          </TouchableOpacity>
        )}
      </View>

      {(userRole === 'teacher' || userRole === 'admin') && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'public' && styles.activeTab]}
            onPress={() => setActiveTab('public')}
          >
            <Text style={[styles.tabText, activeTab === 'public' && styles.activeTabText]}>Public Resources</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
            onPress={() => setActiveTab('personal')}
          >
            <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>Personal Resources</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.descriptionContainer}>
        <Text style={[styles.descriptionText, { color: theme.colors.text }]}>
          {activeTab === 'public' 
            ? "Access and manage all your educational resources here."
            : "Keep your private study materials and notes here. Only you can see these."}
        </Text>
        <TouchableOpacity onPress={() => setInfoModalVisible(true)} style={styles.infoButton}>
          <FontAwesomeIcon icon={faInfoCircle} size={18} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8, marginBottom: 20 }} />
      ) : (
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
          placeholder="Search by title..."
          placeholderTextColor={theme.colors.placeholder}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.inputBackground }]}
          onPress={() => {
            if (sortBy === 'newest') setSortBy('popular');
            else if (sortBy === 'popular') setSortBy('oldest');
            else setSortBy('newest');
          }}
        >
          <FontAwesomeIcon icon={faSortAmountDown} size={14} color={theme.colors.placeholder} />
          <Text style={[styles.controlText, { color: theme.colors.text }]}>
            Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'popular' ? 'Popular' : 'Oldest'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, showBookmarkedOnly ? styles.controlButtonActive : { backgroundColor: theme.colors.inputBackground }]}
          onPress={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
        >
          <FontAwesomeIcon icon={faBookmark} size={14} color={showBookmarkedOnly ? "#fff" : theme.colors.placeholder} />
          <Text style={[styles.controlText, showBookmarkedOnly ? { color: '#fff' } : { color: theme.colors.text }]}>My Bookmarks</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {loading ? (
          [1, 2, 3].map(i => <ResourceCardSkeleton key={i} />)
        ) : Object.keys(filteredResources).length === 0 ? (
          <Text style={[styles.noResourcesText, { color: theme.colors.placeholder }]}>No resources available yet.</Text>
        ) : (
          Object.keys(filteredResources).map((category) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={[styles.categoryHeader, { color: theme.colors.text }]}>{category}</Text>
              {filteredResources[category].map((item) => (
                <View key={item.id.toString()} style={styles.resourceItemContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedResource(item);
                      setDetailModalVisible(true);
                    }}
                  >
                    <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                      <FontAwesomeIcon icon={faFileAlt} size={24} color="#007AFF" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
                        <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2} ellipsizeMode="tail">
                          {item.description}
                        </Text>
                        <Text style={[styles.uploader, { color: theme.colors.placeholder }]}>
                          Uploaded by: {item.users?.full_name ?? item.users?.email ?? "Unknown"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={[styles.voteSummaryContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faThumbsUp} size={16} color="#28A745" />
                    <Text style={[styles.voteCount, { color: theme.colors.text }]}>{item.upvotes}</Text>
                    <FontAwesomeIcon icon={faThumbsDown} size={16} color="#FF3B30" style={{ marginLeft: 12 }} />
                    <Text style={[styles.voteCount, { color: theme.colors.text }]}>{item.downvotes}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.bookmarkButton}
                    onPress={() => toggleBookmark(item.id)}
                  >
                    <FontAwesomeIcon
                      icon={faBookmark}
                      size={20}
                      color={bookmarkedIds.has(item.id) ? "#FFC107" : "#ccc"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <CreateResourceModal
        visible={showCreateModal}
        initialData={editingResource}
        onClose={() => {
          setShowCreateModal(false);
          setEditingResource(null);
          fetchResources();
        }}
      />

      <ResourceDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        resource={selectedResource}
        onVotesChanged={() => fetchResources(true)}
        onResourceDeleted={() => fetchResources()}
        onEditPress={handleEditPress}
      />

      <StandardBottomModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
        title="About Resources"
        icon={faInfoCircle}
      >
        <View>
          <Text style={styles.modalText}>
            Welcome to the Resources Hub! Here you can:
          </Text>
          <Text style={styles.bulletPoint}>• Browse educational materials uploaded by teachers.</Text>
          <Text style={styles.bulletPoint}>• Search for specific topics or titles.</Text>
          <Text style={styles.bulletPoint}>• Bookmark important resources for quick access.</Text>
          <Text style={styles.bulletPoint}>• Vote on resources to help others find the best content.</Text>
          {userRole === 'teacher' || userRole === 'admin' ? (
            <Text style={styles.bulletPoint}>• Upload new resources to share with the school.</Text>
          ) : null}
        </View>
      </StandardBottomModal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginRight: 10 },
  descriptionContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  descriptionText: { fontSize: 16, color: '#555', flex: 1 },
  infoButton: { padding: 5, marginLeft: 5 },
  container: { padding: 16, flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: '700' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
  },
  addButton: { flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  card: { flexDirection: 'row', backgroundColor: '#f8f8f8', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '700' },
  description: { color: '#555', marginVertical: 4 },
  uploader: { color: '#777', fontSize: 12 },
  scrollView: { flex: 1 },
  categoryContainer: { marginBottom: 20 },
  categoryHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
  noResourcesText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' },
  searchInput: {
    height: 40,
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  resourceItemContainer: {
    marginBottom: 20,
  },
  voteSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: -10,
    right: 15,
    backgroundColor: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    borderWidth: 1,
    borderColor: '#eee',
  },
  voteCount: { marginLeft: 4, marginRight: 8, fontSize: 14, color: '#555' },
  controlsContainer: { flexDirection: 'row', marginBottom: 15 },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10
  },
  controlButtonActive: { backgroundColor: '#007AFF' },
  controlText: { marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#555' },
  bookmarkButton: { position: 'absolute', top: 10, right: 10, padding: 5, zIndex: 10 },
  modalText: { fontSize: 16, color: '#333', marginBottom: 10 },
  bulletPoint: { fontSize: 15, color: '#555', marginBottom: 8, marginLeft: 10 },
});
