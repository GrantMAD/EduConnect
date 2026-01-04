import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, RefreshControl, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faBook, faPlus, faFileAlt, faThumbsUp, faThumbsDown, faBookmark, 
  faSortAmountDown, faFilter, faInfoCircle, faFolder, faFolderOpen,
  faFilePdf, faFileImage, faFileWord, faFileExcel, faArrowLeft, faCopy, faCamera
} from '@fortawesome/free-solid-svg-icons';
import CreateResourceModal from '../components/CreateResourceModal';
import ResourceDetailModal from '../components/ResourceDetailModal';
import StandardBottomModal from '../components/StandardBottomModal';
import { useSchool } from '../context/SchoolContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import RNFetchBlob from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';
import { useGamification } from '../context/GamificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ResourcesScreenSkeleton, { SkeletonPiece, ResourceCardSkeleton } from '../components/skeletons/ResourcesScreenSkeleton';
import LinearGradient from 'react-native-linear-gradient';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ResourcesScreen = () => {
  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const insets = useSafeAreaInsets();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); 
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('public'); 
  const [editingResource, setEditingResource] = useState(null);
  
  const [currentFolder, setCurrentFolder] = useState(null);

  const fetchBookmarks = useCallback(async () => {
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
  }, []);

  const toggleBookmark = useCallback(async (resourceId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (bookmarkedIds.has(resourceId)) {
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
        showToast('Bookmark removed', 'info');
      } else {
        const { error } = await supabase
          .from('resource_bookmarks')
          .insert({ user_id: user.id, resource_id: resourceId });
        if (error) throw error;

        setBookmarkedIds(prev => {
          const next = new Set(prev);
          next.add(resourceId);
          return next;
        });
        showToast('Resource bookmarked', 'success');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      showToast('Failed to toggle bookmark', 'error');
    }
  }, [bookmarkedIds, showToast]);

  const handleEditPress = useCallback((resource) => {
    setDetailModalVisible(false);
    setEditingResource(resource);
    setShowCreateModal(true);
  }, []);

  const fetchUserRole = useCallback(async () => {
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
  }, []);

  const fetchResources = useCallback(async (silent = false) => {
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
  }, [schoolId, activeTab]);

  useEffect(() => {
    fetchUserRole();
    fetchResources();
    fetchBookmarks();
  }, [schoolId, activeTab, fetchUserRole, fetchResources, fetchBookmarks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchResources(true), fetchBookmarks()]);
    setRefreshing(false);
  }, [fetchResources, fetchBookmarks]);

  const getFileIcon = useCallback((fileUrl) => {
    if (!fileUrl) return faFileAlt;
    const lowerUrl = fileUrl.toLowerCase();
    if (lowerUrl.endsWith('.pdf')) return faFilePdf;
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) return faFileImage;
    if (lowerUrl.match(/\.(doc|docx)$/)) return faFileWord;
    if (lowerUrl.match(/\.(xls|xlsx)$/)) return faFileExcel;
    return faFileAlt;
  }, []);

  const filteredResources = useMemo(() => {
    let processed = [...resources];

    if (searchTerm) {
      processed = processed.filter(r =>
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (showBookmarkedOnly) {
      processed = processed.filter(r => bookmarkedIds.has(r.id));
    }

    if (!searchTerm && currentFolder) {
      processed = processed.filter(r => (r.category || 'General') === currentFolder);
    }

    processed.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'popular') return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
      return 0;
    });

    return processed;
  }, [resources, searchTerm, showBookmarkedOnly, bookmarkedIds, currentFolder, sortBy]);

  const categories = useMemo(() => {
    const cats = new Set(resources.map(r => r.category || 'General'));
    return Array.from(cats).sort();
  }, [resources]);

  const renderResourceItem = useCallback((item) => (
    <View key={item.id.toString()} style={styles.resourceItemContainer}>
      <TouchableOpacity
        onPress={() => {
          setSelectedResource(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
          <FontAwesomeIcon icon={getFileIcon(item.file_url)} size={28} color={theme.colors.primary} style={{ marginRight: 15 }} />
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
        <FontAwesomeIcon icon={faThumbsUp} size={14} color="#28A745" />
        <Text style={[styles.voteCount, { color: theme.colors.text }]}>{item.upvotes}</Text>
        <FontAwesomeIcon icon={faThumbsDown} size={14} color="#FF3B30" style={{ marginLeft: 10 }} />
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
  ), [theme, getFileIcon, toggleBookmark, bookmarkedIds]);

  const openInfoModal = useCallback(() => setInfoModalVisible(true), []);
  const closeInfoModal = useCallback(() => setInfoModalVisible(false), []);
  const openCreateModal = useCallback(() => setShowCreateModal(true), []);
  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setEditingResource(null);
    fetchResources();
  }, [fetchResources]);

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
                {currentFolder && !searchTerm && (
                    <TouchableOpacity 
                        onPress={() => setCurrentFolder(null)} 
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                    >
                        <FontAwesomeIcon icon={faArrowLeft} size={14} color="#fff" />
                        <Text style={{ color: '#fff', marginLeft: 8, fontSize: 14, fontWeight: '600' }}>Back to Folders</Text>
                    </TouchableOpacity>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                     <Text style={styles.heroTitle}>
                        {currentFolder && !searchTerm ? currentFolder : 'Resources'}
                    </Text>
                    {!currentFolder && (
                        <TouchableOpacity onPress={openInfoModal} style={styles.infoButton}>
                            <FontAwesomeIcon icon={faInfoCircle} size={16} color="rgba(255,255,255,0.7)" />
                        </TouchableOpacity>
                    )}
                </View>
                {!currentFolder && (
                    <Text style={styles.heroDescription}>
                         {activeTab === 'public' 
                        ? "Access and manage all your educational resources."
                        : "Keep your private study materials here."}
                    </Text>
                )}
            </View>
             {(userRole === 'teacher' || userRole === 'admin') && (
                <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
                    <FontAwesomeIcon icon={faPlus} size={14} color="#4f46e5" />
                    <Text style={styles.addButtonText}>New</Text>
                </TouchableOpacity>
            )}
        </View>
      </LinearGradient>

      {(!currentFolder && !searchTerm) && (userRole === 'teacher' || userRole === 'admin') && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'public' && styles.activeTab]}
            onPress={() => {
              setActiveTab('public');
              setCurrentFolder(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'public' && styles.activeTabText]}>Public</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'personal' && styles.activeTab]}
            onPress={() => {
              setActiveTab('personal');
              setCurrentFolder(null);
            }}
          >
            <Text style={[styles.tabText, activeTab === 'personal' && styles.activeTabText]}>Personal</Text>
          </TouchableOpacity>
        </View>
      )}

      {(currentFolder && !searchTerm) && (
        <View style={{ height: 10 }} />
      )}

      {loading ? (
        <View style={{ paddingHorizontal: 16, marginBottom: 20, marginTop: 20 }}>
            <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
        </View>
      ) : (
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
             <TextInput
            style={[styles.searchInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.inputBackground }]}
            placeholder="Search resources..."
            placeholderTextColor={theme.colors.placeholder}
            value={searchTerm}
            onChangeText={(text) => {
                setSearchTerm(text);
                if (text) setCurrentFolder(null); 
            }}
            />
        </View>
      )}

      {(searchTerm || currentFolder) && (
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
      )}

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />
        }
      >
        {loading ? (
          [1, 2, 3].map(i => <ResourceCardSkeleton key={i} />)
        ) : (
          <>
            {!currentFolder && !searchTerm && (
              <View style={styles.folderGrid}>
                {categories.length === 0 ? (
                  <Text style={[styles.noResourcesText, { color: theme.colors.placeholder }]}>No resources available.</Text>
                ) : (
                  categories.map((cat, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[styles.folderCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}
                      onPress={() => setCurrentFolder(cat)}
                    >
                      <FontAwesomeIcon icon={faFolder} size={40} color="#FFC107" />
                      <Text style={[styles.folderName, { color: theme.colors.text }]} numberOfLines={1}>{cat}</Text>
                      <Text style={[styles.folderCount, { color: theme.colors.placeholder }]}>
                        {resources.filter(r => (r.category || 'General') === cat).length} items
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {(currentFolder || searchTerm) && (
              <View>
                {filteredResources.length === 0 ? (
                  <Text style={[styles.noResourcesText, { color: theme.colors.placeholder }]}>No matching resources found.</Text>
                ) : (
                  filteredResources.map(renderResourceItem)
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>


      <CreateResourceModal
        visible={showCreateModal}
        initialData={editingResource}
        onClose={closeCreateModal}
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
        onClose={closeInfoModal}
        title="About Resources"
        icon={faInfoCircle}
      >
        <View>
          <Text style={styles.modalText}>
            Welcome to the Resources Hub! Here you can:
          </Text>
          <Text style={styles.bulletPoint}>• Browse educational materials organized by folders.</Text>
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

export default React.memo(ResourcesScreen);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerIcon: { marginRight: 10 },
  descriptionContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  descriptionText: { fontSize: 14, color: '#555', flex: 1 },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
    marginTop: 16,
    marginHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#fff',
    elevation: 0,
    borderWidth: 1,
    borderColor: '#eee',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#007AFF',
  },
  addButton: { 
      flexDirection: 'row', 
      backgroundColor: '#fff', 
      paddingVertical: 8, 
      paddingHorizontal: 12, 
      borderRadius: 20, 
      alignItems: 'center', 
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
  },
  addButtonText: { color: '#4f46e5', fontWeight: '600', marginLeft: 8, fontSize: 14 },
  
  card: { flexDirection: 'row', backgroundColor: '#f8f8f8', padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '700' },
  description: { color: '#555', marginVertical: 4, fontSize: 13 },
  uploader: { color: '#777', fontSize: 11, marginTop: 4 },
  scrollView: { flex: 1 },
  noResourcesText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' },
  searchInput: {
    height: 44,
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  resourceItemContainer: {
    marginBottom: 15,
  },
  voteSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: -10,
    right: 15,
    backgroundColor: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 0,
  },
  voteCount: { marginLeft: 4, marginRight: 8, fontSize: 12, fontWeight: '600', color: '#555' },
  controlsContainer: { flexDirection: 'row', marginBottom: 15, paddingHorizontal: 16 },
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
  bookmarkButton: { position: 'absolute', top: 10, right: 10, padding: 8, zIndex: 10 },
  modalText: { fontSize: 16, color: '#333', marginBottom: 10 },
  bulletPoint: { fontSize: 15, color: '#555', marginBottom: 8, marginLeft: 10 },
  
  folderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  folderCard: {
    width: (SCREEN_WIDTH - 48) / 2, // 2 columns with padding
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 0,
  },
  folderName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  folderCount: {
    fontSize: 12,
    marginTop: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
});