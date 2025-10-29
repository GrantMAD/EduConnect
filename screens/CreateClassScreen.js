import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';

export default function CreateClassScreen({ navigation }) {
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState(''); // New state for subject
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchingStudents, setFetchingStudents] = useState(false);

  const { schoolId } = useSchool();

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [schoolId, searchQuery]);

  const fetchStudents = async () => {
    setFetchingStudents(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error.message);
      Alert.alert('Error', 'Failed to fetch students.');
    } finally {
      setFetchingStudents(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleCreateClass = async () => {
    if (!className || !subject) {
      Alert.alert('Error', 'Class Name and Subject cannot be empty.');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated.');
        setLoading(false);
        return;
      }

      if (!schoolId) {
        Alert.alert('Error', 'School ID not available. Cannot create class.');
        setLoading(false);
        return;
      }

      // Create the class
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({
          name: className,
          subject: subject, // Use subject instead of description
          school_id: schoolId,
          teacher_id: user.id, // Assign current teacher as class teacher
          users: selectedStudents, // Store student IDs in the class row as 'users' array
        })
        .select()
        .single();

      if (classError) throw classError;

      Alert.alert('Success', `Class '${className}' created successfully!`);
      navigation.goBack();
    } catch (error) {
      console.error('Error creating class:', error.message);
      Alert.alert('Error', 'Failed to create class.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create New Class</Text>

      <Text style={styles.label}>Class Name</Text>
      <TextInput
        style={styles.input}
        value={className}
        onChangeText={setClassName}
        placeholder="Enter class name (e.g., Math 101)"
      />

      <Text style={styles.label}>Subject</Text>
      <TextInput
        style={styles.input}
        value={subject}
        onChangeText={setSubject}
        placeholder="Enter subject (e.g., Mathematics)"
      />

      <Text style={styles.label}>Add Students</Text>
      <TextInput
        style={styles.input}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search students by name..."
      />

      {fetchingStudents ? (
        <ActivityIndicator size="small" style={{ marginBottom: 10 }} />
      ) : (
        <FlatList
          data={students.filter(s => !selectedStudents.includes(s.id))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.studentItem}
              onPress={() => toggleStudentSelection(item.id)}
            >
              <Text>{item.full_name} ({item.email})</Text>
              <FontAwesomeIcon icon={faPlusCircle} size={20} color="#28a745" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No students found.</Text>}
          style={styles.studentList}
        />
      )}

      <Text style={styles.label}>Selected Students</Text>
      {selectedStudents.length === 0 ? (
        <Text style={styles.emptyText}>No students selected.</Text>
      ) : (
        <FlatList
          data={students.filter(s => selectedStudents.includes(s.id))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.studentItem}
              onPress={() => toggleStudentSelection(item.id)}
            >
              <Text>{item.full_name} ({item.email})</Text>
              <FontAwesomeIcon icon={faMinusCircle} size={20} color="#dc3545" />
            </TouchableOpacity>
          )}
          style={styles.studentList}
        />
      )}

      <TouchableOpacity
        style={styles.createClassButton}
        onPress={handleCreateClass}
        disabled={loading}
      >
        <Text style={styles.createClassButtonText}>{loading ? 'Creating...' : 'Create Class'}</Text>
      </TouchableOpacity>
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
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  createClassButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  createClassButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
