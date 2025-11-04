import React, { useState, useContext } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import * as DocumentPicker from 'expo-document-picker';

const CreateAssignmentScreen = ({ navigation }) => {
  const { schoolData: school } = useSchool();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState(null);

  const handleCreate = async () => {
    if (!title || !description || !dueDate) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    let file_url = null;
    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(filePath, file);

      if (uploadError) {
        Alert.alert('Error uploading file', uploadError.message);
        return;
      }

      const { data: publicUrlData, error: urlError } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);

      if (urlError) {
        Alert.alert('Error getting public URL', urlError.message);
        return;
      }
      file_url = publicUrlData.publicUrl;
    }

    const { error } = await supabase.from('assignments').insert([
      {
        title,
        description,
        due_date: dueDate,
        class_id: school.id,
        assigned_by: user.id,
        created_by: user.id,
        file_url,
      },
    ]);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Assignment created successfully.');
      navigation.goBack();
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (result.type === 'success') {
        setFile(result);
      }
    } catch (err) {
      console.error('Error picking document:', err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Assignment</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput
        style={styles.input}
        placeholder="Due Date (YYYY-MM-DD)"
        value={dueDate}
        onChangeText={setDueDate}
      />
      <View style={styles.filePickerContainer}>
        <Button title="Pick a file" onPress={pickDocument} />
        {file && <Text style={styles.fileName}>{file.name}</Text>}
      </View>
      <Button title="Create Assignment" onPress={handleCreate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  filePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileName: {
    marginLeft: 16,
    fontSize: 16,
  },
});

export default CreateAssignmentScreen;
