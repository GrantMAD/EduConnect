import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ManagementCardSkeleton from '../components/skeletons/ManagementCardSkeleton';
import { faEdit, faTrash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import EditAnnouncementModal from '../components/EditAnnouncementModal';
import { useToast } from '../context/ToastContext';

export default function ManageAnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { schoolId } = useSchool();
  const { showToast } = useToast();

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: userData, error } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
    };
    getUserData();
  }, []);

  const fetchAnnouncements = async () => {
    if (!schoolId || userRole === null || currentUserId === null) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      let query = supabase
        .from('announcements')
        .select('*, author:users(full_name)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (userRole === 'teacher') {
        query = query.eq('posted_by', currentUserId);
      }

      const { data, error } = await query;
      setAnnouncements(data);
    } catch (error) {
      showToast('Failed to fetch announcements.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (userRole !== null && currentUserId !== null) {
        fetchAnnouncements();
      }
    }, [schoolId, userRole, currentUserId])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAnnouncements();
  }, [schoolId, userRole, currentUserId]);

  const handleDelete = async (id) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const { error } = await supabase.from('announcements').delete().eq('id', id);
              if (error) throw error;
              showToast('Announcement deleted successfully!', 'success');
              fetchAnnouncements(); // Refresh the list
            } catch (error) {
              showToast('Failed to delete announcement.', 'error');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (id, title, message) => {
    if (!title || !message) {
      showToast('Title and Message cannot be empty.', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ title, message })
        .eq('id', id);

      if (error) throw error;
      showToast('Announcement updated successfully!', 'success');
      setShowEditModal(false);
      setEditingAnnouncement(null);
      fetchAnnouncements(); // Refresh the list
    } catch (error) {
      showToast('Failed to update announcement.', 'error');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingAnnouncement(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Manage Announcements</Text>
        <Text style={styles.description}>View, edit, or delete announcements for your school.</Text>
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <ManagementCardSkeleton />}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <FontAwesomeIcon icon={faArrowLeft} size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>Back to Management</Text>
      </TouchableOpacity>
      <Text style={styles.header}>Manage Announcements</Text>
      <Text style={styles.description}>View, edit, or delete announcements for your school.</Text>

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListEmptyComponent={<Text style={styles.emptyText}>No announcements to manage.</Text>}
        renderItem={({ item }) => (
          <View style={styles.announcementCard}>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMessage} numberOfLines={2}>{item.message}</Text>
              <Text style={styles.cardMeta}>Posted by: {item.author.full_name} on {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                <FontAwesomeIcon icon={faEdit} size={20} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
                <FontAwesomeIcon icon={faTrash} size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <EditAnnouncementModal
        visible={showEditModal}
        announcement={editingAnnouncement}
        onClose={handleCancelEdit}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
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
  announcementCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    padding: 15,
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  cardMessage: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  cardMeta: {
    fontSize: 12,
    color: '#888',
  },
  cardActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    marginLeft: 15,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
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
