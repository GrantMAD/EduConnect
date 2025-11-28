import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Platform, TextInput, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import SchoolDataScreenSkeleton from '../components/skeletons/SchoolDataScreenSkeleton';
import { faImage, faArrowLeft, faBuilding, faMapMarkerAlt, faEnvelope, faPhone, faGraduationCap, faChevronDown, faSchool, faTimes } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-native-modal';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from 'buffer';
import { useSchool } from '../context/SchoolContext';
import { useToast } from '../context/ToastContext';

export default function SchoolDataScreen({ navigation, route }) {
  const { fromDashboard } = route?.params || {};
  const { schoolId, loadingSchool } = useSchool();
  const [schoolData, setSchoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoLocalUri, setLogoLocalUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [schoolType, setSchoolType] = useState('Primary School');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const schoolTypes = ['Primary School', 'High School', 'University', 'College', 'Other'];

  const { showToast } = useToast();

  useEffect(() => {
    if (loadingSchool) return;

    if (schoolId) {
      fetchSchoolData();
    } else {
      setLoading(false);
    }
  }, [schoolId, loadingSchool]);

  const fetchSchoolData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (error) throw error;
      if (error) throw error;
      setSchoolData(data);
      setName(data.name || '');
      setAddress(data.address || '');
      setContactEmail(data.contact_email || '');
      setContactPhone(data.contact_phone || '');
      setSchoolType(data.school_type || 'Primary School');
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
        name,
        address,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        school_type: schoolType,
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <FontAwesomeIcon icon={faArrowLeft} size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>{fromDashboard ? 'Return to Dashboard' : 'Back to Management'}</Text>
      </TouchableOpacity>
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

      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <FontAwesomeIcon icon={faSchool} size={20} color="#007AFF" style={{ marginRight: 10 }} />
          <Text style={styles.sectionHeader}>School Details</Text>
        </View>
        <Text style={styles.sectionDescription}>Update your school's contact information.</Text>

        {/* Name */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelRow}>
            <FontAwesomeIcon icon={faBuilding} size={16} color="#007AFF" style={{ marginRight: 8 }} />
            <Text style={styles.inputLabel}>School Name</Text>
          </View>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="School Name"
          />
        </View>

        {/* Address */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelRow}>
            <FontAwesomeIcon icon={faMapMarkerAlt} size={16} color="#007AFF" style={{ marginRight: 8 }} />
            <Text style={styles.inputLabel}>Address</Text>
          </View>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Address"
          />
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelRow}>
            <FontAwesomeIcon icon={faEnvelope} size={16} color="#007AFF" style={{ marginRight: 8 }} />
            <Text style={styles.inputLabel}>Contact Email</Text>
          </View>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="Contact Email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Phone */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelRow}>
            <FontAwesomeIcon icon={faPhone} size={16} color="#007AFF" style={{ marginRight: 8 }} />
            <Text style={styles.inputLabel}>Contact Number</Text>
          </View>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={(text) => setContactPhone(text.replace(/[^0-9]/g, ''))}
            placeholder="Contact Number"
            keyboardType="phone-pad"
          />
        </View>

        {/* School Type */}
        <View style={styles.inputContainer}>
          <View style={styles.inputLabelRow}>
            <FontAwesomeIcon icon={faGraduationCap} size={16} color="#007AFF" style={{ marginRight: 8 }} />
            <Text style={styles.inputLabel}>School Type</Text>
          </View>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={styles.dropdownButtonText}>{schoolType}</Text>
            <FontAwesomeIcon icon={faChevronDown} size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        isVisible={showTypePicker}
        onBackdropPress={() => setShowTypePicker(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <FontAwesomeIcon icon={faGraduationCap} size={24} color="#007AFF" />
            <Text style={styles.modalTitle}>Select School Type</Text>
            <TouchableOpacity onPress={() => setShowTypePicker(false)} style={styles.modalCloseButton}>
              <FontAwesomeIcon icon={faTimes} size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {schoolTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.modalItem}
                onPress={() => {
                  setSchoolType(type);
                  setShowTypePicker(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  schoolType === type && styles.modalItemTextSelected
                ]}>
                  {type}
                </Text>
                {schoolType === type && (
                  <FontAwesomeIcon icon={faSchool} size={16} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>


      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving || uploading}>
        <Text style={styles.buttonText}>{saving || uploading ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
    </ScrollView >
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
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 15,
    flex: 1,
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
