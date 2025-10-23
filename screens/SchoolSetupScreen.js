import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SchoolSetupScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // For joining a school
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState([]);
  const [searching, setSearching] = useState(false);
  const [joiningSchool, setJoiningSchool] = useState(null); // New state for join loading

  // For creating a school
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolContactEmail, setNewSchoolContactEmail] = useState('');
  const [newSchoolContactPhone, setNewSchoolContactPhone] = useState('');
  const [newSchoolLogoUrl, setNewSchoolLogoUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Get logged-in user
  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error(error);
      else setUser(data.user);
      setLoading(false);
    };
    getUser();
  }, []);

  // Search schools
  const performSearch = async (searchTerm) => { // Renamed from handleSearch
    if (!searchTerm.trim()) {
      setSchools([]); // Clear schools if search term is empty
      return;
    }
    setSearching(true);

    const { data, error } = await supabase
      .from('schools')
      .select('id, name')
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

  // Debounce for search input
  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(search);
    }, 500); // Debounce for 500ms

    return () => {
      clearTimeout(handler);
    };
  }, [search]); // Re-run effect when search changes

  // Join school
  const handleJoinSchool = async (schoolId, schoolName) => {
    if (!user) return;
    setJoiningSchool(schoolId); // Set loading state for this school

    // 1. Fetch the current school data to get the existing users array
    const { data: schoolData, error: fetchError } = await supabase
      .from('schools')
      .select('users')
      .eq('id', schoolId)
      .single();

    if (fetchError) {
      console.error(fetchError);
      Alert.alert('Error', 'Could not fetch school data to join: ' + fetchError.message);
      setJoiningSchool(null);
      return;
    }

    const currentUsers = schoolData.users || [];
    const newUsersSet = new Set(currentUsers);
    newUsersSet.add(user.id);
    const newUsers = Array.from(newUsersSet);

    // 2. Update the school's users array
    const { error: updateSchoolError } = await supabase
      .from('schools')
      .update({ users: newUsers })
      .eq('id', schoolId);

    if (updateSchoolError) {
      console.error(updateSchoolError);
      Alert.alert('Error', "Could not update school's user list: " + updateSchoolError.message);
      setJoiningSchool(null);
      return;
    }

    // 3. Update the user's school_id
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ school_id: schoolId })
      .eq('id', user.id);

    setJoiningSchool(null); // Clear loading state

    if (updateUserError) {
      console.error(updateUserError);
      Alert.alert('Error', 'Could not link user to school: ' + updateUserError.message);
    } else {
      Alert.alert('Success', `You have joined ${schoolName}!`);
      navigation.replace('MainNavigation'); // Navigate to MainNavigation
    }
  };

  // Create new school
  const handleCreateSchool = async () => {
    if (!newSchoolName.trim() || !user) {
      Alert.alert('Error', 'School name is required.');
      return;
    }
    setCreating(true);

    const { data: newSchool, error: insertError } = await supabase
      .from('schools')
      .insert([{
        name: newSchoolName,
        address: newSchoolAddress,
        contact_email: newSchoolContactEmail,
        contact_phone: newSchoolContactPhone,
        logo_url: newSchoolLogoUrl,
        created_by: user.id,
        users: [user.id] // Initialize with the creator's UUID
      }])
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      Alert.alert('Error', 'Failed to create school: ' + insertError.message);
      setCreating(false);
      return;
    } else {
      // 2. Link user to new school
      const { error: updateError } = await supabase
        .from('users')
        .update({ school_id: newSchool.id })
        .eq('id', user.id);

      if (updateError) {
        console.error('handleCreateSchool: Error linking user to new school:', updateError);
        Alert.alert('Error', 'Failed to link user to new school: ' + updateError.message);
        setCreating(false);
        return;
      }

      Alert.alert('Success', `School "${newSchoolName}" created and linked!`);
      navigation.replace('MainNavigation');
    }

    setCreating(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to ClassConnect</Text>
      <Text style={styles.subtitle}>Join your school or create a new one</Text>

      {/* --- JOIN EXISTING --- */}
      <Text style={styles.sectionTitle}>Join Existing School</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search for a school"
          value={search}
          onChangeText={setSearch}
        />
        <Button title="Search" disabled={searching} />
      </View>

      {searching ? (
        <ActivityIndicator style={{ marginTop: 10 }} />
      ) : (
        <FlatList
          data={schools}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.schoolCard}>
              <Text style={styles.schoolName}>{item.name}</Text>
              <Button
                title="Join"
                onPress={() => handleJoinSchool(item.id, item.name)}
                disabled={joiningSchool === item.id} // Disable if this school is being joined
              />
            </View>
          )}
          ListEmptyComponent={
            search.length > 0 && !searching ? (
              <Text style={{ textAlign: 'center', marginVertical: 10 }}>No schools found</Text>
            ) : null
          }
        />
      )}

      {/* --- CREATE NEW --- */}
      <Text style={styles.sectionTitle}>Create New School</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter new school name"
        value={newSchoolName}
        onChangeText={setNewSchoolName}
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={newSchoolAddress}
        onChangeText={setNewSchoolAddress}
      />
      <TextInput
        style={styles.input}
        placeholder="Contact Email"
        value={newSchoolContactEmail}
        onChangeText={setNewSchoolContactEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contact Phone"
        value={newSchoolContactPhone}
        onChangeText={setNewSchoolContactPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Logo URL (optional)"
        value={newSchoolLogoUrl}
        onChangeText={setNewSchoolLogoUrl}
        autoCapitalize="none"
      />
      <Button title={creating ? 'Creating...' : 'Create School'} onPress={handleCreateSchool} disabled={creating} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schoolCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
  },
  schoolName: {
    fontSize: 16,
  },
});
