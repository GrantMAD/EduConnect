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
import { Picker } from '@react-native-picker/picker';
import { useSchool } from '../context/SchoolContext';
import { supabase } from '../lib/supabase';
import { useGamification } from '../context/GamificationContext';
import StandardBottomModal from './StandardBottomModal';
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function CreateResourceModal({ visible, onClose }) {
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('General');
  const [customCategory, setCustomCategory] = useState('');
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
        const response = await fetch(file.uri); // keep original for Expo (safe)
        const arrayBuffer = await response.arrayBuffer();

        // STEP 4: Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, arrayBuffer, {
            contentType: file.mimeType,
          });

        if (uploadError) throw uploadError;

        // STEP 5: Get public URL for viewing later
        const { data: urlData } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        file_url = urlData.publicUrl;
      }

      const finalCategory = category === 'custom' ? customCategory : category;

      // Save to table
      await supabase.from('resources').insert([
        {
          title,
          description,
          file_url,
          uploaded_by: user.id,
          category: finalCategory,
          school_id: schoolId,
        },
      ]);
      awardXP('resource_creation', 20);

      // Reset UI
      onClose();
      setTitle('');
      setDescription('');
      setFile(null);
      setCategory('General');
      setCustomCategory('');
    } catch (err) {
      console.error('Error uploading resource:', err);
      alert('Failed to upload resource. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <StandardBottomModal
      visible={visible}
      onClose={onClose}
      title="Upload Resource"
      icon={faCloudUploadAlt}
      description="Share study materials, notes, and resources with your school community"
    >
      <View style={styles.content}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
          placeholder="Title"
          placeholderTextColor={theme.colors.placeholder}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.descInput, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
          placeholder="Description"
          placeholderTextColor={theme.colors.placeholder}
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <View style={[styles.pickerContainer, { borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}>
          <Picker
            selectedValue={category}
            onValueChange={(itemValue) => setCategory(itemValue)}
            style={[styles.picker, { color: theme.colors.text }]}
            dropdownIconColor={theme.colors.text}
          >
            <Picker.Item label="General" value="General" />
            <Picker.Item label="Homework" value="Homework" />
            <Picker.Item label="Study Guide" value="Study Guide" />
            <Picker.Item label="Notes" value="Notes" />
            <Picker.Item label="Create New Category" value="custom" />
          </Picker>
        </View>

        {category === 'custom' && (
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
            placeholder="Enter Custom Category"
            placeholderTextColor={theme.colors.placeholder}
            value={customCategory}
            onChangeText={setCustomCategory}
          />
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
          onPress={pickDocument}
        >
          <Text style={[styles.buttonText, { color: theme.colors.text }]}>
            {file ? file.name : 'Pick File'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.uploadButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={[styles.buttonText, { color: '#fff' }]}>Upload</Text>
          )}
        </TouchableOpacity>
      </View>
    </StandardBottomModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  descInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButton: {
    marginTop: 16,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
