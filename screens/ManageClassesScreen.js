import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useFocusEffect } from '@react-navigation/native';

export default function ManageClassesScreen({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const { schoolId } = useSchool();

  const fetchTeachersClasses = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
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
        Alert.alert('Error', 'School ID not available.');
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
      Alert.alert('Error', 'Failed to fetch classes.');
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
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
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

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.classCard}
            onPress={() => navigation.navigate('ManageUsersInClass', { classId: item.id, className: item.name })}
          >
            <Text style={styles.className}>{item.name}</Text>
            {item.subject && <Text style={styles.classDescription}>Subject: {item.subject}</Text>}
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
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
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
