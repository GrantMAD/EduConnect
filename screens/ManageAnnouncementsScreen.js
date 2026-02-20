import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { useSchool } from '../context/SchoolContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ManagementCardSkeleton from '../components/skeletons/ManagementCardSkeleton';
import { faEdit, faTrash, faArrowLeft, faBullhorn, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import EditAnnouncementModal from '../components/EditAnnouncementModal';
import AnnouncementDetailModal from '../components/AnnouncementDetailModal';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../services/authService';
import { getUserProfile } from '../services/userService';
import { 
  getAnnouncementsByPostedBy, 
  deleteAnnouncement as deleteAnnouncementService, 
  updateAnnouncement as updateAnnouncementService,
  getAnnouncementsQuery
} from '../services/announcementService';

const AnnouncementManagementCard = React.memo(({ item, theme, onEdit, onDelete, onPress }) => {
  const handleEdit = React.useCallback(() => onEdit(item), [onEdit, item]);
  const handleDelete = React.useCallback(() => onDelete(item.id), [onDelete, item.id]);
  const handlePress = React.useCallback(() => onPress(item), [onPress, item]);

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={handlePress}
      style={[styles.announcementCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.cardMessage, { color: theme.colors.placeholder }]} numberOfLines={2}>{item.message}</Text>
        <View style={styles.cardFooter}>
          <View style={[styles.authorBadge, { backgroundColor: theme.colors.primary + '10' }]}>
              <Text style={[styles.cardMeta, { color: theme.colors.primary }]}>{item.author?.full_name?.split(' ')[0] || 'User'}</Text>
          </View>
          <Text style={[styles.cardDate, { color: theme.colors.placeholder }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={handleEdit} style={[styles.actionBtn, { backgroundColor: '#e0f2fe' }]}>
          <FontAwesomeIcon icon={faEdit} size={16} color="#0369a1" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: '#fff1f2' }]}>
          <FontAwesomeIcon icon={faTrash} size={16} color="#e11d48" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const ManageAnnouncementsScreen = ({ navigation }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    const getUserData = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          setCurrentUserId(user.id);
          const userData = await getUserProfile(user.id);
          if (userData) {
            setUserRole(userData.role);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    getUserData();
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    if (!schoolId || userRole === null || currentUserId === null) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      let query;
      if (userRole === 'teacher') {
        // Teachers only manage their own posts
        const data = await getAnnouncementsByPostedBy(currentUserId);
        setAnnouncements(data);
      } else {
        // Admins can manage all posts in the school
        query = getAnnouncementsQuery({
          schoolId,
          userRole: 'admin', // Force admin behavior to see all
          from: 0,
          to: 100
        });
        const { data, error } = await query;
        if (error) throw error;
        setAnnouncements(data);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showToast('Failed to fetch announcements.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, userRole, currentUserId, showToast]);

  useFocusEffect(
    useCallback(() => {
      if (userRole !== null && currentUserId !== null) {
        fetchAnnouncements();
      }
    }, [userRole, currentUserId, fetchAnnouncements])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleDelete = useCallback(async (id) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAnnouncementService(id);
              showToast('Announcement deleted successfully!', 'success');
              fetchAnnouncements(); 
            } catch (error) {
              console.error('Error deleting announcement:', error);
              showToast('Failed to delete announcement.', 'error');
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [fetchAnnouncements, showToast]);

  const handleEdit = useCallback((announcement) => {
    setEditingAnnouncement(announcement);
    setShowEditModal(true);
  }, []);

  const handleSaveEdit = useCallback(async (id, title, message) => {
    if (!title || !message) {
      showToast('Title and Message cannot be empty.', 'error');
      return;
    }
    try {
      await updateAnnouncementService(id, { title, message });

      showToast('Announcement updated successfully!', 'success');
      setShowEditModal(false);
      setEditingAnnouncement(null);
      fetchAnnouncements(); 
    } catch (error) {
      console.error('Error updating announcement:', error);
      showToast('Failed to update announcement.', 'error');
    }
  }, [fetchAnnouncements, showToast]);

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
    setEditingAnnouncement(null);
  }, []);

  const handlePress = useCallback((announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailModal(true);
  }, []);

  const renderItem = useCallback(({ item }) => {
    if (loading) return <ManagementCardSkeleton />;

    return (
      <AnnouncementManagementCard
        item={item}
        theme={theme}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPress={handlePress}
      />
    );
  }, [loading, theme, handleEdit, handleDelete, handlePress]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#4f46e5', '#1d4ed8']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHero}>
                        <FontAwesomeIcon icon={faChevronLeft} size={18} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.heroTitle}>Manage Posts</Text>
                </View>
                <Text style={styles.heroDescription}>
                    View, edit, or delete announcements for your school community.
                </Text>
            </View>
            <View style={styles.iconBoxHero}>
                <FontAwesomeIcon icon={faBullhorn} size={24} color="rgba(255,255,255,0.7)" />
            </View>
        </View>
      </LinearGradient>

      <FlatList
        data={loading ? [1, 2, 3, 4, 5] : announcements}
        keyExtractor={(item, index) => loading ? index.toString() : item.id.toString()}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading && (
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No announcements to manage.</Text>
            </View>
        )}
        renderItem={renderItem}
      />

      <EditAnnouncementModal
        visible={showEditModal}
        announcement={editingAnnouncement}
        onClose={handleCancelEdit}
        onSave={handleSaveEdit}
      />

      <AnnouncementDetailModal
        visible={showDetailModal}
        announcement={selectedAnnouncement}
        onClose={() => setShowDetailModal(false)}
      />
    </View>
  );
}

export default React.memo(ManageAnnouncementsScreen);

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
      color: '#e0e7ff',
      fontSize: 14,
      fontWeight: '500',
  },
  backButtonHero: { marginRight: 12 },
  iconBoxHero: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  listContent: {
      padding: 20,
  },
  announcementCard: {
    flexDirection: 'row',
    borderRadius: 20,
    marginBottom: 12,
    padding: 16,
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
  },
  authorBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
  },
  cardMeta: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardDate: {
      fontSize: 10,
      fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  actionButton: {
    marginLeft: 15,
  },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});