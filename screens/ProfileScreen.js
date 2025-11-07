import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ProfileScreenSkeleton from '../components/skeletons/ProfileScreenSkeleton';
import { faEdit, faSave, faUserFriends, faGear, faEnvelope, faUser, faBriefcase, faAddressCard, faPhone, faMinus } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

export default function ProfileScreen() {
  const defaultUserImage = require('../assets/user.png');

  const [userData, setUserData] = useState({
    id: '',
    full_name: '',
    email: '',
    role: '',
    avatar_url: '',
    school_id: null,
    number: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarLocalUri, setAvatarLocalUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [associatedChildren, setAssociatedChildren] = useState([]);
  const [showManageChildren, setShowManageChildren] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (showManageChildren && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [showManageChildren]);

  useEffect(() => {
    if (userData.role === 'parent' && userData.school_id) {
      fetchStudentsAndChildren(userData.school_id, userData.id);
    }
  }, [userData.role, userData.school_id]);

  const fetchStudentsAndChildren = async (schoolId, parentId) => {
    try {
      // Fetch all students in the same school
      const { data: studentsData, error: studentsError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('school_id', schoolId)
        .eq('role', 'student');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch already associated children
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('parent_child_relationships')
        .select('child_id')
        .eq('parent_id', parentId);

      if (relationshipsError) throw relationshipsError;
      setAssociatedChildren(relationshipsData.map(rel => rel.child_id) || []);

    } catch (error) {
      console.error('Error fetching students or relationships:', error.message);
      Alert.alert('Error', 'Failed to load student data.');
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("No user logged in");

      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!data) {
        const { data: insertData, error: insertError } = await supabase.from('users').insert({
          id: user.id,
          full_name: '',
          email: user.email,
          role: 'user',
        }).select().maybeSingle();

        if (insertError) throw insertError;
        data = insertData;
      }

      if (data) {
        setUserData({
          id: user.id,
          full_name: data.full_name || '',
          email: data.email || '',
          role: data.role || '',
          avatar_url: data.avatar_url || '',
          school_id: data.school_id || null,
        });
      } else {
        throw new Error("Could not fetch or create user profile.");
      }
    } catch (error) {
      console.error(error.message);
      Alert.alert('Error', 'Failed to fetch profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    setIsEditing(false);
    setShowManageChildren(false);
    fetchUserData();
    setAvatarLocalUri(null);
  };

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library access to upload photos.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarLocalUri(result.assets[0].uri);
    }
  };

  const deleteOldAvatar = async (avatarUrl) => {
    if (!avatarUrl) return;
    try {
      const url = new URL(avatarUrl);
      const path = url.pathname;
      const prefix = "/storage/v1/object/public/avatars/";
      if (!path.startsWith(prefix)) return;
      const filePath = path.slice(prefix.length);

      const { error } = await supabase.storage.from('avatars').remove([filePath]);
      if (error) console.warn("Failed to delete old avatar:", error.message);
    } catch (error) {
      console.warn("Error deleting old avatar:", error.message);
    }
  };

  const uploadAvatar = async (uri) => {
    setUploading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError || new Error("No user logged in");

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const buffer = Buffer.from(base64, "base64");

      const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}_avatar_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      const contentType = `image/${fileExt === "jpg" ? "jpeg" : fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, { cacheControl: "3600", upsert: true, contentType });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return publicData?.publicUrl || null;
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert('Error', 'Failed to upload avatar.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Delete old avatar if replaced
      if (avatarLocalUri && userData.avatar_url) {
        await deleteOldAvatar(userData.avatar_url);
      }

      let avatarUrl = userData.avatar_url;
      if (avatarLocalUri) {
        const uploadedUrl = await uploadAvatar(avatarLocalUri);
        if (uploadedUrl) avatarUrl = uploadedUrl;
      }

      const { error } = await supabase.from('users').update({
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        avatar_url: avatarUrl,
        number: userData.number,
      }).eq('id', user.id);

      if (error) throw error;

      setUserData(prev => ({ ...prev, avatar_url: avatarUrl }));
      setAvatarLocalUri(null);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendAssociationRequest = async () => {
    if (selectedStudents.length === 0) {
      Alert.alert('Error', 'Please select at least one student.');
      return;
    }

    setSaving(true); 
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");

      const requestsToInsert = selectedStudents.map(childId => ({
        parent_id: user.id,
        child_id: childId,
        status: 'pending',
      }));

      const { error: requestError } = await supabase
        .from('parent_child_requests')
        .insert(requestsToInsert);

      if (requestError) throw requestError;

      // Create notifications for each child
      const notificationsToInsert = selectedStudents.map(childId => {
        const child = students.find(s => s.id === childId);
        return {
          user_id: childId,
          type: 'parent_child_request',
          title: 'Parent Association Request',
          message: `Your parent ${userData.full_name || userData.email} wants to associate with you.`, 
          is_read: false,
          related_user_id: user.id, 
        };
      });

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (notificationError) throw notificationError;

      Alert.alert('Success', 'Association requests sent successfully!');
      setSelectedStudents([]); 
    } catch (error) {
      console.error('Error sending association request:', error.message);
      Alert.alert('Error', 'Failed to send association requests.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveChild = (childId, childName) => {
    Alert.alert(
      'Remove Student',
      `Are you sure you want to remove ${childName} from your associated children? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error("User not authenticated.");

              const { error } = await supabase
                .from('parent_child_relationships')
                .delete()
                .eq('parent_id', user.id)
                .eq('child_id', childId);

              if (error) throw error;

              setAssociatedChildren(prev => prev.filter(id => id !== childId));
              Alert.alert('Success', `${childName} has been removed.`);
            } catch (error) {
              console.error('Error removing child:', error.message);
              Alert.alert('Error', 'Failed to remove child.');
            } finally {
              setSaving(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return <ProfileScreenSkeleton />;
  }

  return (
    <ScrollView ref={scrollViewRef} contentContainerStyle={styles.container}>
      {/* Profile Image and Description */}
      {isEditing ? (
        <TouchableOpacity onPress={pickImage} activeOpacity={0.7} style={{ marginBottom: 16 }}>
          <Image source={avatarLocalUri ? { uri: avatarLocalUri } : (userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage)} style={styles.avatar} />
          <Text style={{ textAlign: 'center', color: '#007AFF', marginTop: 4 }}>Tap to change photo</Text>
        </TouchableOpacity>
      ) : (
        <Image source={userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage} style={styles.avatar} />
      )}

      <Text style={styles.header}>My Profile</Text>
      <Text style={styles.description}>View and edit your profile information.</Text>

      {/* User Information */}
      <View style={styles.sectionHeaderContainer}>
        <FontAwesomeIcon icon={faAddressCard} size={20} color="#007AFF" style={styles.sectionHeaderIcon} />
        <Text style={styles.sectionTitle}>Personal Information</Text>
      </View>
      <View style={{ alignSelf: 'stretch' }}>
        <Text style={styles.sectionDescription}>Manage your personal details and account settings.</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <FontAwesomeIcon icon={faUser} size={16} color="#666" style={styles.infoIcon} />
          <Text style={styles.label}>Full Name</Text>
        </View>
        {isEditing ? (
          <TextInput style={styles.input} value={userData.full_name} onChangeText={text => setUserData({ ...userData, full_name: text })} placeholder="Enter full name" />
        ) : (
          <Text style={styles.value}>{userData.full_name}</Text>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <FontAwesomeIcon icon={faEnvelope} size={16} color="#666" style={styles.infoIcon} />
          <Text style={styles.label}>Email</Text>
        </View>
        <Text style={styles.value}>{userData.email}</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <FontAwesomeIcon icon={faPhone} size={16} color="#666" style={styles.infoIcon} />
          <Text style={styles.label}>Phone Number</Text>
        </View>
        {isEditing ? (
          <TextInput style={styles.input} value={userData.number} onChangeText={text => setUserData({ ...userData, number: text })} placeholder="Enter phone number" />
        ) : (
          <Text style={styles.value}>{userData.number || 'Not provided'}</Text>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <FontAwesomeIcon icon={faBriefcase} size={16} color="#666" style={styles.infoIcon} />
          <Text style={styles.label}>Role</Text>
        </View>
        <Text style={styles.value}>{userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</Text>
      </View>

      {!isEditing && (
        <TouchableOpacity style={styles.editProfileButton} onPress={handleEdit}>
          <FontAwesomeIcon icon={faEdit} size={18} color="#fff" />
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      {isEditing && (
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.separator} />
      {/* My Children (for Parents) */}
      {userData.role === 'parent' && (
        <>
          <View style={styles.sectionHeaderContainer}>
            <FontAwesomeIcon icon={faUserFriends} size={20} color="#007AFF" style={styles.sectionHeaderIcon} />
            <Text style={styles.sectionTitle}>My Children</Text>
            <TouchableOpacity onPress={() => setShowManageChildren(!showManageChildren)} style={styles.manageChildrenButton}>
              <Text style={styles.manageChildrenButtonText}>{showManageChildren ? 'Close' : 'Manage Children'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ alignSelf: 'stretch' }}>
            <Text style={styles.sectionDescription}>View and manage your associated children.</Text>
          </View>

          <View style={styles.associatedChildrenContainer}>
            {associatedChildren.length === 0 ? (
              <Text style={styles.noChildrenText}>No children associated yet.</Text>
            ) : (
              associatedChildren.map(childId => {
                const child = students.find(s => s.id === childId);
                return child ? (
                  <View key={child.id} style={styles.childItem}>
                    <FontAwesomeIcon icon={faUserFriends} size={16} color="#666" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childName}>{child.full_name || 'N/A'}</Text>
                      <Text style={styles.childEmail}>{child.email || 'N/A'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveChild(child.id, child.full_name || child.email)}
                      style={{
                        marginLeft: 'auto',
                        backgroundColor: '#d9534f',
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <FontAwesomeIcon icon={faMinus} size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : null;
              })
            )}
          </View>

          {/* Manage Children Area (conditionally rendered) */}
          {showManageChildren && (
            <View style={styles.manageChildrenSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 10 }}>
                <FontAwesomeIcon icon={faUserFriends} size={18} color="#007AFF" style={{ marginRight: 10 }} />
                <Text style={styles.manageChildrenHeader}>Manage Children</Text>
              </View>
              <Text style={styles.sectionDescription}>Search for students to send association requests. You can search by name or email.</Text>

              {/* Student Search Input */}
              <TextInput
                style={styles.input}
                placeholder="Search for students"
                value={studentSearch}
                onChangeText={setStudentSearch}
              />

              {/* Student List for Selection */}
              <View style={styles.studentListContainer}>
                {students.filter(student =>
                  !associatedChildren.includes(student.id) &&
                  student.id !== userData.id &&
                  (student.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                   student.email?.toLowerCase().includes(studentSearch.toLowerCase()))
                ).map(student => (
                  <TouchableOpacity
                    key={student.id}
                    style={styles.studentItem}
                    onPress={() => {
                      setSelectedStudents(prev =>
                        prev.includes(student.id)
                          ? prev.filter(id => id !== student.id)
                          : [...prev, student.id]
                      );
                    }}
                  >
                    <FontAwesomeIcon icon={faUserFriends} size={16} color="#666" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childName}>{student.full_name || 'N/A'}</Text>
                      <Text style={styles.childEmail}>{student.email || 'N/A'}</Text>
                    </View>
                    <View style={[selectedStudents.includes(student.id) ? styles.checkboxChecked : styles.checkboxUnchecked, { marginLeft: 'auto' }]} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Send Request Button */}
              {selectedStudents.length > 0 && (
                <TouchableOpacity style={styles.button} onPress={handleSendAssociationRequest} disabled={saving}>
                  <Text style={styles.buttonText}>Send Association Request ({selectedStudents.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f8f9fa', padding: 24, alignItems: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#007AFF', marginBottom: 16 },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  description: { fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center' },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 20,
    alignSelf: 'stretch',
  },
  sectionHeaderIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  manageChildrenButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  manageChildrenButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  infoContainer: { width: '100%', marginBottom: 16, alignSelf: 'flex-start' },
  label: { fontSize: 14, fontWeight: 'bold' },
  value: { fontSize: 16, color: '#333' },
  input: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0', width: '100%' },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#007AFF' },
  cancelButtonText: { color: '#007AFF' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    marginRight: 10,
  },
  editProfileButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  editProfileButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  manageChildrenHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  manageChildrenSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignSelf: 'flex-start',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  studentListContainer: {
    marginTop: 10,
    marginBottom: 20,
    maxHeight: 200,
    borderRadius: 8,
    width: '100%',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: '100%',
  },
  studentName: {
    fontSize: 16,
  },
  checkboxUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  associatedChildrenContainer: {
    marginTop: 10,
    alignSelf: 'flex-start',
    width: '100%',
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    width: '100%',
  },
  childName: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  childEmail: {
    fontSize: 14,
    color: '#666',
  },
  noChildrenText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
});
