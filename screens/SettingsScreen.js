import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCog, faMoon, faSun, faBell, faInfoCircle, faFileContract,
  faShieldAlt, faQuestionCircle, faBullhorn, faBookOpen, faPoll,
  faCalendar, faStore, faTrophy, faUser, faLock, faDoorOpen, faPalette, faGlobe, faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { Switch } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { useNotificationPreferences } from '../context/NotificationPreferencesContext';
import { useToast } from '../context/ToastContext';
import SettingsScreenSkeleton, { SkeletonPiece } from '../components/skeletons/SettingsScreenSkeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppInfoModal from '../components/AppInfoModal';
import HelpSupportModal from '../components/HelpSupportModal';
import TermsOfServiceModal from '../components/TermsOfServiceModal';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ConfirmationModal from '../components/ConfirmationModal';
import LinearGradient from 'react-native-linear-gradient';

const SettingRow = React.memo(({ icon, label, value, onValueChange, color, theme }) => (
    <View style={[styles.settingRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: (color || theme.colors.primary) + '15' }]}>
            <FontAwesomeIcon icon={icon} size={16} color={color || theme.colors.primary} />
        </View>
        <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} color={theme.colors.primary} />
    </View>
));

const LinkButton = React.memo(({ icon, title, onPress, color, description, theme }) => (
    <TouchableOpacity
      style={[styles.linkButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, { backgroundColor: (color || theme.colors.primary) + '15' }]}>
        <FontAwesomeIcon icon={icon} size={16} color={color || theme.colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.linkButtonTitle, { color: theme.colors.text }]}>{title}</Text>
        {description && <Text style={[styles.linkButtonDesc, { color: theme.colors.placeholder }]}>{description}</Text>}
      </View>
      <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.cardBorder} />
    </TouchableOpacity>
));

const SettingsScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [fullUser, setFullUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAppInfo, setShowAppInfo] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLeaveSchoolConfirm, setShowLeaveSchoolConfirm] = useState(false);
  const [isProcessingLeave, setIsProcessingLeave] = useState(false);
  const [notificationPermissions, setNotificationPermissions] = useState(null);

  const { isDarkTheme, toggleTheme, theme } = useTheme();
  const { preferences, updatePreference } = useNotificationPreferences();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (!error) {
          setUser(userData);
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

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermissions(status);
    })();
  }, []);

  const handleLeaveSchool = useCallback(async () => {
    if (!fullUser || !fullUser.school_id) return;

    setIsProcessingLeave(true);
    try {
      const schoolId = fullUser.school_id;
      const userId = fullUser.id;

      const { data: schoolData, error: schoolFetchError } = await supabase
        .from('schools')
        .select('users, created_by, name')
        .eq('id', schoolId)
        .single();

      if (schoolFetchError) throw schoolFetchError;

      if (schoolData?.users) {
        const updatedUsers = schoolData.users.filter(id => id !== userId);
        const { error: updateSchoolError } = await supabase
          .from('schools')
          .update({ users: updatedUsers })
          .eq('id', schoolId);

        if (updateSchoolError) throw updateSchoolError;
      }

      const { error: deleteMembersError } = await supabase
        .from('class_members')
        .delete()
        .eq('user_id', userId);

      if (deleteMembersError) throw deleteMembersError;

      if (fullUser.role === 'teacher' || fullUser.role === 'admin') {
        const { error: updateClassesError } = await supabase
          .from('classes')
          .update({ teacher_id: null })
          .eq('teacher_id', userId)
          .eq('school_id', schoolId);

        if (updateClassesError) throw updateClassesError;
      }

      await supabase.from('marketplace_items').delete().eq('seller_id', userId);
      await supabase.from('polls').delete().eq('created_by', userId);
      await supabase.from('announcements').delete().eq('posted_by', userId);

      if (schoolData?.created_by && schoolData.created_by !== userId) {
          try {
              await supabase.from('notifications').insert({
                  user_id: schoolData.created_by,
                  type: 'school_leave',
                  title: 'User Left School',
                  message: `${fullUser.full_name || 'A user'} has left ${schoolData.name || 'your school'}.`,
                  is_read: false
              });
          } catch (e) {}
      }

      const { error: updateUserError } = await supabase
        .from('users')
        .update({ school_id: null })
        .eq('id', userId);

      if (updateUserError) throw updateUserError;

      showToast('You have successfully left the school.', 'success');
      setFullUser(prev => ({ ...prev, school_id: null }));
      setShowLeaveSchoolConfirm(false);
      setIsProcessingLeave(false);
      navigation.navigate('RoleSelection');

    } catch (error) {
      console.error('Error leaving school:', error);
      Alert.alert("Error", "Failed to leave school: " + error.message);
      setIsProcessingLeave(false);
    }
  }, [fullUser, navigation, showToast]);

  const handleEditProfileClose = useCallback((updated) => {
    setShowEditProfile(false);
    if (updated) {
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
  }, []);

  const openAppInfo = useCallback(() => setShowAppInfo(true), []);
  const closeAppInfo = useCallback(() => setShowAppInfo(false), []);
  const openHelpSupport = useCallback(() => setShowHelpSupport(true), []);
  const closeHelpSupport = useCallback(() => setShowHelpSupport(false), []);
  const openTerms = useCallback(() => setShowTerms(true), []);
  const closeTerms = useCallback(() => setShowTerms(false), []);
  const openPrivacy = useCallback(() => setShowPrivacy(true), []);
  const closePrivacy = useCallback(() => setShowPrivacy(false), []);
  const openEditProfile = useCallback(() => setShowEditProfile(true), []);
  const openChangePassword = useCallback(() => setShowChangePassword(true), []);
  const closeChangePassword = useCallback(() => setShowChangePassword(false), []);
  const openLeaveSchoolConfirm = useCallback(() => setShowLeaveSchoolConfirm(true), []);
  const closeLeaveSchoolConfirm = useCallback(() => { setShowLeaveSchoolConfirm(false); setIsProcessingLeave(false); }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
    >
      <LinearGradient
        colors={['#4f46e5', '#4338ca']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Settings</Text>
            <Text style={styles.heroDescription}>
                Manage your account preferences and application settings.
            </Text>
        </View>
      </LinearGradient>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <LinkButton
          icon={faUser}
          title="Edit Profile"
          description="Update your personal information"
          onPress={openEditProfile}
          color="#4f46e5"
          theme={theme}
        />
        <LinkButton
          icon={faLock}
          title="Change Password"
          description="Manage your account security"
          onPress={openChangePassword}
          color="#f59e0b"
          theme={theme}
        />
        {fullUser && fullUser.school_id && (
          <LinkButton
            icon={faDoorOpen}
            title="Leave School"
            description="Disassociate your account from this school"
            onPress={openLeaveSchoolConfirm}
            color="#e11d48"
            theme={theme}
          />
        )}
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <SettingRow
          icon={isDarkTheme ? faMoon : faSun}
          label="Dark Mode"
          value={isDarkTheme}
          onValueChange={toggleTheme}
          color={isDarkTheme ? '#fbbf24' : '#f59e0b'}
          theme={theme}
        />
        
        <View style={{ marginTop: 8 }}>
            <SettingRow
                icon={faBell}
                label="Push Notifications"
                value={preferences.pushNotificationsEnabled}
                onValueChange={(value) => updatePreference('pushNotificationsEnabled', value)}
                color="#4f46e5"
                theme={theme}
            />
        </View>

        {preferences.pushNotificationsEnabled && (
          <View style={styles.subSettings}>
            <SettingRow icon={faBullhorn} label="Announcements" value={preferences.announcements} onValueChange={(v) => updatePreference('announcements', v)} color="#e11d48" theme={theme} />
            <SettingRow icon={faBookOpen} label="Homework" value={preferences.homework} onValueChange={(v) => updatePreference('homework', v)} color="#10b981" theme={theme} />
            <SettingRow icon={faPoll} label="Polls" value={preferences.polls} onValueChange={(v) => updatePreference('polls', v)} color="#f59e0b" theme={theme} />
            <SettingRow icon={faCalendar} label="Class Schedule" value={preferences.classSchedule} onValueChange={(v) => updatePreference('classSchedule', v)} color="#6366f1" theme={theme} />
            <SettingRow icon={faStore} label="Marketplace" value={preferences.marketplace} onValueChange={(v) => updatePreference('marketplace', v)} color="#ec4899" theme={theme} />
            <SettingRow icon={faTrophy} label="Gamification" value={preferences.gamification} onValueChange={(v) => updatePreference('gamification', v)} color="#fbbf24" theme={theme} />
          </View>
        )}
      </View>

      {/* Management - Admin/Teacher Only */}
      {user && (user.role === 'admin' || user.role === 'teacher') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MANAGEMENT</Text>
          <LinkButton
            icon={faCog}
            title="Management Center"
            description="Manage users, content, and school data"
            onPress={() => navigation.navigate('Management')}
            color="#4f46e5"
            theme={theme}
          />
        </View>
      )}

      {/* Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INFORMATION</Text>
        <LinkButton icon={faInfoCircle} title="About ClassConnect" onPress={openAppInfo} color="#3b82f6" theme={theme} />
        <LinkButton icon={faQuestionCircle} title="Help & Support" onPress={openHelpSupport} color="#10b981" theme={theme} />
        <LinkButton icon={faFileContract} title="Terms of Service" onPress={openTerms} color="#6366f1" theme={theme} />
        <LinkButton icon={faShieldAlt} title="Privacy Policy" onPress={openPrivacy} color="#f59e0b" theme={theme} />
      </View>

      <Text style={[styles.versionText, { color: theme.colors.placeholder }]}>
        Version 1.2.4
      </Text>

      {/* Modals */}
      <AppInfoModal visible={showAppInfo} onClose={closeAppInfo} />
      <HelpSupportModal visible={showHelpSupport} onClose={closeHelpSupport} />
      <TermsOfServiceModal visible={showTerms} onClose={closeTerms} />
      <PrivacyPolicyModal visible={showPrivacy} onClose={closePrivacy} />
      <EditProfileModal
        visible={showEditProfile}
        onClose={handleEditProfileClose}
        currentUser={fullUser}
      />
      <ChangePasswordModal visible={showChangePassword} onClose={closeChangePassword} />
      <ConfirmationModal
        visible={showLeaveSchoolConfirm}
        onClose={closeLeaveSchoolConfirm}
        onConfirm={handleLeaveSchool}
        isLoading={isProcessingLeave}
        title="Leave School"
        message={`Are you sure you want to leave this school? This action cannot be undone.`}
        confirmText="Leave School"
        type="danger"
      />
    </ScrollView>
  );
}

export default React.memo(SettingsScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  heroContainer: {
    padding: 24,
    paddingTop: 40,
    marginBottom: 20,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
      marginBottom: 10,
  },
  heroTitle: {
      color: '#fff',
      fontSize: 32,
      fontWeight: '900',
      marginBottom: 8,
      letterSpacing: -1,
  },
  heroDescription: {
      color: '#e0e7ff',
      fontSize: 15,
      fontWeight: '500',
      lineHeight: 22,
  },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  subSettings: {
    marginLeft: 16,
    marginTop: 4,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  linkButtonTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  linkButtonDesc: {
      fontSize: 12,
      marginTop: 1,
  },
  versionText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  warningContainer: {
    padding: 15,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
});