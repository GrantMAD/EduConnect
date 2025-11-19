import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useSchool } from '../../context/SchoolContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ManagementListSkeleton from '../../components/skeletons/ManagementListSkeleton';
import { faBook, faChalkboardTeacher } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';

export default function ManageClassesScreen({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const { schoolId } = useSchool();
  const { showToast } = useToast();

  const fetchTeachersClasses = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast('User not authenticated.', 'error');
        setLoading(false);
        return;
      }

      // Fetch user role
      const { data: userData, error: userRoleError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userRoleError) throw userRoleError;
      setUserRole(userData.role);

      if (!schoolId) {
        showToast('School ID not available.', 'error');
        setLoading(false);
        return;
      }

      let query = supabase
        .from('classes')
        .select('id, name, subject, teacher_id') // Updated select query
        .eq('school_id', schoolId);

      if (userData.role === 'teacher') {
        query = query.eq('teacher_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error.message);
      showToast('Failed to fetch classes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTeachersClasses();
    }, [schoolId])
  );

  if (loading) {
    return <ManagementListSkeleton />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Manage Classes</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateClass')}
        >
          <Text style={styles.createButtonText}>+ Create Class</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.description}>Here you can manage your classes. You can create new classes, and manage existing ones.</Text>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.classCard}
            onPress={() => navigation.navigate('ManageUsersInClass', { classId: item.id, className: item.name })}
          >
            <View style={styles.cardRow}>
              <FontAwesomeIcon icon={faChalkboardTeacher} size={18} color="#007AFF" style={{ marginRight: 10 }} />
              <Text style={styles.className}>{item.name}</Text>
            </View>
            {item.subject && (
              <View style={styles.cardRow}>
                <FontAwesomeIcon icon={faBook} size={14} color="#007AFF" style={{ marginRight: 15 }} />
                <Text style={styles.classDescription}>Subject: {item.subject}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No classes found. Create one!</Text>}
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  classCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  classDescription: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
