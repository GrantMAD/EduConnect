import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesome5 } from '@expo/vector-icons';

const RoleCard = ({ role, description, icon, onPress, loading }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} disabled={loading}>
    <FontAwesome5 name={icon} size={32} color="#007AFF" style={styles.cardIcon} />
    <View style={styles.cardTextContainer}>
      <Text style={styles.cardTitle}>{role}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
    {loading && <ActivityIndicator color="#007AFF" style={styles.cardSpinner} />}
  </TouchableOpacity>
);

export default function RoleSelectionScreen({ navigation }) {
  const [loadingRole, setLoadingRole] = useState(null);

  const updateUserRole = async (role) => {
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
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to ClassConnect!</Text>
      <Text style={styles.subtitle}>Please select your role in the school to continue.</Text>

      <RoleCard
        role="Student"
        description="I am a student at the school."
        icon="user-graduate"
        onPress={() => updateUserRole('student')}
        loading={loadingRole === 'student'}
      />
      <RoleCard
        role="Parent"
        description="I am a parent of a student at the school."
        icon="user-friends"
        onPress={() => updateUserRole('parent')}
        loading={loadingRole === 'parent'}
      />
      <RoleCard
        role="Teacher"
        description="I am a teacher at the school."
        icon="chalkboard-teacher"
        onPress={() => updateUserRole('teacher')}
        loading={loadingRole === 'teacher'}
      />
      <RoleCard
        role="Admin"
        description="I am an administrator of the school."
        icon="user-shield"
        onPress={() => updateUserRole('admin')}
        loading={loadingRole === 'admin'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardIcon: {
    marginRight: 20,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  cardSpinner: {
    marginLeft: 'auto',
  },
});
