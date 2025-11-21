import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ProfileScreenSkeleton from '../components/skeletons/ProfileScreenSkeleton';
import { faEdit, faSave, faUserFriends, faGear, faEnvelope, faUser, faBriefcase, faAddressCard, faPhone, faMinus, faTrophy, faMedal, faFire, faStore, faChartBar, faCoins, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import GamificationInfoModal from '../components/GamificationInfoModal';
import { BORDER_STYLES } from '../constants/GamificationStyles';

export default function ProfileScreen({ navigation }) {
  const defaultUserImage = require('../assets/user.png');
  const gamificationData = useGamification();
  const { current_level = 1, current_xp = 0, coins = 0, streak = {}, badges = [], equippedItem, loading: gamificationLoading, refreshGamificationState } = gamificationData || {};
  const [showGamificationInfo, setShowGamificationInfo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (refreshGamificationState) {
        refreshGamificationState();
      }
    }, [refreshGamificationState])
  );

  // Calculate progress
  const xpForNextLevel = 100; // Based on linear 100 XP per level
  const currentLevelProgress = current_xp % xpForNextLevel;
  const progressPercent = (currentLevelProgress / xpForNextLevel) * 100;

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
  const { showToast } = useToast();
  const { theme } = useTheme();

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
      showToast('Failed to load student data.', 'error');
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
          number: data.number || '',
        });
      } else {
        throw new Error("Could not fetch or create user profile.");
      }
    } catch (error) {
      console.error(error.message);
      showToast('Failed to fetch profile.', 'error');
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
        showToast('Please grant media library access to upload photos.', 'error');
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
      showToast('Failed to upload avatar.', 'error');
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
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendAssociationRequest = async () => {
    if (selectedStudents.length === 0) {
      showToast('Please select at least one student.', 'error');
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

      showToast('Association requests sent successfully!', 'success');
      setSelectedStudents([]);
    } catch (error) {
      console.error('Error sending association request:', error.message);
      showToast('Failed to send association requests.', 'error');
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
              showToast(`${childName} has been removed.`, 'success');
            } catch (error) {
              console.error('Error removing child:', error.message);
              showToast('Failed to remove child.', 'error');
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

  const borderStyle = equippedItem ? BORDER_STYLES[equippedItem.image_url] : { borderColor: theme.colors.primary, borderWidth: 2 };

  return (
    <ScrollView ref={scrollViewRef} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Profile Image and Description */}
      {isEditing ? (
        <TouchableOpacity onPress={pickImage} activeOpacity={0.7} style={{ marginBottom: 16 }}>
          <Image source={avatarLocalUri ? { uri: avatarLocalUri } : (userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage)} style={[styles.avatar, borderStyle]} />
          <Text style={{ textAlign: 'center', color: theme.colors.primary, marginTop: 4 }}>Tap to change photo</Text>
        </TouchableOpacity>
      ) : (
        <Image source={userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage} style={[styles.avatar, borderStyle]} />
      )}

      <Text style={[styles.header, { color: theme.colors.text }]}>My Profile</Text>

      {/* Gamification Card */}
      <View style={[styles.gamificationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={styles.levelContainer}>
          <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary }]}>
            <FontAwesomeIcon icon={faTrophy} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={[styles.levelText, { color: theme.colors.text }]}>Level {current_level}</Text>
            <Text style={[styles.xpText, { color: theme.colors.placeholder }]}>{current_xp} Total XP</Text>
          </View>
          <TouchableOpacity onPress={() => setShowGamificationInfo(true)} style={{ padding: 5 }}>
            <FontAwesomeIcon icon={faInfoCircle} size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
          <Text style={[styles.nextLevelText, { color: theme.colors.primary }]}>{Math.round(progressPercent)}% to Lvl {current_level + 1}</Text>
        </View>

        <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.inputBackground }]}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.colors.primary }]} />
        </View>

        {/* Stats Row: Streak & Coins */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <FontAwesomeIcon icon={faFire} size={20} color="#FF9500" />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{streak?.current_streak || 0}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <FontAwesomeIcon icon={faCoins} size={20} color="#FFD700" />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{coins}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>Coins</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <FontAwesomeIcon icon={faChartBar} size={16} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Leaderboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={() => navigation.navigate('Shop')}
          >
            <FontAwesomeIcon icon={faStore} size={16} color={theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Shop</Text>
          </TouchableOpacity>
        </View>

        {badges && badges.length > 0 && (
          <View style={styles.badgesContainer}>
            {badges.map((badge, index) => (
              <View key={index} style={styles.badgeItem}>
                <FontAwesomeIcon icon={faMedal} size={16} color="#FFD700" />
                <Text style={[styles.badgeText, { color: theme.colors.text }]}>{badge.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={[styles.description, { color: theme.colors.text }]}>View and edit your profile information.</Text>

      {/* User Information */}
      <View style={styles.sectionHeaderContainer}>
        <FontAwesomeIcon icon={faAddressCard} size={20} color={theme.colors.primary} style={styles.sectionHeaderIcon} />
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
      </View>
      <View style={{ alignSelf: 'stretch' }}>
        <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>Manage your personal details and account settings.</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <FontAwesomeIcon icon={faUser} size={16} color={theme.colors.placeholder} style={styles.infoIcon} />
          <Text style={[styles.label, { color: theme.colors.text }]}>Full Name</Text>
        </View>
        {isEditing ? (
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
            value={userData.full_name}
            onChangeText={text => setUserData({ ...userData, full_name: text })}
            placeholder="Enter full name"
            placeholderTextColor={theme.colors.placeholder}
          />
        ) : (
          <Text style={[styles.value, { color: theme.colors.text }]}>{userData.full_name}</Text>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <FontAwesomeIcon icon={faEnvelope} size={16} color={theme.colors.placeholder} style={styles.infoIcon} />
          <Text style={[styles.label, { color: theme.colors.text }]}>Email</Text>
        </View>
        <Text style={[styles.value, { color: theme.colors.text }]}>{userData.email}</Text>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <FontAwesomeIcon icon={faPhone} size={16} color={theme.colors.placeholder} style={styles.infoIcon} />
          <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
        </View>
        {isEditing ? (
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
            value={userData.number}
            onChangeText={text => setUserData({ ...userData, number: text })}
            placeholder="Enter phone number"
            placeholderTextColor={theme.colors.placeholder}
          />
        ) : (
          <Text style={[styles.value, { color: theme.colors.text }]}>{userData.number || 'Not provided'}</Text>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoRow}>
          <FontAwesomeIcon icon={faBriefcase} size={16} color={theme.colors.placeholder} style={styles.infoIcon} />
          <Text style={[styles.label, { color: theme.colors.text }]}>Role</Text>
        </View>
        <Text style={[styles.value, { color: theme.colors.text }]}>{userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</Text>
      </View>

      {!isEditing && (
        <TouchableOpacity style={[styles.editProfileButton, { backgroundColor: theme.colors.buttonPrimary }]} onPress={handleEdit}>
          <FontAwesomeIcon icon={faEdit} size={18} color={theme.colors.buttonPrimaryText} />
          <Text style={[styles.editProfileButtonText, { color: theme.colors.buttonPrimaryText }]}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      {isEditing && (
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.buttonPrimary }]} onPress={handleSave} disabled={saving}>
            <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.cancelButton, { borderColor: theme.colors.primary }]} onPress={handleCancel}>
            <Text style={[styles.buttonText, styles.cancelButtonText, { color: theme.colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
      {/* My Children (for Parents) */}
      {userData.role === 'parent' && (
        <>
          <View style={styles.sectionHeaderContainer}>
            <FontAwesomeIcon icon={faUserFriends} size={20} color={theme.colors.primary} style={styles.sectionHeaderIcon} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>My Children</Text>
            <TouchableOpacity onPress={() => setShowManageChildren(!showManageChildren)} style={[styles.manageChildrenButton, { backgroundColor: theme.colors.buttonPrimary }]}>
              <Text style={[styles.manageChildrenButtonText, { color: theme.colors.buttonPrimaryText }]}>{showManageChildren ? 'Close' : 'Manage Children'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ alignSelf: 'stretch' }}>
            <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>View and manage your associated children.</Text>
          </View>

          <View style={styles.associatedChildrenContainer}>
            {associatedChildren.length === 0 ? (
              <Text style={[styles.noChildrenText, { color: theme.colors.placeholder }]}>No children associated yet.</Text>
            ) : (
              associatedChildren.map(childId => {
                const child = students.find(s => s.id === childId);
                return child ? (
                  <View key={child.id} style={[styles.childItem, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faUserFriends} size={16} color={theme.colors.placeholder} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.childName, { color: theme.colors.text }]}>{child.full_name || 'N/A'}</Text>
                      <Text style={[styles.childEmail, { color: theme.colors.placeholder }]}>{child.email || 'N/A'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveChild(child.id, child.full_name || child.email)}
                      style={{
                        marginLeft: 'auto',
                        backgroundColor: theme.colors.error,
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <FontAwesomeIcon icon={faMinus} size={14} color={theme.colors.buttonPrimaryText} />
                    </TouchableOpacity>
                  </View>
                ) : null;
              })
            )}
          </View>

          {/* Manage Children Area (conditionally rendered) */}
          {showManageChildren && (
            <View style={[styles.manageChildrenSection, { borderTopColor: theme.colors.cardBorder }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 10 }}>
                <FontAwesomeIcon icon={faUserFriends} size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
                <Text style={[styles.manageChildrenHeader, { color: theme.colors.text }]}>Manage Children</Text>
              </View>
              <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>Search for students to send association requests. You can search by name or email.</Text>

              {/* Student Search Input */}
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
                placeholder="Search for students"
                placeholderTextColor={theme.colors.placeholder}
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
                    <FontAwesomeIcon icon={faUserFriends} size={16} color={theme.colors.placeholder} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.childName, { color: theme.colors.text }]}>{student.full_name || 'N/A'}</Text>
                      <Text style={[styles.childEmail, { color: theme.colors.placeholder }]}>{student.email || 'N/A'}</Text>
                    </View>
                    <View style={[selectedStudents.includes(student.id) ? styles.checkboxChecked : styles.checkboxUnchecked, { marginLeft: 'auto', borderColor: theme.colors.inputBorder, backgroundColor: selectedStudents.includes(student.id) ? theme.colors.primary : 'transparent' }]} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Send Request Button */}
              {selectedStudents.length > 0 && (
                <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.buttonPrimary }]} onPress={handleSendAssociationRequest} disabled={saving}>
                  <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>Send Association Request ({selectedStudents.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
      <GamificationInfoModal
        visible={showGamificationInfo}
        onClose={() => setShowGamificationInfo(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, alignItems: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, marginBottom: 16 },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  description: { fontSize: 16, marginBottom: 32, textAlign: 'center' },
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
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 15,
  },
  manageChildrenButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  manageChildrenButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  infoContainer: { width: '100%', marginBottom: 16, alignSelf: 'flex-start' },
  label: { fontSize: 14, fontWeight: 'bold' },
  value: { fontSize: 16 },
  input: { borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16, borderWidth: 1, width: '100%' },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  buttonText: { fontWeight: '600', fontSize: 16 },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1 },
  cancelButtonText: {},
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
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
  },
  editProfileButtonText: {
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  manageChildrenHeader: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  manageChildrenSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    alignSelf: 'flex-start',
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
    fontWeight: 'bold',
  },
  studentEmail: {
    fontSize: 14,
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  noChildrenText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  associatedChildrenContainer: {
    width: '100%',
    marginBottom: 20,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: '600',
  },
  childEmail: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    width: '100%',
    marginVertical: 20,
    borderBottomWidth: 1,
  },
  gamificationCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  xpText: {
    fontSize: 14,
  },
  nextLevelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    width: '48%',
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
});
