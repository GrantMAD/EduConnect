import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSignOutAlt, faUserGraduate, faChalkboardTeacher, faChild, faUserShield } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const RoleCard = React.memo(({ title, description, icon, onPress, loading, color, theme }) => (
  <TouchableOpacity 
    style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} 
    onPress={onPress} 
    disabled={loading}
    activeOpacity={0.8}
  >
    <View style={[styles.cardIconBox, { backgroundColor: color + '15' }]}>
        <FontAwesomeIcon icon={icon} size={24} color={color} />
    </View>
    <View style={styles.cardTextContainer}>
      <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.cardDescription, { color: theme.colors.placeholder }]}>{description}</Text>
    </View>
    {loading && <ActivityIndicator color={color} style={styles.cardSpinner} />}
  </TouchableOpacity>
));

const RoleSelectionScreen = ({ navigation }) => {
  const [loadingRole, setLoadingRole] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const updateUserRole = useCallback(async (role) => {
    setLoadingRole(role);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('users')
        .update({ role: role })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        navigation.navigate('SchoolSetup');
      }
    }
    setLoadingRole(null);
  }, [navigation]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message);
      setSigningOut(false);
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Decorative Blobs */}
      <View style={[styles.blob, styles.blobTop, { backgroundColor: theme.colors.primary + '10' }]} />
      <View style={[styles.blob, styles.blobBottom, { backgroundColor: '#34C75910' }]} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Choose your <Text style={{ color: theme.colors.primary }}>journey</Text>.</Text>
            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>
                Select the account type that best describes your role in the school community.
            </Text>
        </View>

        <RoleCard
            title="Student"
            description="Access classes, track homework, and earn rewards."
            icon={faUserGraduate}
            color="#007AFF"
            theme={theme}
            onPress={() => updateUserRole('student')}
            loading={loadingRole === 'student'}
        />
        <RoleCard
            title="Parent"
            description="Follow your child's academic journey and stay informed."
            icon={faChild}
            color="#FF9500"
            theme={theme}
            onPress={() => updateUserRole('parent')}
            loading={loadingRole === 'parent'}
        />
        <RoleCard
            title="Teacher"
            description="Manage your classes, assign tasks, and track progress."
            icon={faChalkboardTeacher}
            color="#34C759"
            theme={theme}
            onPress={() => updateUserRole('teacher')}
            loading={loadingRole === 'teacher'}
        />
        <RoleCard
            title="Admin"
            description="Oversee your school, manage users, and settings."
            icon={faUserShield}
            color="#5856D6"
            theme={theme}
            onPress={() => updateUserRole('admin')}
            loading={loadingRole === 'admin'}
        />

        <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={handleSignOut}
            disabled={signingOut}
        >
            {signingOut ? (
            <ActivityIndicator color="#FF3B30" />
            ) : (
            <>
                <FontAwesomeIcon icon={faSignOutAlt} size={16} color="#FF3B30" style={{ marginRight: 8 }} />
                <Text style={styles.signOutText}>Sign Out</Text>
            </>
            )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default React.memo(RoleSelectionScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  blob: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 150,
  },
  blobTop: {
      top: -100,
      right: -100,
  },
  blobBottom: {
      bottom: -100,
      left: -100,
  },
  header: {
      alignItems: 'center',
      marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 0,
  },
  cardIconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardDescription: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 18,
  },
  cardSpinner: {
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '700',
  },
});