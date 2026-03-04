import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSchool, faPlusCircle, faChevronDown, faBuilding, faMapMarkerAlt, faEnvelope, faPhone, faGraduationCap, faArrowLeft, faSearch, faSpinner, faTimes, faLock, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { Modal } from 'react-native';

import SchoolSetupScreenSkeleton from '../components/skeletons/SchoolSetupScreenSkeleton';
import { SkeletonPiece } from '../components/skeletons/SettingsScreenSkeleton';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser, signOut as signOutService } from '../services/authService';
import { getUserProfile, updateSchoolRequestStatus, updateUserRole, updateSchoolId } from '../services/userService';
import { searchSchools, fetchSchoolNameById, createSchool } from '../services/schoolService';
import { sendNotification } from '../services/notificationService';

const { width } = Dimensions.get('window');

const AnimatedLoader = ({ size = 20, color = '#fff' }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <FontAwesomeIcon icon={faSpinner} size={size} color={color} />
    </Animated.View>
  );
};

const SchoolSetupScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState([]);
  const [searching, setSearching] = useState(false);
  const [joiningSchool, setJoiningSchool] = useState(null);
  const [selectedSchoolForJoin, setSelectedSchoolForJoin] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
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
  const [studentAccountMinGrade, setStudentAccountMinGrade] = useState('Grade 4');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const schoolTypes = useMemo(() => ['Primary School', 'High School', 'University', 'College', 'Other'], []);

  const getAvailableGrades = useCallback((type) => {
    if (type === 'Primary School') return ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7'];
    if (type === 'High School') return ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    return ['None'];
  }, []);

  const availableGrades = useMemo(() => getAvailableGrades(schoolType), [schoolType, getAvailableGrades]);

  const handleSchoolTypeChange = useCallback((type) => {
    setSchoolType(type);
    const newGrades = getAvailableGrades(type);
    setStudentAccountMinGrade(newGrades[0]);
  }, [getAvailableGrades]);

  const [creating, setCreating] = useState(false);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;

      const userData = await getUserProfile(authUser.id);
      if (!userData) throw new Error('User data not found');

      setUser({ ...authUser, ...userData });
      setRequestStatus(userData?.school_request_status || null);
      setRole(userData?.role || null);

      if (userData?.school_request_status === 'declined') {
        if (userData.requested_school_id) {
          const school = await fetchSchoolNameById(userData.requested_school_id);
          if (school) {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const performSearch = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSchools([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const data = await searchSchools(searchTerm);
      setSchools(data || []);
    } catch (error) {
      console.error(error);
      showToast('Unable to search for schools.', 'error');
    } finally {
      setSearching(false);
    }
  }, [showToast]);

  useEffect(() => {
    const handler = setTimeout(() => performSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search, performSearch]);

  const handleJoinSchool = useCallback(async (school) => {
    if (!user) return;

    if (school.join_password && school.join_password !== passwordInput) {
      if (!selectedSchoolForJoin || selectedSchoolForJoin.id !== school.id) {
        setSelectedSchoolForJoin(school);
        setPasswordInput('');
        return;
      }
      showToast('Incorrect school password.', 'error');
      return;
    }

    setJoiningSchool(school.id);

    try {
      await updateSchoolRequestStatus(user.id, 'pending', school.id);

      setRequestStatus('pending');
      setDeclinedMessage(null);

      await sendNotification({
        user_id: school.created_by,
        type: 'school_join_request',
        title: 'New School Join Request',
        message: `${user.full_name || user.email} has requested to join your school "${school.name}"`,
        is_read: false,
        created_by: user.id,
      });

      setUser(prev => ({ ...prev, school_request_status: 'pending', requested_school_id: school.id }));
      showToast('Your request is pending approval.', 'success');
      setSelectedSchoolForJoin(null);
      setPasswordInput('');
    } catch (err) {
      console.error(err);
      showToast('Failed to send join request: ' + err.message, 'error');
    } finally {
      setJoiningSchool(null);
    }
  }, [user, showToast, passwordInput, selectedSchoolForJoin]);

  const handleCancelJoin = useCallback(() => {
    setSelectedSchoolForJoin(null);
    setPasswordInput('');
  }, []);

  const handleCancelRequest = useCallback(async () => {
    if (!user) return;
    setCancellingRequest(true);

    try {
      const requestedSchoolId = user.requested_school_id;

      if (!requestedSchoolId || requestedSchoolId === 'null') {
        await updateSchoolRequestStatus(user.id, null, null);

        setRequestStatus(null);
        setUser(prev => ({ ...prev, school_request_status: null, requested_school_id: null }));
        showToast('Request cancelled successfully.', 'success');
        setCancellingRequest(false);
        return;
      }

      const schoolData = await fetchSchoolNameById(requestedSchoolId);

      await updateSchoolRequestStatus(user.id, null, null);

      await sendNotification({
        user_id: schoolData.created_by,
        type: 'school_join_request_cancelled',
        title: 'Join Request Cancelled',
        message: `${user.full_name || user.email} has cancelled their request to join "${schoolData.name}"`,
        is_read: false,
        created_by: user.id,
      });

      setRequestStatus(null);
      setUser(prev => ({ ...prev, school_request_status: null, requested_school_id: null }));
      showToast('Request cancelled successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to cancel request: ' + err.message, 'error');
    } finally {
      setCancellingRequest(false);
    }
  }, [user, showToast]);

  const handleCreateSchool = useCallback(async () => {
    if (!newSchoolName.trim() || !user) {
      showToast('School name is required.', 'error');
      return;
    }
    setCreating(true);

    try {
      const generatedPassword = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newSchool = await createSchool({
        name: newSchoolName,
        address: newSchoolAddress,
        contact_email: newSchoolContactEmail,
        contact_phone: newSchoolContactPhone,
        created_by: user.id,
        users: [user.id],
        school_type: schoolType,
        student_account_min_grade: studentAccountMinGrade,
        join_password: generatedPassword,
      });

      await updateUserRole(user.id, 'admin');
      await updateSchoolId(user.id, newSchool.id);

      showToast(`School created! Password: ${generatedPassword}`, 'success');
      navigation.replace('MainNavigation');
    } catch (err) {
      console.error(err);
      showToast('Failed to create school: ' + err.message, 'error');
    } finally {
      setCreating(false);
    }
  }, [newSchoolName, newSchoolAddress, newSchoolContactEmail, newSchoolContactPhone, schoolType, user, showToast, navigation]);

  const handleSignOut = useCallback(async () => {
    await signOutService();
  }, []);

  const openTypePicker = useCallback(() => setShowTypePicker(true), []);
  const closeTypePicker = useCallback(() => setShowTypePicker(false), []);
  const openGradePicker = useCallback(() => setShowGradePicker(true), []);
  const closeGradePicker = useCallback(() => setShowGradePicker(false), []);

  if (requestStatus === 'pending') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <View style={[styles.setupCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, padding: 32, alignItems: 'center' }]}>
          <View style={[styles.iconBoxLarge, { backgroundColor: theme.colors.primary + '15' }]}>
            <AnimatedLoader size={32} color={theme.colors.primary} />
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
                    <FontAwesomeIcon icon={selectedSchoolForJoin ? faLock : faSearch} size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.cardHeaderTitle, { color: theme.colors.text }]}>{selectedSchoolForJoin ? 'Enter Password' : 'Find your School'}</Text>
                    <Text style={styles.cardHeaderSubtitle}>{selectedSchoolForJoin ? 'SECURITY VERIFICATION' : 'COMMUNITY CONNECTION'}</Text>
                  </View>
                </View>

                {!selectedSchoolForJoin ? (
                  <>
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

                    <View style={{ minHeight: 280 }}>
                      {/* Loader */}
                      <View
                        style={[
                          styles.searchingBox,
                          {
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            height: 280,
                            justifyContent: 'center',
                            zIndex: 10,
                            opacity: searching ? 1 : 0,
                            backgroundColor: theme.colors.card // Match card background to cover results
                          }
                        ]}
                        pointerEvents={searching ? 'auto' : 'none'}
                      >
                        <View style={{ alignItems: 'center' }}>
                          <AnimatedLoader size={32} color={theme.colors.primary} />
                          <Text style={[styles.searchingText, { color: theme.colors.placeholder, marginTop: 12 }]}>SEARCHING...</Text>
                        </View>
                      </View>

                      {/* Results or Empty State */}
                      <View style={{ opacity: searching ? 0 : 1 }}>
                        {schools.length > 0 ? (
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
                                  style={[styles.joinBtn, { backgroundColor: theme.colors.primary, width: 80, height: 40, justifyContent: 'center', alignItems: 'center' }]}
                                  onPress={() => handleJoinSchool(item)}
                                  disabled={joiningSchool === item.id}
                                >
                                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={[styles.joinBtnText, { opacity: joiningSchool === item.id ? 0 : 1 }]}>Join</Text>
                                    <View style={{ position: 'absolute', opacity: joiningSchool === item.id ? 1 : 0 }} pointerEvents="none">
                                      <AnimatedLoader size={16} color="#fff" />
                                    </View>
                                  </View>
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
                    </View>
                  </>
                ) : (
                  <View style={{ paddingVertical: 10 }}>
                    <Text style={{ color: theme.colors.placeholder, textAlign: 'center', marginBottom: 24, fontSize: 14 }}>
                      Please enter the access password for{'\n'}
                      <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>{selectedSchoolForJoin.name}</Text>
                    </Text>

                    <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, marginBottom: 24 }]}>
                      <FontAwesomeIcon icon={faLock} size={16} color={theme.colors.placeholder} style={{ marginRight: 12 }} />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text, textAlign: 'center', letterSpacing: 4 }]}
                        placeholder="PASSWORD"
                        placeholderTextColor={theme.colors.placeholder}
                        secureTextEntry
                        autoFocus
                        value={passwordInput}
                        onChangeText={setPasswordInput}
                      />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity
                        style={[styles.joinBtn, { backgroundColor: theme.colors.cardBorder, flex: 1, height: 50, justifyContent: 'center', alignItems: 'center' }]}
                        onPress={handleCancelJoin}
                      >
                        <Text style={[styles.joinBtnText, { color: theme.colors.text }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.joinBtn, { backgroundColor: theme.colors.primary, flex: 2, height: 50, justifyContent: 'center', alignItems: 'center' }]}
                        onPress={() => handleJoinSchool(selectedSchoolForJoin)}
                        disabled={joiningSchool === selectedSchoolForJoin.id}
                      >
                        <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                          <Text style={[styles.joinBtnText, { opacity: joiningSchool === selectedSchoolForJoin.id ? 0 : 1 }]}>Join School</Text>
                          <View style={{ position: 'absolute', opacity: joiningSchool === selectedSchoolForJoin.id ? 1 : 0 }} pointerEvents="none">
                            <AnimatedLoader size={16} color="#fff" />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
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
                    onPress={openTypePicker}
                  >
                    <Text style={[styles.input, { color: theme.colors.text, lineHeight: 20, paddingTop: 12 }]}>{schoolType}</Text>
                    <FontAwesomeIcon icon={faChevronDown} size={12} color={theme.colors.placeholder} />
                  </TouchableOpacity>
                </View>

                {schoolType !== 'University' && schoolType !== 'College' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>MIN GRADE FOR STUDENT ACCOUNTS</Text>
                    <TouchableOpacity
                      style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                      onPress={openGradePicker}
                    >
                      <Text style={[styles.input, { color: theme.colors.text, lineHeight: 20, paddingTop: 12 }]}>{studentAccountMinGrade}</Text>
                      <FontAwesomeIcon icon={faChevronDown} size={12} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 9, color: theme.colors.placeholder, marginTop: 4, marginLeft: 4 }}>
                      Students below this grade must be managed by parents.
                    </Text>
                  </View>
                )}

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
                    <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <Text style={[styles.createBtnText, { opacity: creating ? 0 : 1 }]}>Finish Registration</Text>
                      <View style={{ position: 'absolute', opacity: creating ? 1 : 0 }} pointerEvents="none">
                        <AnimatedLoader size={24} color="#fff" />
                      </View>
                    </View>
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
        onRequestClose={closeTypePicker}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeTypePicker}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select School Type</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {schoolTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.modalItem, { borderBottomColor: theme.colors.cardBorder + '30' }]}
                  onPress={() => {
                    handleSchoolTypeChange(type);
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

      <Modal
        visible={showGradePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={closeGradePicker}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeGradePicker}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Min Account Grade</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableGrades.map((grade) => (
                <TouchableOpacity
                  key={grade}
                  style={[styles.modalItem, { borderBottomColor: theme.colors.cardBorder + '30' }]}
                  onPress={() => {
                    setStudentAccountMinGrade(grade);
                    setShowGradePicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: theme.colors.text }, studentAccountMinGrade === grade && { color: theme.colors.primary, fontWeight: '900' }]}>{grade}</Text>
                  {studentAccountMinGrade === grade && <FontAwesomeIcon icon={faSchool} size={16} color={theme.colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default React.memo(SchoolSetupScreen);

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