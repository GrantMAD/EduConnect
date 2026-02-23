import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useSchool } from '../../context/SchoolContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ManagementListSkeleton, { SkeletonPiece } from '../../components/skeletons/ManagementListSkeleton';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import { faBook, faChalkboardTeacher, faPlus, faChevronRight, faBookOpen, faUsers } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { getAvatarUrl } from '../../lib/utils';

// Import services
import { getCurrentUser } from '../../services/authService';
import { getUserProfile } from '../../services/userService';
import { getClassesBySchoolQuery } from '../../services/classService';

const ClassCard = React.memo(({ item, theme, navigation, userRole }) => (
  <TouchableOpacity
    style={[styles.classCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
    activeOpacity={0.8}
    onPress={() => {
      navigation.navigate('StudentClassDashboard', { classId: item.id, className: item.name });
    }}
  >
    <View style={styles.cardContent}>
      {/* Top Row: Icon, Title and Subject Badge */}
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <View style={[styles.iconBox, { backgroundColor: '#05966910' }]}>
            <FontAwesomeIcon icon={faBookOpen} size={18} color="#059669" />
          </View>
          <Text style={[styles.className, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
        </View>
        {item.subject && (
          <View style={[styles.subjectBadge, { backgroundColor: '#05966915' }]}>
            <Text style={[styles.subjectBadgeText, { color: '#059669' }]}>{item.subject.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Teacher Info Section */}
      <View style={styles.teacherSection}>
        <Image 
          source={getAvatarUrl(item.teacher?.avatar_url, item.teacher?.email, item.teacher_id)} 
          style={styles.teacherAvatar} 
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.teacherLabel, { color: theme.colors.placeholder }]}>INSTRUCTOR</Text>
          <Text style={[styles.teacherName, { color: theme.colors.text }]} numberOfLines={1}>
            {item.teacher?.full_name || 'Assigning...'}
          </Text>
        </View>
      </View>

      {/* Stats / Footer Row */}
      <View style={styles.cardFooter}>
        <View style={styles.statGroup}>
          <FontAwesomeIcon 
            icon={faBook} 
            size={12} 
            color={item.class_resources?.length > 0 ? '#059669' : theme.colors.placeholder} 
          />
          <Text style={[styles.statText, { color: item.class_resources?.length > 0 ? '#059669' : theme.colors.placeholder }]}>
            {item.class_resources?.length || 0} Materials
          </Text>
        </View>
        <View style={styles.actionLink}>
          <Text style={[styles.portalText, { color: '#059669' }]}>
            {userRole === 'teacher' || userRole === 'admin' ? 'MANAGE' : 'VIEW'}
          </Text>
          <FontAwesomeIcon icon={faChevronRight} size={10} color="#059669" />
        </View>
      </View>
    </View>
  </TouchableOpacity>
));

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
    return <ClassCard item={item} theme={theme} navigation={navigation} userRole={userRole} />;
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

      {!loading && (
        <View style={styles.countContainer}>
          <Text style={[styles.countText, { color: '#059669' }]}>
            {classes.length} {classes.length === 1 ? 'Academic Class' : 'Academic Classes'} Found
          </Text>
          <View style={[styles.countDivider, { backgroundColor: '#059669', opacity: 0.3 }]} />
        </View>
      )}

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
    color: '#d1fae5',
    fontSize: 14,
    fontWeight: '500',
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
    padding: 20,
    paddingBottom: 40,
  },
  countContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  countDivider: {
    height: 1,
    width: 40,
    marginTop: 8,
    borderRadius: 1,
  },
  classCard: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  cardContent: {
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginLeft: 12,
    flex: 1,
  },
  teacherSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  teacherAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  teacherLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
  },
  statGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  portalText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});