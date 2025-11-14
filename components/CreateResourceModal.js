import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Picker } from '@react-native-picker/picker';
import { useSchool } from '../context/SchoolContext';
import { supabase } from '../lib/supabase';

export default function CreateResourceModal({ visible, onClose }) {
  const { schoolId } = useSchool();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('General');
  const [isUploading, setIsUploading] = useState(false);

  // Pick a document
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync();
    if (!result.canceled && result.assets && result.assets[0]) {
      setFile(result.assets[0]);
    }
  };

  // Upload resource to Supabase
  const handleUpload = async () => {
    if (!title || !description || !schoolId) return;

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let file_url = null;

      if (file) {
        let extractedName = file.name;

        // STEP 2: Clean the filename
        extractedName = extractedName.replace(/^[0-9_.-]+/, ''); // remove weird prefixes
        extractedName = extractedName.replace(/\s+/g, '_'); // remove spaces

        // Fallback if empty (should not happen but safe)
        if (!extractedName || !extractedName.includes('.')) {
          const ext = file.name.split('.').pop();
          extractedName = `file.${ext}`;
        }

        // STEP 3: Create final filename
        const finalFileName = `${user.id}_${extractedName}`;
        const filePath = `${user.id}/${finalFileName}`;

        // Wrap the file URI for uploading
        const blob = ReactNativeBlobUtil.wrap(file.uri);

        // STEP 4: Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, blob, {
            contentType: file.mimeType,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // STEP 5: Get public URL for viewing later
        const { data: urlData } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        file_url = urlData.publicUrl;
      }

      // Save to table
      await supabase.from('resources').insert([
        {
          title,
          description,
          file_url,
          uploaded_by: user.id,
          category,
          school_id: schoolId,
        },
      ]);

      // Reset UI
      onClose();
      setTitle('');
      setDescription('');
      setFile(null);
    } catch (err) {
      console.error('Error uploading resource:', err);
      alert('Failed to upload resource. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.header}>Upload Resource</Text>

          <TextInput
            style={styles.input}
            placeholder="Title"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, styles.descInput]}
            placeholder="Description"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="General" value="General" />
              <Picker.Item label="Homework" value="Homework" />
              <Picker.Item label="Study Guide" value="Study Guide" />
              <Picker.Item label="Notes" value="Notes" />
              <Picker.Item label="Video" value="Video" />
              <Picker.Item label="Other" value="Other" />
            </Picker>
          </View>

          <TouchableOpacity style={styles.button} onPress={pickDocument}>
            <Text style={styles.buttonText}>
              {file ? file.name : 'Pick File'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.uploadButton]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Upload</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '88%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  descInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
  },
  uploadButton: {
    backgroundColor: '#28A745',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  closeBtn: {
    marginTop: 8,
    alignItems: 'center',
  },
  closeText: {
    color: '#666',
  },
});
