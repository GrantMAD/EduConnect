import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import SettingsScreenSkeleton from '../components/skeletons/SettingsScreenSkeleton';
import { faUsers, faSchool, faBullhorn, faStore, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext'; // Import useTheme
import { Switch } from 'react-native-paper'; // Import Switch from react-native-paper

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isDarkTheme, toggleTheme, theme } = useTheme(); // Use the theme hook

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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.header, { color: theme.colors.text }]}>Settings</Text>
      <Text style={[styles.description, { color: theme.colors.text }]}>Manage your account and application settings.</Text>

      {/* Theme Settings */}
      <View style={styles.separator} />
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Theme Settings</Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>Adjust the application's visual theme.</Text>
        <View style={styles.themeToggleContainer}>
          <FontAwesomeIcon icon={faSun} size={18} color={theme.colors.text} style={{ marginRight: 10 }} />
          <Text style={[styles.buttonText, { color: theme.colors.text }]}>Light Mode</Text>
          <Switch value={isDarkTheme} onValueChange={toggleTheme} color={theme.colors.primary} />
          <Text style={[styles.buttonText, { color: theme.colors.text }]}>Dark Mode</Text>
          <FontAwesomeIcon icon={faMoon} size={18} color={theme.colors.text} style={{ marginLeft: 10 }} />
        </View>
      </View>

      {user && user.role === 'admin' && (
        <View>
          <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>User Management</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>Manage users and classes within your school.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('UserManagement')}
            >
              <FontAwesomeIcon icon={faUsers} size={18} color={theme.colors.primary} />
              <View>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Manage Users</Text>
                <Text style={[styles.buttonDescription, { color: theme.colors.placeholder }]}>Add, edit, or remove users from your school.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {user && (user.role === 'admin' || user.role === 'teacher') && (
        <View>
          <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Announcements</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>Manage school-wide announcements.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('ManageAnnouncements')}
            >
              <FontAwesomeIcon icon={faBullhorn} size={18} color={theme.colors.primary} />
              <View>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Manage Announcements</Text>
                <Text style={[styles.buttonDescription, { color: theme.colors.placeholder }]}>Create, edit, or delete announcements.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {user && user.role === 'admin' && (
        <View>
          <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>School Data</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>Manage your school's data, including the main image displayed on the announcements screen.</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('SchoolData')}
            >
              <FontAwesomeIcon icon={faSchool} size={18} color={theme.colors.primary} />
              <View>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Manage School Data</Text>
                <Text style={[styles.buttonDescription, { color: theme.colors.placeholder }]}>Update school-wide information and branding.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View>
        <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Marketplace</Text>
          <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>Manage your marketplace items.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('ManageMarketData')}
          >
            <FontAwesomeIcon icon={faStore} size={18} color={theme.colors.primary} />
            <View>
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>Manage Market Data</Text>
              <Text style={[styles.buttonDescription, { color: theme.colors.placeholder }]}>Oversee marketplace items.</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  description: {
    fontSize: 16,
    marginBottom: 32,
  },
  separator: {
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
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 15,
  },
  buttonDescription: {
    fontSize: 12,
    marginLeft: 15,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'transparent', // This will be handled by the parent container's background
  },
});
