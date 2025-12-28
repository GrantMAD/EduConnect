import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, FlatList, TouchableOpacity, Modal, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { Picker } from '@react-native-picker/picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import UserManagementScreenSkeleton, { UserItemSkeleton } from '../components/skeletons/UserManagementScreenSkeleton';
import { faTimes, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../context/ToastContext';
import { useSchool } from '../context/SchoolContext';
import { useSupabaseInfiniteQuery } from '../hooks/useSupabaseInfiniteQuery';

const defaultUserImage = require('../assets/user.png');

export default function UserManagementScreen({ navigation, route }) {
  const { fromDashboard } = route?.params || {};
  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const fetchUsersQuery = React.useCallback(({ from, to }) => {
    if (!schoolId) return Promise.resolve({ data: [], error: null });

    let query = supabase
      .from('users')
      .select('*')
      .eq('school_id', schoolId);

    if (searchQuery) {
      query = query.ilike('full_name', `%${searchQuery}%`);
    }

    // Sort by role (admin first) then name
    // Roles: admin, parent, student, teacher (alphabetical order works for admin first)
    query = query
      .order('role', { ascending: true })
      .order('full_name', { ascending: true })
      .range(from, to);

    return query;
  }, [schoolId, searchQuery]);

  const {
    data: users,
    setData: setUsers,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    refetch,
    loadMore
  } = useSupabaseInfiniteQuery(
    `users_${schoolId}_${searchQuery}`,
    fetchUsersQuery,
    {
      pageSize: 20,
      dependencies: [schoolId, searchQuery] // Re-fetch when schoolId or searchQuery changes
    }
  );

  const onRefresh = React.useCallback(() => {
    refetch();
  }, [refetch]);

  const openModal = (user) => {
    setSelectedUser(user);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setSelectedUser(null);
    setIsModalVisible(false);
  };

  const handleRoleChange = async (newRole) => {
    if (!selectedUser) return;
    if (selectedUser.role === newRole) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', selectedUser.id)
        .select();

      if (error) {
        showToast('Failed to update user role.', 'error');
      } else if (!data || data.length === 0) {
        showToast('Update failed: No permissions.', 'error');
      } else {
        showToast('User role updated successfully.', 'success');
        
        setUsers(prevUsers => 
          prevUsers.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u)
        );
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    } catch (err) {
      showToast('An unexpected error occurred.', 'error');
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <FontAwesomeIcon icon={faArrowLeft} size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>{fromDashboard ? 'Return to Dashboard' : 'Back to Management'}</Text>
      </TouchableOpacity>
      <Text style={styles.header}>User Management</Text>
      <Text style={styles.description}>Manage all users within your school. Press on a user to view their details.</Text>
      <TextInput
        style={[styles.searchInput, isSearchFocused && styles.searchInputFocused, { color: '#333' }]}
        placeholder="Search by name..."
        placeholderTextColor="#666"
        value={searchQuery}
        onChangeText={setSearchQuery} // Updates state -> triggers dependency -> re-fetches
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
      />
      <FlatList
        data={loading ? [1, 2, 3, 4, 5] : users}
        keyExtractor={(item, index) => loading ? index.toString() : item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        getItemLayout={(data, index) => (
          { length: 86, offset: 86 * index, index }
        )}
        renderItem={({ item }) => loading ? (
          <UserItemSkeleton />
        ) : (
          <TouchableOpacity onPress={() => openModal(item)}>
            <View style={styles.userItem}>
              <Image
                source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage}
                style={styles.avatar}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.full_name}</Text>
                <Text style={styles.userRole}>{item.role.charAt(0).toUpperCase() + item.role.slice(1)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading && <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>No users found.</Text>}
      />
      {selectedUser && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <FontAwesomeIcon icon={faTimes} size={20} color="#333" />
              </TouchableOpacity>
              <Image
                source={selectedUser.avatar_url ? { uri: selectedUser.avatar_url } : defaultUserImage}
                style={styles.modalAvatar}
              />
              <Text style={styles.modalHeader}>{selectedUser.full_name}</Text>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Email:</Text>
                <Text style={styles.modalValue}>{selectedUser.email}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Role:</Text>
                <Picker
                  selectedValue={selectedUser.role}
                  style={styles.picker}
                  itemStyle={{ color: '#333' }}
                  dropdownIconColor="#333"
                  onValueChange={(itemValue) => handleRoleChange(itemValue)}
                >
                  <Picker.Item label="Admin" value="admin" color="#333" />
                  <Picker.Item label="Parent" value="parent" color="#333" />
                  <Picker.Item label="Student" value="student" color="#333" />
                  <Picker.Item label="Teacher" value="teacher" color="#333" />
                </Picker>
              </View>
              <Text style={styles.roleDescription}>Select a role to update the user's permissions.</Text>
              <Text style={[styles.modalValue, styles.modalId]}>{selectedUser.id}</Text>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInputFocused: {
    borderColor: '#007AFF',
  },
  userItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  userInfo: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    width: 50,
  },
  modalValue: {
    fontSize: 16,
  },
  modalId: {
    color: '#999',
    fontSize: 12,
  },
  picker: {
    flex: 1,
  },
  roleDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
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
