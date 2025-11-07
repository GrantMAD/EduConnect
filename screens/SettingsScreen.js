import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import SettingsScreenSkeleton from '../components/skeletons/SettingsScreenSkeleton';
import { faUsers, faSchool, faBullhorn, faStore } from '@fortawesome/free-solid-svg-icons';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error('Error fetching user role:', error);
        } else {
          setUser(userData);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading) {
    return <SettingsScreenSkeleton />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.header}>Settings</Text>
      <Text style={styles.description}>Manage your account and application settings.</Text>

      {user && user.role === 'admin' && (
        <View>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>User Management</Text>
            <Text style={styles.sectionDescription}>Manage users and classes within your school.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('UserManagement')}
            >
              <FontAwesomeIcon icon={faUsers} size={18} color="#007AFF" />
              <View>
                <Text style={styles.buttonText}>Manage Users</Text>
                <Text style={styles.buttonDescription}>Add, edit, or remove users from your school.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {user && (user.role === 'admin' || user.role === 'teacher') && (
        <View>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Announcements</Text>
            <Text style={styles.sectionDescription}>Manage school-wide announcements.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('ManageAnnouncements')}
            >
              <FontAwesomeIcon icon={faBullhorn} size={18} color="#007AFF" />
              <View>
                <Text style={styles.buttonText}>Manage Announcements</Text>
                <Text style={styles.buttonDescription}>Create, edit, or delete announcements.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {user && user.role === 'admin' && (
        <View>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>School Data</Text>
            <Text style={styles.sectionDescription}>Manage your school's data, including the main image displayed on the announcements screen.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('SchoolData')}
            >
              <FontAwesomeIcon icon={faSchool} size={18} color="#007AFF" />
              <View>
                <Text style={styles.buttonText}>Manage School Data</Text>
                <Text style={styles.buttonDescription}>Update school-wide information and branding.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {user && user.role === 'admin' && (
        <View>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Marketplace</Text>
            <Text style={styles.sectionDescription}>Manage your marketplace items.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('ManageMarketData')}
            >
              <FontAwesomeIcon icon={faStore} size={18} color="#007AFF" />
              <View>
                <Text style={styles.buttonText}>Manage Market Data</Text>
                <Text style={styles.buttonDescription}>Oversee marketplace items.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  separator: {
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 15,
  },
  buttonDescription: {
    color: '#666',
    fontSize: 12,
    marginLeft: 15,
  },
});
