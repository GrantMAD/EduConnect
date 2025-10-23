import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

export default function ProfileScreen() {
  const [userData, setUserData] = useState({
    full_name: '',
    email: '',
    role: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => setIsEditing(true);
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
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
      Alert.alert('Sign Out Error', error.message);
    } else {
      console.log('User signed out successfully.');
      // No explicit navigation needed here, App.js should handle it.
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
      <Text style={styles.header}>My Profile</Text>

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



          <View style={styles.buttonContainer}>
            <Button title={saving ? "Saving..." : "Save"} onPress={handleSave} disabled={saving} />
          </View>
          <View style={styles.buttonContainer}>
            <Button title="Cancel" onPress={handleCancel} color="#ff3b30" />
          </View>
        </>
      ) : (
        // View Mode
        <>
          <Text style={styles.label}>Full Name: {userData.full_name}</Text>
          <Text style={styles.label}>Email: {userData.email}</Text>
          <Text style={styles.label}>Role: {userData.role}</Text>

          <View style={styles.buttonContainer}>
            <Button title="Edit Profile" onPress={handleEdit} />
          </View>
        </>
      )}

      <View style={styles.buttonContainer}>
        <Button title="Sign Out" onPress={handleSignOut} color="#ff3b30" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonContainer: {
    marginVertical: 8,
  },
});
