import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUsers } from '@fortawesome/free-solid-svg-icons';

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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Settings</Text>
      <Text style={styles.description}>Manage your account and application settings.</Text>

      {user && (user.role === 'admin' || user.role === 'teacher') && (
        <View>
          <View style={styles.separator} />
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>User Management</Text>
            <Text style={styles.sectionDescription}>Manage users and classes within your school.</Text>
            {user.role === 'admin' && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('UserManagement')}
              >
                <FontAwesomeIcon icon={faUsers} size={18} color="#007AFF" />
                <Text style={styles.buttonText}>Manage Users</Text>
              </TouchableOpacity>
            )}
            {(user.role === 'admin' || user.role === 'teacher') && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('ManageClasses')}
              >
                <FontAwesomeIcon icon={faUsers} size={18} color="#007AFF" />
                <Text style={styles.buttonText}>Manage Classes</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
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
});
