import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-native-modal';
import { TextInput } from 'react-native';

export default function ManageAnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const { schoolId } = useSchool();

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
      Alert.alert('Error', 'Failed to fetch announcements.');
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
              Alert.alert('Success', 'Announcement deleted successfully!');
              fetchAnnouncements(); // Refresh the list
            } catch (error) {
              Alert.alert('Error', 'Failed to delete announcement.');
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

  const handleSaveEdit = async () => {
    if (!editingAnnouncement.title || !editingAnnouncement.message) {
      Alert.alert('Error', 'Title and Message cannot be empty.');
      return;
    }
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ title: editingAnnouncement.title, message: editingAnnouncement.message })
        .eq('id', editingAnnouncement.id);

      if (error) throw error;
      Alert.alert('Success', 'Announcement updated successfully!');
      setShowEditModal(false);
      setEditingAnnouncement(null);
      fetchAnnouncements(); // Refresh the list
    } catch (error) {
      Alert.alert('Error', 'Failed to update announcement.');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingAnnouncement(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      <Modal
        isVisible={showEditModal}
        onBackdropPress={handleCancelEdit}
        animationIn="fadeInUp"
        animationOut="fadeOutDown"
        backdropOpacity={0.4}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Announcement</Text>
          <TextInput
            style={styles.input}
            value={editingAnnouncement?.title}
            onChangeText={(text) => setEditingAnnouncement(prev => ({ ...prev, title: text }))}
            placeholder="Title"
          />
          <TextInput
            style={[styles.input, styles.messageInput]}
            value={editingAnnouncement?.message}
            onChangeText={(text) => setEditingAnnouncement(prev => ({ ...prev, message: text }))}
            placeholder="Message"
            multiline
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleCancelEdit}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSaveEdit}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderRadius: 10,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  messageInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    width: '45%',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
