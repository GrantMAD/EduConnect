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
  Dimensions
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSchool, faPlusCircle, faChevronDown, faBuilding, faMapMarkerAlt, faEnvelope, faPhone, faGraduationCap, faArrowLeft, faSearch, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Modal } from 'react-native';

import SchoolSetupScreenSkeleton from '../components/skeletons/SchoolSetupScreenSkeleton';
import { SkeletonPiece } from '../components/skeletons/SettingsScreenSkeleton';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

export default function SchoolSetupScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState([]);
  const [searching, setSearching] = useState(false);
  const [joiningSchool, setJoiningSchool] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null); 
  const [declinedMessage, setDeclinedMessage] = useState(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { theme } = useTheme();

  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolContactEmail, setNewSchoolContactEmail] = useState('');
  const [newSchoolContactPhone, setNewSchoolContactPhone] = useState('');

  const [schoolType, setSchoolType] = useState('Primary School');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const schoolTypes = ['Primary School', 'High School', 'University', 'College', 'Other'];
  const [creating, setCreating] = useState(false);

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

          setUser({ ...authUser, ...userData });
          setRequestStatus(userData?.school_request_status || null);
          setRole(userData?.role || null);

          if (userData?.school_request_status === 'declined') {
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
      .select('id, name, created_by, logo_url, address')
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

  React.useEffect(() => {
    const handler = setTimeout(() => performSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const handleJoinSchool = async (schoolId, schoolName, createdBy) => {
    if (!user) return;
    setJoiningSchool(schoolId);

    try {
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

      if (!requestedSchoolId || requestedSchoolId === 'null') {
        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            school_request_status: null,
            requested_school_id: null,
          })
          .eq('id', user.id);
        if (updateUserError) throw updateUserError;

        setRequestStatus(null);
        setUser({ ...user, school_request_status: null, requested_school_id: null });
        showToast('Request cancelled successfully.', 'success');
        setCancellingRequest(false);
        return;
      }
      
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('created_by, name')
        .eq('id', requestedSchoolId)
        .single();

      if (schoolError) throw schoolError;

      const { error: updateUserError } = await supabase
        .from('users')
        .update({
          school_request_status: null,
          requested_school_id: null,
        })
        .eq('id', user.id);
      if (updateUserError) throw updateUserError;

      await supabase
        .from('notifications')
        .update({
          type: 'school_join_request_cancelled',
          title: 'Join Request Cancelled',
          message: `${user.full_name || user.email} has cancelled their request to join "${schoolData.name}"`,
          is_read: false,
        })
        .eq('created_by', user.id)
        .eq('user_id', schoolData.created_by)
        .eq('type', 'school_join_request');

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

  if (requestStatus === 'pending') {
    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
            <View style={[styles.setupCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, padding: 32, alignItems: 'center' }]}>
                <View style={[styles.iconBoxLarge, { backgroundColor: theme.colors.primary + '15' }]}>
                    <FontAwesomeIcon icon={faSpinner} size={32} color={theme.colors.primary} />
                </View>
                <Text style={[styles.cardTitleLarge, { color: theme.colors.text }]}>Request Pending</Text>
                <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>
                    Your request to join the school is waiting for admin approval. You'll be notified once it's processed.
                </Text>
                <TouchableOpacity onPress={handleCancelRequest} disabled={cancellingRequest} style={{ marginTop: 20 }}>
                    <Text style={{ color: theme.colors.error, fontWeight: '700' }}>{cancellingRequest ? 'Cancelling...' : 'Cancel Request'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSignOut} style={{ marginTop: 32 }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Decorative Blobs */}
      <View style={[styles.blob, styles.blobTop, { backgroundColor: theme.colors.primary + '10' }]} />
      <View style={[styles.blob, styles.blobBottom, { backgroundColor: '#10b98110' }]} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')} style={styles.backButton}>
            <FontAwesomeIcon icon={faArrowLeft} size={14} color={theme.colors.placeholder} />
            <Text style={[styles.backButtonText, { color: theme.colors.placeholder }]}>CHANGE ROLE</Text>
        </TouchableOpacity>

        <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Let's connect your <Text style={{ color: theme.colors.primary }}>workspace</Text>.</Text>
            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>
                {role === 'admin' ? 'Complete your registration by creating your school profile.' : 'Search for your school to join your community.'}
            </Text>
        </View>

        {loading ? (
            <View style={{ width: '100%', marginTop: 20 }}>
                <SkeletonPiece style={{ width: '100%', height: 400, borderRadius: 32 }} />
            </View>
        ) : (
            <View style={[styles.setupCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                {(role === 'student' || role === 'parent' || role === 'teacher') && (
                    <View style={styles.cardInner}>
                        <View style={styles.cardHeaderRow}>
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                <FontAwesomeIcon icon={faSearch} size={20} color={theme.colors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>Find your School</Text>
                                <Text style={styles.cardHeaderSubtitle}>COMMUNITY CONNECTION</Text>
                            </View>
                        </View>

                        <View style={[styles.searchWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.placeholder} style={{ marginRight: 12 }} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.colors.text }]}
                                placeholder="Search by name..."
                                placeholderTextColor={theme.colors.placeholder}
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>

                        {searching ? (
                            <View style={styles.searchingBox}>
                                <ActivityIndicator color={theme.colors.primary} />
                                <Text style={[styles.searchingText, { color: theme.colors.placeholder }]}>SEARCHING...</Text>
                            </View>
                        ) : schools.length > 0 ? (
                            <View style={styles.resultsList}>
                                {schools.map((item) => (
                                    <View key={item.id} style={[styles.schoolItem, { borderBottomColor: theme.colors.cardBorder + '30' }]}>
                                        <View style={styles.schoolItemLeft}>
                                            <View style={[styles.schoolLogoBox, { backgroundColor: theme.colors.background }]}>
                                                <Image
                                                    source={item.logo_url ? { uri: item.logo_url } : require('../assets/DefaultSchool.png')}
                                                    style={styles.schoolLogo}
                                                />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={[styles.schoolItemName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
                                                <Text style={[styles.schoolItemAddr, { color: theme.colors.placeholder }]} numberOfLines={1}>{item.address || 'Address not listed'}</Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={[styles.joinBtn, { backgroundColor: theme.colors.primary }]}
                                            onPress={() => handleJoinSchool(item.id, item.name, item.created_by)}
                                            disabled={joiningSchool === item.id}
                                        >
                                            <Text style={styles.joinBtnText}>Join</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ) : search.length > 0 ? (
                            <View style={styles.searchingBox}>
                                <Text style={[styles.searchingText, { color: theme.colors.placeholder }]}>NO SCHOOLS FOUND</Text>
                            </View>
                        ) : (
                            <View style={styles.emptySearch}>
                                <FontAwesomeIcon icon={faBuilding} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                                <Text style={[styles.emptySearchText, { color: theme.colors.placeholder }]}>Start typing to find your institution.</Text>
                            </View>
                        )}
                    </View>
                )}

                {role === 'admin' && (
                    <View style={styles.cardInner}>
                        <View style={styles.cardHeaderRow}>
                            <View style={[styles.iconBox, { backgroundColor: '#10b98115' }]}>
                                <FontAwesomeIcon icon={faSchool} size={20} color="#10b981" />
                            </View>
                            <View>
                                <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>Register School</Text>
                                <Text style={styles.cardHeaderSubtitle}>INSTITUTIONAL SETUP</Text>
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>OFFICIAL NAME</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text }]}
                                    placeholder="e.g. Green Valley High"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={newSchoolName}
                                    onChangeText={setNewSchoolName}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>PHYSICAL ADDRESS</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text, height: 80 }]}
                                    placeholder="Street, City, Province"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={newSchoolAddress}
                                    onChangeText={setNewSchoolAddress}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.inputLabel}>INSTITUTION CATEGORY</Text>
                            <TouchableOpacity
                                style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                                onPress={() => setShowTypePicker(true)}
                            >
                                <Text style={[styles.input, { color: theme.colors.text, lineHeight: 20, paddingTop: 12 }]}>{schoolType}</Text>
                                <FontAwesomeIcon icon={faChevronDown} size={12} color={theme.colors.placeholder} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={styles.createBtnContainer} 
                            onPress={handleCreateSchool} 
                            disabled={creating}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#10b981', '#059669']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.createBtn}
                            >
                                {creating ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.createBtnText}>Finish Registration</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showTypePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTypePicker(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select School Type</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
                {schoolTypes.map((type) => (
                <TouchableOpacity
                    key={type}
                    style={[styles.modalItem, { borderBottomColor: theme.colors.cardBorder + '30' }]}
                    onPress={() => {
                    setSchoolType(type);
                    setShowTypePicker(false);
                    }}
                >
                    <Text style={[styles.modalItemText, { color: theme.colors.text }, schoolType === type && { color: theme.colors.primary, fontWeight: '900' }]}>{type}</Text>
                    {schoolType === type && <FontAwesomeIcon icon={faSchool} size={16} color={theme.colors.primary} />}
                </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  blobTop: { top: -100, right: -100 },
  blobBottom: { bottom: -100, left: -100 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  backButtonText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', textAlign: 'center', letterSpacing: -1, marginBottom: 12 },
  subtitle: { fontSize: 15, textAlign: 'center', fontWeight: '500', lineHeight: 22 },
  setupCard: { borderRadius: 32, overflow: 'hidden', elevation: 0 },
  cardInner: { padding: 24 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  iconBoxLarge: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  cardHeaderTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  cardHeaderSubtitle: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginTop: 2 },
  cardTitleLarge: { fontSize: 24, fontWeight: '900', marginBottom: 12 },
  cardSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, height: 56, marginBottom: 24 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '700' },
  searchingBox: { padding: 40, alignItems: 'center', gap: 12 },
  searchingText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  emptySearch: { padding: 40, alignItems: 'center' },
  emptySearchText: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 12, lineHeight: 18 },
  resultsList: { minHeight: 280 },
  schoolItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  schoolItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  schoolLogoBox: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  schoolLogo: { width: '100%', height: '100%' },
  schoolItemName: { fontSize: 14, fontWeight: '900' },
  schoolItemAddr: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  joinBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  joinBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  formGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, height: 56 },
  input: { flex: 1, fontSize: 15, fontWeight: '700' },
  createBtnContainer: { marginTop: 12 },
  createBtn: { height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  signOutButton: { marginTop: 40, alignItems: 'center', paddingVertical: 12 },
  signOutText: { color: '#FF3B30', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 32, padding: 24, width: '85%', maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  modalItem: { paddingVertical: 18, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalItemText: { fontSize: 16, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
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
  modalItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
