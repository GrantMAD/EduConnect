import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TextInput, FlatList, TouchableOpacity, Modal, Image, Dimensions, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import UserManagementScreenSkeleton, { UserItemSkeleton } from '../components/skeletons/UserManagementScreenSkeleton';
import {
  faTimes,
  faArrowLeft,
  faUsers,
  faChevronLeft,
  faSearch,
  faChevronRight,
  faUserCircle,
  faEnvelope,
  faPhone,
  faGlobe,
  faGraduationCap,
  faCalendarAlt,
  faIdCard,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import { useToastActions } from '../context/ToastContext';
import { useSchool } from '../context/SchoolContext';
import { useTheme } from '../context/ThemeContext';
import { useSupabaseInfiniteQuery } from '../hooks/useSupabaseInfiniteQuery';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvatarUrl } from '../lib/utils';

// Import services
import { updateUserRole, getUsersBySchoolQuery, updateUserGrade } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { getGradesBySchoolType, isGradeRestricted } from '../utils/gradeUtils';
import { ALL_GRADES } from '../constants/GradeConstants';

const InfoRow = ({ label, value, icon, theme, fullWidth }) => (
  <View style={[styles.infoRow, { width: fullWidth ? '100%' : '48%' }, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
    <View style={[styles.infoIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
      <FontAwesomeIcon icon={icon} size={12} color={theme.colors.primary} />
    </View>
    <View style={styles.infoTextContainer}>
      <Text style={[styles.infoLabel, { color: theme.colors.placeholder }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.colors.text }]} numberOfLines={1}>{value || 'N/A'}</Text>
    </View>
  </View>
);

const UserItem = React.memo(({ item, theme, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [onPress, item]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={{ paddingHorizontal: 20 }}
    >
      <View style={[styles.userItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
        <View style={styles.itemLeft}>
          <View style={[styles.avatarBox, { borderColor: theme.colors.cardBorder }]}>
            <Image
              source={getAvatarUrl(item.avatar_url, item.email, item.id)}
              style={styles.avatar}
            />
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.full_name || item.email}</Text>
            <View style={[styles.roleBadge, {
              backgroundColor: item.role === 'admin' ? '#fff1f2' : item.role === 'teacher' ? '#ecfdf5' : item.role === 'parent' ? '#fff7ed' : '#eef2ff'
            }]}>
              <Text style={[styles.roleText, {
                color: item.role === 'admin' ? '#e11d48' : item.role === 'teacher' ? '#059669' : item.role === 'parent' ? '#d97706' : '#4f46e5'
              }]}>{item.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>
        <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.cardBorder} />
      </View>
    </TouchableOpacity>
  );
});

const UserManagementScreen = ({ navigation, route }) => {
  const { fromDashboard } = route?.params || {};
  const { profile: adminProfile } = useAuth();
  const { schoolId } = useSchool();
  const { showToast } = useToastActions();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const fetchUsersQuery = useCallback(({ from, to }) => {
    if (!schoolId) return Promise.resolve({ data: [], error: null });

    return getUsersBySchoolQuery({
      schoolId,
      searchQuery,
      from,
      to
    });
  }, [schoolId, searchQuery]);

  const {
    data: users,
    setData: setUsers,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    refetch,
    loadMore
  } = useSupabaseInfiniteQuery(
    `users_${schoolId}_${searchQuery}`,
    fetchUsersQuery,
    {
      pageSize: 20,
      dependencies: [schoolId, searchQuery]
    }
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const openModal = useCallback((user) => {
    setSelectedUser(user);
    setIsModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedUser(null);
    setIsModalVisible(false);
  }, []);

  const handleRoleChange = useCallback(async (newRole) => {
    if (!selectedUser) return;
    if (selectedUser.role === newRole) return;

    try {
      const data = await updateUserRole(selectedUser.id, newRole);

      if (!data) {
        showToast('Update failed: No permissions.', 'error');
      } else {
        showToast('User role updated successfully.', 'success');

        setUsers(prevUsers =>
          prevUsers.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u)
        );
        setSelectedUser({ ...selectedUser, role: newRole });
      }
    } catch (err) {
      console.error('Error updating role:', err);
      showToast('An unexpected error occurred.', 'error');
    }
  }, [selectedUser, setUsers, showToast]);

  const handleGradeChange = useCallback(async (newGrade) => {
    if (!selectedUser) return;
    if (selectedUser.grade === newGrade) return;

    try {
      await updateUserGrade(selectedUser.id, newGrade);
      showToast('User grade updated successfully.', 'success');

      setUsers(prevUsers =>
        prevUsers.map(u => u.id === selectedUser.id ? { ...u, grade: newGrade } : u)
      );
      setSelectedUser({ ...selectedUser, grade: newGrade });
    } catch (err) {
      console.error('Error updating grade:', err);
      showToast('Failed to update grade.', 'error');
    }
  }, [selectedUser, setUsers, showToast]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [loadingMore, theme.colors.primary]);

  const ListHeader = useMemo(() => (
    <View>
      <LinearGradient
        colors={['#4f46e5', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <FontAwesomeIcon icon={faChevronLeft} size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.heroTitle}>User Management</Text>
            </View>
            <Text style={styles.heroDescription}>
              Administer student, teacher, and parent accounts across your school.
            </Text>
          </View>
          <View style={styles.countBadge}>
            <FontAwesomeIcon icon={faUsers} size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.countValue}>{loading ? '...' : users.length}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <FontAwesomeIcon icon={faSearch} color={theme.colors.placeholder} size={14} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search by name..."
            placeholderTextColor={theme.colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
    </View>
  ), [navigation, loading, users.length, theme, searchQuery]);

  const renderItem = useCallback(({ item }) => loading ? (
    <View style={{ paddingHorizontal: 20 }}><UserItemSkeleton /></View>
  ) : (
    <UserItem item={item} theme={theme} onPress={openModal} />
  ), [loading, theme, openModal]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ListHeaderComponent={ListHeader}
        data={loading ? [1, 2, 3, 4, 5, 6, 7, 8] : users}
        keyExtractor={(item, index) => loading ? index.toString() : item.id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={renderItem}
        ListEmptyComponent={!loading && <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No users found.</Text>}
      />

      {selectedUser && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={closeModal}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.text} />
              </TouchableOpacity>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ width: '100%' }}
                contentContainerStyle={{ alignItems: 'center', paddingBottom: 20 }}
              >
                <View style={[styles.modalAvatarBox, { borderColor: theme.colors.cardBorder }]}>
                  <Image
                    source={getAvatarUrl(selectedUser.avatar_url, selectedUser.email, selectedUser.id)}
                    style={styles.modalAvatar}
                  />
                </View>

                <Text style={[styles.modalUserName, { color: theme.colors.text }]}>{selectedUser.full_name}</Text>
                <Text style={[styles.modalEmail, { color: theme.colors.placeholder }]}>{selectedUser.email}</Text>
                <Text style={[styles.modalIdGray, { color: theme.colors.placeholder, marginTop: 6 }]}>ID: {selectedUser.id}</Text>

                <View style={styles.detailsDivider}>
                  <Text style={[styles.dividerText, { color: theme.colors.placeholder }]}>ACCOUNT DETAILS</Text>
                  <View style={[styles.dividerLine, { backgroundColor: theme.colors.cardBorder }]} />
                </View>

                <View style={styles.infoGrid}>
                  <InfoRow label="PHONE" value={selectedUser.number} icon={faPhone} theme={theme} fullWidth />
                  <InfoRow label="COUNTRY" value={selectedUser.country} icon={faGlobe} theme={theme} fullWidth />

                  {selectedUser.role === 'student' ? (
                    <View style={[styles.gridPickerSection, {
                      width: '100%',
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.cardBorder,
                      borderWidth: 1
                    }]}>
                      <View style={[styles.infoIconBox, { backgroundColor: theme.colors.primary + '10', marginTop: 4 }]}>
                        <FontAwesomeIcon icon={faGraduationCap} size={12} color={theme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.gridPickerLabel, { color: theme.colors.placeholder }]}>GRADE</Text>
                        <Picker
                          selectedValue={selectedUser.grade}
                          style={[styles.picker, { color: theme.colors.text, marginTop: -8, marginLeft: -8 }]}
                          itemStyle={{ color: theme.colors.text, fontSize: 13 }}
                          dropdownIconColor={theme.colors.placeholder}
                          onValueChange={(itemValue) => handleGradeChange(itemValue)}
                        >
                          <Picker.Item label="Select Grade" value="" />
                          {adminProfile?.student_account_min_grade && adminProfile.student_account_min_grade !== 'Grade 1' && (
                            <Picker.Item
                              label={`Grades below ${adminProfile.student_account_min_grade} unavailable`}
                              value=""
                              color={theme.colors.placeholder}
                            />
                          )}
                          {getGradesBySchoolType(adminProfile?.school_type).map(grade => (
                            <Picker.Item
                              key={grade}
                              label={grade}
                              value={grade}
                              enabled={!isGradeRestricted(grade, adminProfile?.student_account_min_grade, ALL_GRADES)}
                            />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  ) : (
                    <InfoRow label="GRADE" value={selectedUser.grade} icon={faGraduationCap} theme={theme} fullWidth />
                  )}

                  <View style={[styles.gridPickerSection, {
                    width: '100%',
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.cardBorder,
                    borderWidth: 1
                  }]}>
                    <View style={[styles.infoIconBox, { backgroundColor: theme.colors.primary + '10', marginTop: 4 }]}>
                      <FontAwesomeIcon icon={faShieldAlt} size={12} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.gridPickerLabel, { color: theme.colors.placeholder }]}>USER ROLE</Text>
                      <Picker
                        selectedValue={selectedUser.role}
                        style={[styles.picker, { color: theme.colors.text, marginTop: -8, marginLeft: -8 }]}
                        itemStyle={{ color: theme.colors.text, fontSize: 13 }}
                        dropdownIconColor={theme.colors.placeholder}
                        onValueChange={(itemValue) => handleRoleChange(itemValue)}
                      >
                        <Picker.Item label="Admin" value="admin" />
                        <Picker.Item label="Parent" value="parent" />
                        <Picker.Item label="Student" value="student" />
                        <Picker.Item label="Teacher" value="teacher" />
                      </Picker>
                    </View>
                  </View>

                  <InfoRow
                    label="JOINED ON"
                    value={new Date(selectedUser.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    icon={faCalendarAlt}
                    theme={theme}
                    fullWidth
                  />
                </View>

                <Text style={[styles.roleHint, { color: theme.colors.placeholder, marginTop: 24 }]}>
                  Note: Role and Student Grade can be modified by admins. Other data must be updated by the user or through specific management tools.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

export default React.memo(UserManagementScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    padding: 24,
    paddingTop: 40,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -1,
  },
  heroDescription: {
    color: '#e0e7ff',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: { marginRight: 12 },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  countValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    height: 54,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  userItem: {
    padding: 14,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    borderRadius: 32,
    padding: 24,
    width: '90%',
    maxHeight: '85%',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalAvatarBox: {
    width: 100,
    height: 100,
    borderRadius: 32,
    borderWidth: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  modalAvatar: {
    width: '100%',
    height: '100%',
  },
  modalUserName: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalEmail: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalIdGray: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.6,
  },
  pickerSection: {
    width: '100%',
    padding: 16,
    borderRadius: 24,
    marginBottom: 24,
  },
  gridPickerSection: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  gridPickerLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  pickerLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  picker: {
    width: '100%',
  },
  detailsDivider: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginRight: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  infoGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  infoRow: {
    padding: 12,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleHint: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  userId: {
    fontSize: 10,
    fontWeight: '700',
  },
  backButtonText: {
    display: 'none',
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
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  searchInputFocused: {
    borderColor: '#007AFF',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    width: 50,
  },
  modalValue: {
    fontSize: 16,
  },
  modalId: {
    color: '#999',
    fontSize: 12,
  },
  roleDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
});