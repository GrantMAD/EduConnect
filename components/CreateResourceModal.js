import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from '@react-native-picker/picker';
import { useSchool } from '../context/SchoolContext';
import { supabase } from '../lib/supabase';
import { useGamification } from '../context/GamificationContext';
import StandardBottomModal from './StandardBottomModal';
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export default function CreateResourceModal({ visible, onClose, initialData }) {
  const { showToast } = useToast();
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
  const [isPersonal, setIsPersonal] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setCategory(initialData.category || 'General');
      setIsPersonal(initialData.is_personal || false);
    } else {
      setTitle('');
      setDescription('');
      setCategory('General');
      setIsPersonal(false);
    }
  }, [initialData, visible]);

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

      let file_url = initialData?.file_url || null;

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

      const resourcePayload = {
        title,
        description,
        file_url,
        uploaded_by: user.id,
        category: finalCategory,
        school_id: schoolId,
        is_personal: isPersonal,
      };

      if (initialData) {
        // Update existing
        const { error } = await supabase
          .from('resources')
          .update(resourcePayload)
          .eq('id', initialData.id);
        if (error) throw error;
        showToast('Resource updated successfully', 'success');
      } else {
        // Save new to table
        await supabase.from('resources').insert([resourcePayload]);
        awardXP('resource_creation', 20);
        showToast('Resource added successfully', 'success');
      }

      // Reset UI
      onClose();
      if (!initialData) {
        setTitle('');
        setDescription('');
        setFile(null);
        setCategory('General');
        setCustomCategory('');
        setIsPersonal(false);
      }
    } catch (err) {
      console.error('Error saving resource:', err);
      showToast('Failed to save resource. Please try again.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <StandardBottomModal
      visible={visible}
      onClose={onClose}
      title={initialData ? "Edit Resource" : "Upload Resource"}
      icon={faCloudUploadAlt}
      description={initialData ? "Update your resource details" : "Share study materials, notes, and resources with your school community"}
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

        <View style={styles.toggleContainer}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: theme.colors.text }]}>Personal Resource</Text>
            <Text style={[styles.toggleSubLabel, { color: theme.colors.placeholder }]}>
              Only you will be able to see this resource
            </Text>
          </View>
          <Switch
            value={isPersonal}
            onValueChange={setIsPersonal}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
            thumbColor={isPersonal ? '#fff' : '#f4f3f4'}
          />
        </View>

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
            <Text style={[styles.buttonText, { color: '#fff' }]}>
              {initialData ? 'Save Changes' : 'Upload'}
            </Text>
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSubLabel: {
    fontSize: 12,
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
