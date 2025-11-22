import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, FlatList, TouchableOpacity, Modal, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { Picker } from '@react-native-picker/picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import UserManagementScreenSkeleton from '../components/skeletons/UserManagementScreenSkeleton';
import { faTimes, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../context/ToastContext';

const defaultUserImage = require('../assets/user.png');

export default function UserManagementScreen({ navigation, route }) {
  const { fromDashboard } = route?.params || {};
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentUserData, error: currentUserError } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (currentUserError) {
          console.error('Error fetching current user data:', currentUserError);
          setLoading(false);
          return;
        }

        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('school_id', currentUserData.school_id);

        if (usersError) {
          console.error('Error fetching users:', usersError);
        } else {
          const sortedUsers = usersData.sort((a, b) => {
            if (a.role === 'admin' && b.role !== 'admin') return -1;
            if (a.role !== 'admin' && b.role === 'admin') return 1;
            return 0;
          });
          setUsers(sortedUsers);
        }
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

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

    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', selectedUser.id);

    if (error) {
      showToast('Failed to update user role.', 'error');
    } else {
      showToast('User role updated successfully.', 'success');
      // Update the local state to reflect the change immediately
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
      setSelectedUser({ ...selectedUser, role: newRole });
    }
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <UserManagementScreenSkeleton />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <FontAwesomeIcon icon={faArrowLeft} size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>{fromDashboard ? 'Return to Dashboard' : 'Back to Management'}</Text>
      </TouchableOpacity>
      <Text style={styles.header}>User Management</Text>
      <Text style={styles.description}>Manage all users within your school. Press on a user to view their details.</Text>
      <TextInput
        style={[styles.searchInput, isSearchFocused && styles.searchInputFocused]}
        placeholder="Search by name..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFocus={() => setIsSearchFocused(true)}
        onBlur={() => setIsSearchFocused(false)}
      />
      <FlatList
        data={filteredUsers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
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
                  onValueChange={(itemValue) => handleRoleChange(itemValue)}
                >
                  <Picker.Item label="Admin" value="admin" />
                  <Picker.Item label="Parent" value="parent" />
                  <Picker.Item label="Student" value="student" />
                  <Picker.Item label="Teacher" value="teacher" />
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
