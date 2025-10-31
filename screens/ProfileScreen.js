import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from 'buffer';

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
  const [avatarLocalUri, setAvatarLocalUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

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
          full_name: data.full_name || '',
          email: data.email || '',
          role: data.role || '',
          avatar_url: data.avatar_url || '',
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
        <TouchableOpacity onPress={pickImage} activeOpacity={0.7} style={{ marginBottom: 16 }}>
          <Image source={avatarLocalUri ? { uri: avatarLocalUri } : (userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage)} style={styles.avatar} />
          <Text style={{ textAlign: 'center', color: '#007AFF', marginTop: 4 }}>Tap to change photo</Text>
        </TouchableOpacity>
      ) : (
        <Image source={userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage} style={styles.avatar} />
      )}

      <Text style={styles.header}>My Profile</Text>
      <Text style={styles.description}>View and edit your profile information.</Text>

      {isEditing ? (
        <>
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={userData.full_name} onChangeText={text => setUserData({ ...userData, full_name: text })} placeholder="Enter full name" />
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={userData.email} onChangeText={text => setUserData({ ...userData, email: text })} placeholder="Enter email" keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
            <Text style={styles.buttonText}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
            <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
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
  container: { flexGrow: 1, backgroundColor: '#f8f9fa', padding: 24, alignItems: 'center' },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#007AFF', marginBottom: 16 },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  description: { fontSize: 16, color: '#666', marginBottom: 32, textAlign: 'center' },
  infoContainer: { width: '100%', marginBottom: 16 },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 18, fontWeight: '500', color: '#333' },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#e0e0e0', width: '100%' },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 8, alignItems: 'center', width: '100%', marginBottom: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#007AFF' },
  cancelButtonText: { color: '#007AFF' },
});
