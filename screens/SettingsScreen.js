import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCog, faMoon, faSun, faBell, faInfoCircle, faFileContract,
  faShieldAlt, faQuestionCircle, faBullhorn, faBookOpen, faPoll,
  faCalendar, faStore, faTrophy, faUser, faLock
} from '@fortawesome/free-solid-svg-icons';
import { Switch } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';
import { useNotificationPreferences } from '../context/NotificationPreferencesContext';
import SettingsScreenSkeleton from '../components/skeletons/SettingsScreenSkeleton';
import AppInfoModal from '../components/AppInfoModal';
import HelpSupportModal from '../components/HelpSupportModal';
import TermsOfServiceModal from '../components/TermsOfServiceModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const { isDarkTheme, toggleTheme, theme } = useTheme();
  const { preferences, updatePreference } = useNotificationPreferences();

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
          // Fetch full user data for EditProfileModal
          const { data: fullUserData } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          setFullUser(fullUserData);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const SettingRow = ({ icon, label, value, onValueChange, color }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <FontAwesomeIcon icon={icon} size={16} color={color || theme.colors.primary} />
        <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} color={theme.colors.primary} />
    </View>
  );

  const LinkButton = ({ icon, title, onPress, color }) => (
    <TouchableOpacity
      style={[styles.linkButton, { borderColor: theme.colors.cardBorder }]}
      onPress={onPress}
    >
      <FontAwesomeIcon icon={icon} size={18} color={color || theme.colors.primary} />
      <Text style={[styles.linkButtonText, { color: theme.colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <SettingsScreenSkeleton />;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <FontAwesomeIcon icon={faCog} size={28} color="#007AFF" style={{ marginRight: 12 }} />
        <Text style={[styles.header, { color: theme.colors.text, marginBottom: 0 }]}>Settings</Text>
      </View>
      <Text style={[styles.description, { color: theme.colors.placeholder }]}>
        Manage your account and application settings
      </Text>

      {/* Theme Settings */}
      <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Theme Settings</Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
          Adjust the application's visual theme
        </Text>
        <SettingRow
          icon={isDarkTheme ? faMoon : faSun}
          label="Dark Mode"
          value={isDarkTheme}
          onValueChange={toggleTheme}
          color={isDarkTheme ? '#FFD700' : '#FF9500'}
        />
      </View>

      {/* Account Management */}
      <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Account Management</Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
          Manage your profile and account security
        </Text>
        <LinkButton
          icon={faUser}
          title="Edit Profile"
          onPress={() => setShowEditProfile(true)}
          color="#007AFF"
        />
        <LinkButton
          icon={faLock}
          title="Change Password"
          onPress={() => setShowChangePassword(true)}
          color="#FF9500"
        />
      </View>

      {/* Notification Preferences */}
      <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Notification Preferences</Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
          Control which notifications you receive
        </Text>

        <SettingRow
          icon={faBell}
          label="Push Notifications"
          value={preferences.pushNotificationsEnabled}
          onValueChange={(value) => updatePreference('pushNotificationsEnabled', value)}
        />

        {preferences.pushNotificationsEnabled && (
          <View style={styles.subSettings}>
            <SettingRow
              icon={faBullhorn}
              label="Announcements"
              value={preferences.announcements}
              onValueChange={(value) => updatePreference('announcements', value)}
              color="#FF3B30"
            />
            <SettingRow
              icon={faBookOpen}
              label="Homework & Assignments"
              value={preferences.homework}
              onValueChange={(value) => updatePreference('homework', value)}
              color="#34C759"
            />
            <SettingRow
              icon={faPoll}
              label="Polls"
              value={preferences.polls}
              onValueChange={(value) => updatePreference('polls', value)}
              color="#FF9500"
            />
            <SettingRow
              icon={faCalendar}
              label="Class Schedule"
              value={preferences.classSchedule}
              onValueChange={(value) => updatePreference('classSchedule', value)}
              color="#5856D6"
            />
            <SettingRow
              icon={faStore}
              label="Marketplace"
              value={preferences.marketplace}
              onValueChange={(value) => updatePreference('marketplace', value)}
              color="#FF2D55"
            />
            <SettingRow
              icon={faTrophy}
              label="Gamification (XP, Badges)"
              value={preferences.gamification}
              onValueChange={(value) => updatePreference('gamification', value)}
              color="#FFD700"
            />
          </View>
        )}
      </View>

      {/* Management - Admin/Teacher Only */}
      {user && (user.role === 'admin' || user.role === 'teacher') && (
        <View>
          <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
          <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Management</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
              Access management tools for your school
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Management')}
            >
              <FontAwesomeIcon icon={faCog} size={18} color={theme.colors.primary} />
              <View>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>Management Center</Text>
                <Text style={[styles.buttonDescription, { color: theme.colors.placeholder }]}>
                  Manage users, content, and school data
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* App Information */}
      <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
      <View style={styles.section}>
        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>App Information</Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
          Learn more about ClassConnect
        </Text>

        <LinkButton
          icon={faInfoCircle}
          title="About ClassConnect"
          onPress={() => setShowAppInfo(true)}
          color="#007AFF"
        />

        <LinkButton
          icon={faQuestionCircle}
          title="Help & Support"
          onPress={() => setShowHelpSupport(true)}
          color="#34C759"
        />

        <LinkButton
          icon={faFileContract}
          title="Terms of Service"
          onPress={() => setShowTerms(true)}
          color="#5856D6"
        />

        <LinkButton
          icon={faShieldAlt}
          title="Privacy Policy"
          onPress={() => setShowPrivacy(true)}
          color="#FF9500"
        />

        <Text style={[styles.versionText, { color: theme.colors.placeholder }]}>
          Version 1.0.0
        </Text>
      </View>

      {/* Modals */}
      <AppInfoModal visible={showAppInfo} onClose={() => setShowAppInfo(false)} />
      <HelpSupportModal visible={showHelpSupport} onClose={() => setShowHelpSupport(false)} />
      <TermsOfServiceModal visible={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <EditProfileModal
        visible={showEditProfile}
        onClose={(updated) => {
          setShowEditProfile(false);
          if (updated) {
            // Refresh user data
            const refreshUser = async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (user) {
                const { data: fullUserData } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', user.id)
                  .single();
                setFullUser(fullUserData);
              }
            };
            refreshUser();
          }
        }}
        currentUser={fullUser}
      />
      <ChangePasswordModal visible={showChangePassword} onClose={() => setShowChangePassword(false)} />
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
    marginBottom: 4,
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

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    marginLeft: 12,
  },
  subSettings: {
    marginLeft: 20,
    marginTop: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  versionText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
});
