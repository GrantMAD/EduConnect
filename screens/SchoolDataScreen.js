import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import SchoolDataScreenSkeleton from '../components/skeletons/SchoolDataScreenSkeleton';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from 'buffer';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';

export default function SchoolDataScreen() {
  const { schoolId } = useSchool();
  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoLocalUri, setLogoLocalUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (schoolId) {
      fetchSchoolData();
    }
  }, [schoolId]);

  const fetchSchoolData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (error) throw error;
      setSchoolData(data);
    } catch (error) {
      console.error(error.message);
      showToast('Failed to fetch school data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showToast('Please grant media library access to upload photos.', 'error');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLogoLocalUri(result.assets[0].uri);
    }
  };

  const uploadLogo = async (uri) => {
    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const buffer = Buffer.from(base64, "base64");

      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${schoolId}_logo_${Date.now()}.${fileExt}`;
      const filePath = `${schoolId}/${fileName}`;
      const contentType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('school_logos')
        .upload(filePath, buffer, { cacheControl: "3600", upsert: true, contentType });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('school_logos').getPublicUrl(filePath);
      return publicData?.publicUrl || null;
    } catch (error) {
      console.error("Upload error:", error);
      showToast('Failed to upload logo.', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = schoolData.logo_url;
      if (logoLocalUri) {
        const uploadedUrl = await uploadLogo(logoLocalUri);
        if (uploadedUrl) logoUrl = uploadedUrl;
      }

      const { error } = await supabase.from('schools').update({
        logo_url: logoUrl,
      }).eq('id', schoolId);

      if (error) throw error;

      setSchoolData(prev => ({ ...prev, logo_url: logoUrl }));
      setLogoLocalUri(null);
      showToast('School data updated successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update school data.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SchoolDataScreenSkeleton />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>School Data</Text>
      <Text style={styles.description}>
        Manage your school's data, including the main image displayed on the announcements screen.
      </Text>

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <FontAwesomeIcon icon={faImage} size={20} color="#007AFF" style={{ marginRight: 10 }} />
          <Text style={styles.sectionHeader}>School Image</Text>
        </View>
        <Text style={styles.sectionDescription}>Select an image of your school to display on the announcements screen.</Text>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.7} style={{ marginBottom: 16 }}>
          {logoLocalUri || schoolData?.logo_url ? (
            <Image source={{ uri: logoLocalUri || schoolData.logo_url }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>No image selected</Text>
            </View>
          )}
          <Text style={{ textAlign: 'center', color: '#007AFF', marginTop: 4 }}>Tap to change photo</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving || uploading}>
        <Text style={styles.buttonText}>{saving || uploading ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  logo: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
  },
  logoPlaceholderText: {
    color: '#6c757d',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
