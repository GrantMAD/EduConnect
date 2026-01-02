import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, TouchableOpacity, Platform, TextInput, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import SchoolDataScreenSkeleton from '../components/skeletons/SchoolDataScreenSkeleton';
import { SkeletonPiece } from '../components/skeletons/SettingsScreenSkeleton';
import { faImage, faArrowLeft, faBuilding, faMapMarkerAlt, faEnvelope, faPhone, faGraduationCap, faChevronDown, faSchool, faTimes } from '@fortawesome/free-solid-svg-icons';
import Modal from 'react-native-modal';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from 'buffer';
import * as Clipboard from 'expo-clipboard';
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

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [schoolType, setSchoolType] = useState('Primary School');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const schoolTypes = ['Primary School', 'High School', 'University', 'College', 'Other'];

  const { showToast } = useToast();
  const { theme } = useTheme();

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

  const copySchoolId = async () => {
    if (!schoolId) return;
    await Clipboard.setStringAsync(schoolId);
    showToast('School ID copied to clipboard!', 'success');
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#059669', '#0d9488']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHero}>
                        <FontAwesomeIcon icon={faArrowLeft} size={18} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.heroTitle}>Institutional Profile</Text>
                </View>
                <Text style={styles.heroDescription}>
                    Manage your school's identity, contact info, and presence.
                </Text>
            </View>
            {!loading && (
                <TouchableOpacity onPress={copySchoolId} style={styles.copyBadge}>
                    <FontAwesomeIcon icon={faCopy} size={14} color="#fff" />
                    <Text style={styles.copyBadgeText}>ID</Text>
                </TouchableOpacity>
            )}
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Logo Card */}
        <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Text style={styles.cardSectionLabel}>SCHOOL IMAGE</Text>
            {loading ? (
                <SkeletonPiece style={styles.logoImage} />
            ) : (
                <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={styles.logoContainer}>
                    {logoLocalUri || schoolData?.logo_url ? (
                        <Image source={{ uri: logoLocalUri || schoolData.logo_url }} style={styles.logoImage} />
                    ) : (
                        <View style={[styles.logoPlaceholder, { backgroundColor: theme.colors.background }]}>
                            <FontAwesomeIcon icon={faSchool} size={40} color={theme.colors.placeholder} />
                            <Text style={{ color: theme.colors.placeholder, marginTop: 8, fontWeight: '700' }}>No Image</Text>
                        </View>
                    )}
                    <View style={styles.cameraOverlay}>
                        <FontAwesomeIcon icon={faCamera} size={20} color="#fff" />
                    </View>
                </TouchableOpacity>
            )}
            <Text style={[styles.imageHint, { color: theme.colors.placeholder }]}>Recommended 16:9 aspect ratio</Text>
        </View>

        {/* Details Card */}
        <View style={[styles.formCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
            <Text style={styles.cardSectionLabel}>INSTITUTIONAL DETAILS</Text>
            
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SCHOOL NAME</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faBuilding} size={14} color={theme.colors.primary} />
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter school name"
                        placeholderTextColor={theme.colors.placeholder}
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SCHOOL TYPE</Text>
                <TouchableOpacity
                    style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                    onPress={() => setShowTypePicker(true)}
                >
                    <FontAwesomeIcon icon={faGraduationCap} size={14} color={theme.colors.primary} />
                    <Text style={[styles.input, { color: theme.colors.text, lineHeight: 20, paddingTop: 12 }]}>{schoolType}</Text>
                    <FontAwesomeIcon icon={faChevronDown} size={12} color={theme.colors.placeholder} />
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONTACT EMAIL</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faEnvelope} size={14} color={theme.colors.primary} />
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        value={contactEmail}
                        onChangeText={setContactEmail}
                        placeholder="admin@school.edu"
                        placeholderTextColor={theme.colors.placeholder}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONTACT PHONE</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faPhone} size={14} color={theme.colors.primary} />
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        value={contactPhone}
                        onChangeText={(text) => setContactPhone(text.replace(/[^0-9]/g, ''))}
                        placeholder="+27..."
                        placeholderTextColor={theme.colors.placeholder}
                        keyboardType="phone-pad"
                    />
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CAMPUS ADDRESS</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                    <FontAwesomeIcon icon={faMapMarkerAlt} size={14} color={theme.colors.primary} style={{ marginTop: 4 }} />
                    <TextInput
                        style={[styles.input, { color: theme.colors.text, height: 80 }]}
                        value={address}
                        onChangeText={setAddress}
                        placeholder="Enter physical address"
                        placeholderTextColor={theme.colors.placeholder}
                        multiline
                        textAlignVertical="top"
                    />
                </View>
            </View>
        </View>

        <TouchableOpacity 
            style={[styles.saveBtnContainer, { marginTop: 30 }]} 
            onPress={handleSave} 
            disabled={saving || uploading}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#059669', '#0d9488']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
            >
                {saving || uploading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveBtnText}>Save Profile</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        isVisible={showTypePicker}
        onBackdropPress={() => setShowTypePicker(false)}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.5}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.cardBorder }]}>
            <FontAwesomeIcon icon={faGraduationCap} size={20} color={theme.colors.primary} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Institution Type</Text>
            <TouchableOpacity onPress={() => setShowTypePicker(false)}>
              <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {schoolTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.modalItem, { borderBottomColor: theme.colors.cardBorder + '30' }]}
                onPress={() => {
                  setSchoolType(type);
                  setShowTypePicker(false);
                }}
              >
                <Text style={[
                  styles.modalItemText,
                  { color: theme.colors.text },
                  schoolType === type && { color: theme.colors.primary, fontWeight: '900' }
                ]}>
                  {type}
                </Text>
                {schoolType === type && (
                  <FontAwesomeIcon icon={faSchool} size={16} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  copyButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
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
