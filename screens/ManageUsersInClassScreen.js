import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useRoute } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';

export default function ManageUsersInClassScreen() {
  const route = useRoute();
  const { classId, className } = route.params;

  const [classStudents, setClassStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const { schoolId } = useSchool();

  useEffect(() => {
    if (schoolId && classId) {
      fetchClassDetails();
      fetchAllStudents();
    }
  }, [schoolId, classId]);

  const fetchClassDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('users') // Fetch 'users' array
        .eq('id', classId)
        .single();

      if (error) throw error;

      if (data && data.users) {
        // Fetch full student details for students in this class
        const { data: studentDetails, error: studentDetailsError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', data.users);

        if (studentDetailsError) throw studentDetailsError;
        setClassStudents(studentDetails || []);
      }
    } catch (error) {
      console.error('Error fetching class details:', error.message);
      Alert.alert('Error', 'Failed to fetch class details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudents = async () => {
    setFetchingStudents(true);
    try {
      let query = supabase
        .from('users')
        .select('id, full_name, email')
        .eq('school_id', schoolId)
        .eq('role', 'student');

      if (searchQuery) {
        query = query.ilike('full_name', `%{searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAllStudents(data);
    } catch (error) {
      console.error('Error fetching all students:', error.message);
      Alert.alert('Error', 'Failed to fetch all students.');
    } finally {
      setFetchingStudents(false);
    }
  };

  const addStudentToClass = async (studentId) => {
    setSaving(true);
    try {
      const currentStudentIds = classStudents.map(s => s.id);
      const newStudentIds = [...new Set([...currentStudentIds, studentId])];

      const { error } = await supabase
        .from('classes')
        .update({ users: newStudentIds }) // Update 'users' array
        .eq('id', classId);

      if (error) throw error;
      Alert.alert('Success', 'Student added to class.');
      fetchClassDetails(); // Re-fetch to update the list
    } catch (error) {
      console.error('Error adding student:', error.message);
      Alert.alert('Error', 'Failed to add student.');
    } finally {
      setSaving(false);
    }
  };

  const removeStudentFromClass = async (studentId) => {
    setSaving(true);
    try {
      const newStudentIds = classStudents.map(s => s.id).filter(id => id !== studentId);

      const { error } = await supabase
        .from('classes')
        .update({ users: newStudentIds }) // Update 'users' array
        .eq('id', classId);

      if (error) throw error;
      Alert.alert('Success', 'Student removed from class.');
      fetchClassDetails(); // Re-fetch to update the list
    } catch (error) {
      console.error('Error removing student:', error.message);
      Alert.alert('Error', 'Failed to remove student.');
    } finally {
      setSaving(false);
    }
  };

  const availableStudents = allStudents.filter(
    (student) => !classStudents.some((cs) => cs.id === student.id)
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Manage Students in {className}</Text>

      <Text style={styles.label}>Students in this Class</Text>
      {loading ? (
        <ActivityIndicator size="small" style={{ marginBottom: 10 }} />
      ) : (
        <FlatList
          data={classStudents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.studentItem}>
              <Text>{item.full_name} ({item.email})</Text>
              <TouchableOpacity onPress={() => removeStudentFromClass(item.id)} disabled={saving}>
                <FontAwesomeIcon icon={faMinusCircle} size={20} color="#dc3545" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No students in this class.</Text>}
          style={styles.studentList}
        />
      )}

      <Text style={styles.label}>Add More Students</Text>
      <TextInput
        style={styles.input}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search for students to add..."
      />

      {fetchingStudents ? (
        <ActivityIndicator size="small" style={{ marginBottom: 10 }} />
      ) : (
        <FlatList
          data={availableStudents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.studentItem}>
              <Text>{item.full_name} ({item.email})</Text>
              <TouchableOpacity onPress={() => addStudentToClass(item.id)} disabled={saving}>
                <FontAwesomeIcon icon={faPlusCircle} size={20} color="#28a745" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No students available to add.</Text>}
          style={styles.studentList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
    marginTop: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  studentList: {
    maxHeight: 150,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  emptyText: {
    textAlign: 'center',
    padding: 10,
    color: '#666',
  },
});