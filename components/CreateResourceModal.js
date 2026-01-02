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
      title={initialData ? "Refine Resource" : "Create Resource"}
      icon={faCloudUploadAlt}
      description={initialData ? "Update your resource metadata." : "Share academic materials with the community."}
    >
      <View style={styles.content}>
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: '#94a3b8' }]}>TITLE</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, color: theme.colors.text }]}
                placeholder="Enter resource title"
                placeholderTextColor={theme.colors.placeholder}
                value={title}
                onChangeText={setTitle}
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: '#94a3b8' }]}>DESCRIPTION</Text>
            <TextInput
                style={[styles.input, styles.descInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, color: theme.colors.text }]}
                placeholder="Details about this resource..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
                value={description}
                onChangeText={setDescription}
            />
        </View>

        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: '#94a3b8' }]}>CATEGORY</Text>
            <View style={[styles.pickerContainer, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card, borderWidth: 1 }]}>
                <Picker
                    selectedValue={category}
                    onValueChange={(itemValue) => setCategory(itemValue)}
                    style={[styles.picker, { color: theme.colors.text }]}
                    dropdownIconColor={theme.colors.text}
                >
                    <Picker.Item label="General Overview" value="General" />
                    <Picker.Item label="Homework Related" value="Homework" />
                    <Picker.Item label="Study Material" value="Study Guide" />
                    <Picker.Item label="Class Notes" value="Notes" />
                    <Picker.Item label="Custom Category" value="custom" />
                </Picker>
            </View>
        </View>

        {category === 'custom' && (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: '#94a3b8' }]}>CUSTOM LABEL</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, color: theme.colors.text }]}
                placeholder="Enter custom category name"
                placeholderTextColor={theme.colors.placeholder}
                value={customCategory}
                onChangeText={setCustomCategory}
            />
          </View>
        )}

        <TouchableOpacity
            style={[styles.toggleCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
            onPress={() => setIsPersonal(!isPersonal)}
            activeOpacity={0.7}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>Personal Resource</Text>
            <Text style={[styles.toggleSub, { color: theme.colors.placeholder }]}>
              VISIBLE ONLY TO YOU
            </Text>
          </View>
          <Switch
            value={isPersonal}
            onValueChange={setIsPersonal}
            trackColor={{ false: theme.colors.cardBorder, true: theme.colors.primary }}
            thumbColor={'#fff'}
          />
        </TouchableOpacity>

        <View style={styles.actionRow}>
            <TouchableOpacity
                style={[styles.fileBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                onPress={pickDocument}
            >
                <Text style={[styles.fileBtnText, { color: theme.colors.text }]} numberOfLines={1}>
                    {file ? file.name.toUpperCase() : 'SELECT DOCUMENT'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleUpload}
                disabled={isUploading}
                activeOpacity={0.8}
            >
                {isUploading ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <Text style={styles.uploadBtnText}>
                        {initialData ? 'SAVE CHANGES' : 'PUBLISH'}
                    </Text>
                )}
            </TouchableOpacity>
        </View>
      </View>
    </StandardBottomModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
  },
  inputGroup: {
      marginBottom: 20,
  },
  label: {
      fontSize: 9,
      fontWeight: '900',
      marginBottom: 8,
      letterSpacing: 1.5,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontWeight: '700',
  },
  descInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 56,
    width: '100%',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  toggleSub: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
  },
  fileBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  fileBtnText: {
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  uploadBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
});
