import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';

const defaultUserImage = require('../assets/user.png');

export default function ProfileScreen() {
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    role: '',
    avatar_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null); // Temporary state for new avatar URL

  const handleEdit = () => {
    setIsEditing(true);
  };
  const handleCancel = () => {
    setIsEditing(false);
    fetchUserData(); // Re-fetch to discard any unsaved changes
  };

  // Fetch or create user profile
  const fetchUserData = async () => {
    setLoading(true);

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error fetching auth user:', userError?.message);
      setLoading(false);
      return;
    }

    // Fetch from users table
    let { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle to avoid error if no row exists

    // If no row exists, create one
    if (!data) {
      const { data: insertData, error: insertError } = await supabase.from('users').insert({
        id: user.id,
        full_name: '',
        email: user.email,
        role: 'user',
      }).select().maybeSingle();

      if (insertError) {
        console.error('Error creating user profile:', insertError.message);
        Alert.alert('Error', 'Failed to create profile.');
        setLoading(false);
        return;
      }

      data = insertData;
    }

    // Set state
    setUserData({
      full_name: data.full_name || '',
      email: data.email || '',
      role: data.role || '',
      avatar_url: data.avatar_url || '',
    });
    setAvatarUrl(data.avatar_url || null);

    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library access to upload photos.');
        return;
      }
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const filename = uri.substring(uri.lastIndexOf('/') + 1);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const fileExt = filename.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: result.assets[0].mimeType,
        });

      if (error) {
        console.error('Error uploading avatar:', error.message);
        Alert.alert('Upload Error', error.message);
      } else if (data) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
        if (publicUrl) {
          setAvatarUrl(publicUrl);
          setUserData({ ...userData, avatar_url: publicUrl }); // Update userData with new avatar_url
        }
      }
    }
  };

  // Save updated profile
  const handleSave = async () => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('users')
      .update({
        full_name: userData.full_name,
        email: userData.email,
        role: userData.role,
        avatar_url: userData.avatar_url, // Include avatar_url in the update
      })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      console.error('Error updating profile:', error.message);
      Alert.alert('Error', 'Failed to update profile.');
    } else {
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false); // Set to view mode after successful save
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isEditing ? (
        <TouchableOpacity
          onPress={pickImage}
          activeOpacity={0.7}
          style={{ marginBottom: 16 }}
        >
          <Image
            source={avatarUrl ? { uri: avatarUrl } : defaultUserImage}
            style={styles.avatar}
          />
          <Text style={{ textAlign: 'center', color: '#007AFF', marginTop: 4 }}>
            Tap to change photo
          </Text>
        </TouchableOpacity>
      ) : (
        <Image
          source={userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage}
          style={styles.avatar}
        />
      )}
      <Text style={styles.header}>My Profile</Text>
      <Text style={styles.description}>View and edit your profile information.</Text>

      {isEditing ? (
        // Edit Mode
        <>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={userData.full_name}
            onChangeText={(text) => setUserData({ ...userData, full_name: text })}
            placeholder="Enter full name"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={userData.email}
            onChangeText={(text) => setUserData({ ...userData, email: text })}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        // View Mode
        <>
          <View style={styles.infoContainer}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.value}>{userData.full_name}</Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{userData.email}</Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleEdit}>
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#007AFF',
    marginBottom: 16,
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  infoContainer: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    width: '100%',
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
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#007AFF',
  },
});
