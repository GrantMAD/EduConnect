import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSchool } from '../../context/SchoolContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ManagementListSkeleton, { SkeletonPiece } from '../../components/skeletons/ManagementListSkeleton';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import { faBook, faChalkboardTeacher, faPlus, faChevronRight, faBookOpen, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../../services/authService';
import { getUserProfile } from '../../services/userService';
import { getClassesBySchoolQuery } from '../../services/classService';

const ManageClassesScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const { schoolId } = useSchool();
  const { showToast } = useToast();
  const { theme } = useTheme();

  const fetchTeachersClasses = useCallback(async () => {
    setLoading(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) {
        showToast('User not authenticated.', 'error');
        setLoading(false);
        return;
      }

      const userData = await getUserProfile(authUser.id);
      if (!userData) throw new Error('User data not found');

      setUserRole(userData.role);

      if (!schoolId) {
        setLoading(false);
        return;
      }

      const query = getClassesBySchoolQuery({
        schoolId,
        teacherId: userData.role === 'teacher' ? authUser.id : null
      });

      const { data, error } = await query;

      if (error) throw error;
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error.message);
      showToast('Failed to fetch classes.', 'error');
    } finally {
      setLoading(false);
    }
  }, [schoolId, showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchTeachersClasses();
    }, [fetchTeachersClasses])
  );

  const renderClassItem = useCallback(({ item }) => {
    if (loading) return <CardSkeleton />;

    return (
      <TouchableOpacity
        style={[styles.classCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
        activeOpacity={0.7}
        onPress={() => {
          navigation.navigate('StudentClassDashboard', { classId: item.id, className: item.name });
        }}
      >
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: '#10b98115' }]}>
              <FontAwesomeIcon icon={faBookOpen} size={18} color="#10b981" />
            </View>
            <Text style={[styles.className, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailRow}>
              <FontAwesomeIcon icon={faChalkboardTeacher} size={12} color={theme.colors.placeholder} style={{ marginRight: 8 }} />
              <Text style={[styles.detailText, { color: theme.colors.placeholder }]}>
                Teacher: {item.teacher?.full_name || 'Assigning...'}
              </Text>
            </View>
            {item.subject && (
              <View style={styles.detailRow}>
                <FontAwesomeIcon icon={faBook} size={12} color={theme.colors.placeholder} style={{ marginRight: 8 }} />
                <Text style={[styles.detailText, { color: theme.colors.placeholder }]}>Subject: {item.subject}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <FontAwesomeIcon icon={faBookOpen} size={12} color={item.class_resources?.length > 0 ? '#6366f1' : theme.colors.placeholder} style={{ marginRight: 8 }} />
              <Text style={[styles.detailText, { color: item.class_resources?.length > 0 ? '#6366f1' : theme.colors.placeholder, fontWeight: item.class_resources?.length > 0 ? '700' : '500' }]}>
                {item.class_resources?.length > 0 
                  ? `${item.class_resources.length} Resource${item.class_resources.length === 1 ? '' : 's'} linked` 
                  : 'No resources linked yet'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.portalText}>{userRole === 'teacher' || userRole === 'admin' ? 'MANAGE CLASS' : 'CLASS DASHBOARD'}</Text>
            <FontAwesomeIcon icon={faChevronRight} size={10} color="#10b981" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [loading, theme, navigation, userRole]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#059669', '#0d9488']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>My Classes</Text>
            <Text style={styles.heroDescription}>
              Manage your course materials and stay organized with your school schedule.
            </Text>
          </View>
          {(userRole === 'admin' || userRole === 'teacher') && (
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => navigation.navigate('CreateClass', { fromManageClassesScreen: true })}
            >
              <FontAwesomeIcon icon={faPlus} size={14} color="#059669" />
              <Text style={styles.heroButtonText}>New</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={loading ? [1, 2, 3] : classes}
        keyExtractor={(item, index) => loading ? index.toString() : item.id.toString()}
        renderItem={renderClassItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!loading && (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No classes found. Create one!</Text>
          </View>
        )}
      />
    </View>
  );
}

export default React.memo(ManageClassesScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    padding: 20,
    marginBottom: 0,
    elevation: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
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
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroDescription: {
    color: '#d1fae5',
    fontSize: 14,
  },
  heroButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  heroButtonText: {
    color: '#059669',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  classCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  cardDetails: {
    marginBottom: 16,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 12,
  },
  portalText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
});