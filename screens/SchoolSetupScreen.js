import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SchoolSetupScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Join existing school
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState([]);
  const [searching, setSearching] = useState(false);
  const [joiningSchool, setJoiningSchool] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null); // 'pending' | 'declined'
  const [declinedMessage, setDeclinedMessage] = useState(null);
  const insets = useSafeAreaInsets();

  // Create new school
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolContactEmail, setNewSchoolContactEmail] = useState('');
  const [newSchoolContactPhone, setNewSchoolContactPhone] = useState('');
  const [newSchoolLogoUrl, setNewSchoolLogoUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Refresh user data whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      const fetchUserData = async () => {
        setLoading(true);
        try {
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          if (!authUser) return;

          setUser(authUser);

          const { data: userData, error: userDataError } = await supabase
            .from('users')
            .select('school_request_status, requested_school_id')
            .eq('id', authUser.id)
            .single();
          if (userDataError) throw userDataError;

          setRequestStatus(userData?.school_request_status || null);

          if (userData?.school_request_status === 'declined') {
            // Fetch declined school name
            if (userData.requested_school_id) {
              const { data: school, error: schoolError } = await supabase
                .from('schools')
                .select('name')
                .eq('id', userData.requested_school_id)
                .single();
              if (!schoolError && school) {
                setDeclinedMessage(`Your previous request to join "${school.name}" was declined.`);
              } else {
                setDeclinedMessage('Your previous request to join a school was declined.');
              }
            } else {
              setDeclinedMessage('Your previous request to join a school was declined.');
            }
          } else {
            setDeclinedMessage(null);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }, [])
  );

  const performSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSchools([]);
      setSearching(false);
      return;
    }
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, created_by')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error(error);
      Alert.alert('Error', 'Unable to search for schools.');
    } else {
      setSchools(data || []);
    }
    setSearching(false);
  };

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => performSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const handleJoinSchool = async (schoolId, schoolName, createdBy) => {
    if (!user) return;
    setJoiningSchool(schoolId);

    try {
      // Update user with pending request
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          school_request_status: 'pending',
          requested_school_id: schoolId,
        })
        .eq('id', user.id);
      if (updateUserError) throw updateUserError;

      setRequestStatus('pending');
      setDeclinedMessage(null);

      // Notify school creator
      const { error: notifError } = await supabase
        .from('notifications')
        .insert([{
          user_id: createdBy,
          type: 'school_join_request',
          title: 'New School Join Request',
          message: `${user.email} has requested to join your school "${schoolName}"`,
          is_read: false,
          created_by: user.id,
        }]);
      if (notifError) throw notifError;

      Alert.alert('Request Sent', 'Your request is pending approval.');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to send join request: ' + err.message);
    } finally {
      setJoiningSchool(null);
    }
  };

  const handleCreateSchool = async () => {
    if (!newSchoolName.trim() || !user) {
      Alert.alert('Error', 'School name is required.');
      return;
    }
    setCreating(true);

    try {
      const { data: newSchool, error: insertError } = await supabase
        .from('schools')
        .insert([{
          name: newSchoolName,
          address: newSchoolAddress,
          contact_email: newSchoolContactEmail,
          contact_phone: newSchoolContactPhone,
          logo_url: newSchoolLogoUrl,
          created_by: user.id,
          users: [user.id],
        }])
        .select()
        .single();
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('users')
        .update({ school_id: newSchool.id })
        .eq('id', user.id);
      if (updateError) throw updateError;

      Alert.alert('Success', `School "${newSchoolName}" created and linked!`);
      navigation.replace('MainNavigation');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create school: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>
      <Text style={styles.title}>Welcome to ClassConnect</Text>
      <Text style={styles.subtitle}>Join your school or create a new one</Text>

      {/* --- JOIN EXISTING --- */}
      <Text style={styles.sectionTitle}>Join Existing School</Text>

      {requestStatus === 'pending' ? (
        <Text style={styles.pendingText}>Request is currently pending...</Text>
      ) : (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Search for a school"
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                setDeclinedMessage(null);
                if (text.length > 0) {
                  setSearching(true);
                } else {
                  setSearching(false);
                }
              }}
            />
          </View>

          {declinedMessage && <Text style={styles.declinedText}>{declinedMessage}</Text>}

          {searching ? (
            <ActivityIndicator style={{ marginTop: 10 }} />
          ) : (
            schools.length > 0 ? (
              <FlatList
                data={schools}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.schoolCard}>
                    <Text style={styles.schoolName}>{item.name}</Text>
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={() => handleJoinSchool(item.id, item.name, item.created_by)}
                      disabled={joiningSchool === item.id}
                    >
                      <Text style={styles.joinButtonText}>Join</Text>
                    </TouchableOpacity>
                  </View>
                )}
                scrollEnabled={false}
              />
            ) : (
              search.length > 0 && <Text style={{ textAlign: 'center', marginVertical: 10 }}>No schools found</Text>
            )
          )}
        </>
      )}

      {/* --- CREATE NEW --- */}
      <Text style={styles.sectionTitle}>Create New School</Text>
      <Text style={styles.inputHeading}>School Name</Text>
      <Text style={styles.inputDescription}>Enter the official name of your school.</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter new school name"
        value={newSchoolName}
        onChangeText={setNewSchoolName}
      />
      <Text style={styles.inputHeading}>Address</Text>
      <Text style={styles.inputDescription}>Provide the physical address of your school.</Text>
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={newSchoolAddress}
        onChangeText={setNewSchoolAddress}
      />
      <Text style={styles.inputHeading}>Contact Email</Text>
      <Text style={styles.inputDescription}>Enter the primary contact email for your school.</Text>
      <TextInput
        style={styles.input}
        placeholder="Contact Email"
        value={newSchoolContactEmail}
        onChangeText={setNewSchoolContactEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.inputHeading}>Contact Phone</Text>
      <Text style={styles.inputDescription}>Enter the primary contact phone number for your school.</Text>
      <TextInput
        style={styles.input}
        placeholder="Contact Phone"
        value={newSchoolContactPhone}
        onChangeText={setNewSchoolContactPhone}
        keyboardType="phone-pad"
      />
      <Text style={styles.inputHeading}>Logo URL (optional)</Text>
      <Text style={styles.inputDescription}>Provide a URL for your school's logo (e.g., from your website).</Text>
      <TextInput
        style={styles.input}
        placeholder="Logo URL (optional)"
        value={newSchoolLogoUrl}
        onChangeText={setNewSchoolLogoUrl}
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateSchool}
        disabled={creating}
      >
        <Text style={styles.createButtonText}>{creating ? 'Creating...' : 'Create School'}</Text>
      </TouchableOpacity>

      {/* --- SIGN OUT --- */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb', padding: 16, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 4, color: '#333' },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24, color: '#666' },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    flex: 2,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  schoolCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schoolName: { fontSize: 16, color: '#333', fontWeight: '500' },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  joinButtonText: { color: '#fff', fontWeight: '600' },
  createButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 12,
  },
  createButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  signOutButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 12,
  },
  signOutText: { color: '#FF3B30', fontWeight: '600', fontSize: 16 },
  declinedText: { color: '#d9534f', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  pendingText: { fontStyle: 'italic', color: '#007AFF', marginBottom: 10 },
  inputHeading: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4, marginTop: 10 },
  inputDescription: { fontSize: 12, color: '#666', marginBottom: 8 },
});
