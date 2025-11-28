import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSchool, faPlusCircle, faChevronDown, faBuilding, faMapMarkerAlt, faEnvelope, faPhone, faGraduationCap, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Modal } from 'react-native';

import SchoolSetupScreenSkeleton from '../components/skeletons/SchoolSetupScreenSkeleton';
import { useToast } from '../context/ToastContext';

export default function SchoolSetupScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  // Join existing school
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState([]);
  const [searching, setSearching] = useState(false);
  const [joiningSchool, setJoiningSchool] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null); // 'pending' | 'declined'
  const [declinedMessage, setDeclinedMessage] = useState(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  // Create new school
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolContactEmail, setNewSchoolContactEmail] = useState('');
  const [newSchoolContactPhone, setNewSchoolContactPhone] = useState('');

  const [newSchoolLogoUrl, setNewSchoolLogoUrl] = useState('');
  const [schoolType, setSchoolType] = useState('Primary School');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const schoolTypes = ['Primary School', 'High School', 'University', 'College', 'Other'];
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

          const { data: userData, error: userDataError } = await supabase
            .from('users')
            .select('school_request_status, requested_school_id, role, full_name')
            .eq('id', authUser.id)
            .single();
          if (userDataError) throw userDataError;

          // Combine authUser and userData into a single user object for the state
          setUser({ ...authUser, ...userData });

          setRequestStatus(userData?.school_request_status || null);
          setRole(userData?.role || null);

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
      .select('id, name, created_by, logo_url')
      .ilike('name', `%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error(error);
      showToast('Unable to search for schools.', 'error');
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
          message: `${user.full_name || user.email} has requested to join your school "${schoolName}"`,
          is_read: false,
          created_by: user.id,
        }]);
      if (notifError) throw notifError;

      // Update local user state
      setUser({ ...user, school_request_status: 'pending', requested_school_id: schoolId });
      showToast('Your request is pending approval.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to send join request: ' + err.message, 'error');
    } finally {
      setJoiningSchool(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;
    setCancellingRequest(true);

    try {
      const requestedSchoolId = user.requested_school_id;

      // Check if we have a valid school ID
      if (!requestedSchoolId || requestedSchoolId === 'null') {
        // Just clear the status if no valid school ID
        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            school_request_status: null,
            requested_school_id: null,
          })
          .eq('id', user.id);
        if (updateError) throw updateUserError;

        setRequestStatus(null);
        setUser({ ...user, school_request_status: null, requested_school_id: null });
        showToast('Request cancelled successfully.', 'success');
        setCancellingRequest(false);
        return;
      }
      // Get school creator info before clearing the request
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('created_by, name')
        .eq('id', requestedSchoolId)
        .single();

      if (schoolError) throw schoolError;

      // Clear user's request status
      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          school_request_status: null,
          requested_school_id: null,
        })
        .eq('id', user.id);
      if (updateUserError) throw updateUserError;

      // First, check if the notification exists
      const { data: existingNotif, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('created_by', user.id)
        .eq('user_id', schoolData.created_by)
        .eq('type', 'school_join_request');

      if (fetchError) {
        console.error('Error fetching notification:', fetchError);
      }

      // Update the original join request notification to a cancellation notification
      const { data: updateResult, error: updateNotifError } = await supabase
        .from('notifications')
        .update({
          type: 'school_join_request_cancelled',
          title: 'Join Request Cancelled',
          message: `${user.full_name || user.email} has cancelled their request to join "${schoolData.name}"`,
          is_read: false, // Mark as unread so admin sees the update
        })
        .eq('created_by', user.id)
        .eq('user_id', schoolData.created_by)
        .eq('type', 'school_join_request')
        .select();

      if (updateNotifError) {
        console.error('Error updating notification:', updateNotifError);
        // Don't throw - the important part (clearing user status) already succeeded
      }

      setRequestStatus(null);
      setUser({ ...user, school_request_status: null, requested_school_id: null });
      showToast('Request cancelled successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to cancel request: ' + err.message, 'error');
    } finally {
      setCancellingRequest(false);
    }
  };

  const handleCreateSchool = async () => {
    if (!newSchoolName.trim() || !user) {
      showToast('School name is required.', 'error');
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

          created_by: user.id,
          created_by: user.id,
          users: [user.id],
          school_type: schoolType,
        }])
        .select()
        .single();
      if (insertError) throw insertError;

      const { error: updateError } = await supabase
        .from('users')
        .update({ school_id: newSchool.id })
        .eq('id', user.id);
      if (updateError) throw updateError;

      showToast(`School "${newSchoolName}" created and linked!`, 'success');
      navigation.replace('MainNavigation');
    } catch (err) {
      console.error(err);
      showToast('Failed to create school: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return <SchoolSetupScreenSkeleton />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}>
      <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')} style={styles.backButton}>
        <FontAwesomeIcon icon={faArrowLeft} size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>Back to Role Selection</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Welcome to ClassConnect</Text>


      {(role === 'student' || role === 'parent' || role === 'teacher') && (
        <>
          {/* --- JOIN EXISTING --- */}
          {/* --- JOIN EXISTING --- */}
          <View style={styles.sectionHeaderContainer}>
            <FontAwesomeIcon icon={faSchool} size={20} color="#007AFF" style={{ marginRight: 10 }} />
            <Text style={styles.sectionTitle}>Join Existing School</Text>
          </View>
          <Text style={styles.sectionDescription}>Search for your school and send a request to join. Acceptance is determined by the school admins.</Text>

          {requestStatus === 'pending' ? (
            <View>
              <Text style={styles.pendingText}>Request is currently pending...</Text>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelRequest}
                disabled={cancellingRequest}
              >
                <Text style={styles.cancelButtonText}>
                  {cancellingRequest ? 'Cancelling...' : 'Cancel Request'}
                </Text>
              </TouchableOpacity>
            </View>
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
                        <Image
                          source={item.logo_url ? { uri: item.logo_url } : require('../assets/DefaultSchool.png')}
                          style={styles.schoolLogo}
                        />
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
        </>
      )}

      {role === 'admin' && (
        <>
          {/* --- CREATE NEW --- */}
          {/* --- CREATE NEW --- */}
          <View style={styles.sectionHeaderContainer}>
            <FontAwesomeIcon icon={faPlusCircle} size={20} color="#333" style={{ marginRight: 10 }} />
            <Text style={styles.sectionTitle}>Create New School</Text>
          </View>
          <Text style={styles.sectionDescription}>Register a new school and become its administrator.</Text>
          <View style={styles.inputHeaderContainer}>
            <FontAwesomeIcon icon={faBuilding} size={16} color="#333" style={{ marginRight: 8 }} />
            <Text style={styles.inputHeading}>School Name</Text>
          </View>
          <Text style={styles.inputDescription}>Enter the official name of your school.</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new school name"
            value={newSchoolName}
            onChangeText={setNewSchoolName}
          />
          <View style={styles.inputHeaderContainer}>
            <FontAwesomeIcon icon={faMapMarkerAlt} size={16} color="#333" style={{ marginRight: 8 }} />
            <Text style={styles.inputHeading}>Address</Text>
          </View>
          <Text style={styles.inputDescription}>Provide the physical address of your school.</Text>
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={newSchoolAddress}
            onChangeText={setNewSchoolAddress}
          />
          <View style={styles.inputHeaderContainer}>
            <FontAwesomeIcon icon={faEnvelope} size={16} color="#333" style={{ marginRight: 8 }} />
            <Text style={styles.inputHeading}>Contact Email</Text>
          </View>
          <Text style={styles.inputDescription}>Enter the primary contact email for your school.</Text>
          <TextInput
            style={styles.input}
            placeholder="Contact Email"
            value={newSchoolContactEmail}
            onChangeText={setNewSchoolContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.inputHeaderContainer}>
            <FontAwesomeIcon icon={faPhone} size={16} color="#333" style={{ marginRight: 8 }} />
            <Text style={styles.inputHeading}>Contact Number</Text>
          </View>
          <Text style={styles.inputDescription}>Enter the primary contact phone number for your school.</Text>
          <TextInput
            style={styles.input}
            placeholder="Contact Number"
            value={newSchoolContactPhone}
            onChangeText={(text) => setNewSchoolContactPhone(text.replace(/[^0-9]/g, ''))}
            keyboardType="phone-pad"
          />

          <View style={styles.inputHeaderContainer}>
            <FontAwesomeIcon icon={faGraduationCap} size={16} color="#333" style={{ marginRight: 8 }} />
            <Text style={styles.inputHeading}>School Type</Text>
          </View>
          <Text style={styles.inputDescription}>Select the type of educational institution.</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={styles.dropdownButtonText}>{schoolType}</Text>
            <FontAwesomeIcon icon={faChevronDown} size={16} color="#666" />
          </TouchableOpacity>

          <Modal
            visible={showTypePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowTypePicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowTypePicker(false)}
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select School Type</Text>
                {schoolTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.modalItem}
                    onPress={() => {
                      setSchoolType(type);
                      setShowTypePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.modalItemText,
                      schoolType === type && styles.modalItemTextSelected
                    ]}>
                      {type}
                    </Text>
                    {schoolType === type && (
                      <FontAwesomeIcon icon={faSchool} size={16} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateSchool}
            disabled={creating}
          >
            <Text style={styles.createButtonText}>{creating ? 'Creating...' : 'Create School'}</Text>
          </TouchableOpacity>
        </>
      )}

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
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
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
  schoolLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  schoolName: { fontSize: 16, color: '#333', fontWeight: '500', flex: 1 },
  joinButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  joinButtonText: { color: '#fff', fontWeight: '600' },
  createButton: {
    backgroundColor: '#007AFF',
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
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  inputHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4 },
  inputHeading: { fontSize: 16, fontWeight: '600', color: '#333' },
  inputDescription: { fontSize: 12, color: '#666', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#777', marginBottom: 15 },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  dropdownButtonText: { fontSize: 16, color: '#333' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemText: {
    fontSize: 16,
    color: '#333',
  },
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
