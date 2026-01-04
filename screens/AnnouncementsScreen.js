import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import AnnouncementCardSkeleton from '../components/skeletons/AnnouncementCardSkeleton';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faCalendar, faUsers, faTimes, faWifi, faChevronRight, faPlus, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import AnnouncementDetailModal from '../components/AnnouncementDetailModal';
import { useTheme } from '../context/ThemeContext';
import { useSupabaseInfiniteQuery } from '../hooks/useSupabaseInfiniteQuery';
import LinearGradient from 'react-native-linear-gradient';

const timeSince = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " years ago";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " months ago";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " days ago";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  return Math.floor(seconds) + " seconds ago";
};

const AnnouncementItem = React.memo(({ item, theme, onPress, isNew }) => (
    <TouchableOpacity 
        onPress={() => onPress(item)} 
        style={[styles.cardContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#4f46e5', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.leftAccent}
        />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.datePill, { backgroundColor: theme.colors.background }]}>
              <FontAwesomeIcon icon={faCalendarAlt} size={10} color={theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.datePillText, { color: theme.colors.text }]}>
                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            {isNew && (
              <LinearGradient
                colors={['#ef4444', '#f97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.newBadge}
              >
                <Text style={styles.newBadgeText}>NEW</Text>
              </LinearGradient>
            )}
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{item.title}</Text>
          
          <View style={styles.cardBottomRow}>
            {item.class?.name ? (
              <View style={[styles.classBadgeNew, { backgroundColor: theme.colors.primary + '10' }]}>
                <Text style={[styles.classBadgeTextNew, { color: theme.colors.primary }]}>
                  {item.class.name}
                </Text>
              </View>
            ) : (
              <View style={[styles.classBadgeNew, { backgroundColor: '#64748b10' }]}>
                <Text style={[styles.classBadgeTextNew, { color: '#64748b' }]}>General</Text>
              </View>
            )}
            
            <View style={styles.authorBadge}>
              <View style={[styles.authorAvatarSmall, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.authorInitial}>{item.author?.full_name?.charAt(0) || 'A'}</Text>
              </View>
              <Text style={[styles.authorNameSmall, { color: theme.colors.placeholder }]} numberOfLines={1}>
                {item.author?.full_name || 'Admin'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
));

const AnnouncementsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userClasses, setUserClasses] = useState([]); 
  const [allClasses, setAllClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const { schoolId, loadingSchool, schoolData } = useSchool();
  const { theme } = useTheme(); 

  const fetchAnnouncementsQuery = useCallback(({ from, to }) => {
    if (!schoolId) return Promise.resolve({ data: [], error: null });

    let query = supabase.from('announcements')
      .select('*, author:users(full_name), class:classes(name)')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (userRole === 'admin') {
      // Admin sees all
    } else if (['teacher', 'student', 'parent'].includes(userRole)) {
      if (userClasses.length > 0) {
        query = query.or(`class_id.is.null,class_id.in.(${userClasses.join(',')})`);
      } else {
        query = query.is('class_id', null);
      }
    } else {
      query = query.is('class_id', null);
    }
    
    return query;
  }, [schoolId, userRole, userClasses]);

  const { 
    data: announcementsData, 
    loading: announcementsLoading, 
    loadingMore,
    refreshing: announcementsRefreshing, 
    isOffline, 
    hasMore,
    refetch,
    loadMore
  } = useSupabaseInfiniteQuery(
    `announcements_${schoolId}_${userRole}`, 
    fetchAnnouncementsQuery,
    {
      pageSize: 15,
      dependencies: [schoolId, userRole, userClasses.length]
    }
  );

  const announcements = announcementsData || [];
  const isLoading = loading || loadingSchool || announcementsLoading;

  const fetchUserClasses = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schoolId) {
      setUserClasses([]);
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (userError) throw userError;
      const role = userData?.role;

      let associatedClassIds = [];

      const { data: memberClasses, error: memberError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);
      if (memberError) throw memberError;
      if (memberClasses) {
        associatedClassIds.push(...memberClasses.map(m => m.class_id));
      }

      if (role === 'parent') {
        const { data: children, error: childrenError } = await supabase
          .from('parent_child_relationships')
          .select('child_id')
          .eq('parent_id', user.id);
        if (childrenError) throw childrenError;

        if (children && children.length > 0) {
          const childIds = children.map(c => c.child_id);
          const { data: childClasses, error: childClassesError } = await supabase
            .from('class_members')
            .select('class_id')
            .in('user_id', childIds);
          if (childClassesError) throw childClassesError;
          if (childClasses) {
            associatedClassIds.push(...childClasses.map(m => m.class_id));
          }
        }
      }

      const uniqueClassIds = [...new Set(associatedClassIds)];
      setUserClasses(uniqueClassIds);

    } catch (error) {
      console.error('Error fetching user classes:', error.message);
      setUserClasses([]);
    }
  }, [schoolId]);

  const fetchAllClasses = useCallback(async () => {
    if (!schoolId) return;
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId);
      if (error) throw error;
      setAllClasses(data);
    } catch (error) {
      console.error('Error fetching all classes:', error.message);
    }
  }, [schoolId]);

  useEffect(() => {
    const initializeUserAndClasses = async () => {
      if (loadingSchool) return; 

      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
      await fetchUserClasses();
      await fetchAllClasses();

      if (schoolData?.logo_url) {
        await Image.prefetch(schoolData.logo_url);
      }

      setLoading(false);
    };

    initializeUserAndClasses();
  }, [schoolId, loadingSchool, schoolData, fetchUserClasses, fetchAllClasses]);

  useFocusEffect(
    useCallback(() => {
      if (schoolId && userRole !== null && userClasses !== null && allClasses !== null) {
        refetch();
      }
    }, [schoolId, userRole, userClasses, allClasses, refetch])
  );

  const onRefresh = useCallback(async () => {
    refetch();
  }, [refetch]);

  const handleCardPress = useCallback((announcement) => {
    setSelectedAnnouncement(announcement);
    setShowModal(true);
  }, []);

  const renderAnnouncementItem = useCallback(({ item }) => {
    if (isLoading) {
      return <AnnouncementCardSkeleton />;
    }

    const isNew = (new Date() - new Date(item.created_at)) / (1000 * 60 * 60 * 24) < 3;

    return (
      <AnnouncementItem 
        item={item} 
        theme={theme} 
        onPress={handleCardPress} 
        isNew={isNew} 
      />
    );
  }, [isLoading, theme, handleCardPress]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [loadingMore, theme.colors.primary]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: theme.colors.error }]}>
          <FontAwesomeIcon icon={faWifi} size={14} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.offlineText}>You are offline. Showing cached data.</Text>
        </View>
      )}
      <FlatList
        data={isLoading ? [1, 2, 3] : announcements}
        keyExtractor={(item, index) => isLoading ? index.toString() : item.id.toString()}
        onRefresh={onRefresh}
        refreshing={announcementsRefreshing}
        onEndReached={() => {
          if (hasMore && !loadingMore && !isLoading) {
            loadMore();
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={true}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={() => (
          <View style={styles.headerContainer}>
             <LinearGradient
                colors={['#4f46e5', '#1d4ed8']} // Indigo-600 to Blue-700
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.heroContainer}
              >
                <View style={styles.heroContent}>
                  <View style={styles.heroTextContainer}>
                    <Text style={styles.heroTitle}>School Announcements</Text>
                    <Text style={styles.heroDescription}>
                      Stay informed about the latest news and updates.
                    </Text>
                  </View>
                  {(userRole === 'admin' || userRole === 'teacher') && (
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={() => navigation.navigate('CreateAnnouncement')}
                    >
                      <FontAwesomeIcon icon={faPlus} size={14} color="#4f46e5" />
                      <Text style={styles.createButtonText}>New</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
              
            <View style={styles.statsRow}>
               <Text style={[styles.statsText, { color: theme.colors.placeholder }]}>
                 {isLoading ? '--' : announcements.length} Published
               </Text>
            </View>
          </View>
        )}
        renderItem={renderAnnouncementItem}
        ListEmptyComponent={!isLoading && (
            <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.cardBackground }]}>
                    <FontAwesomeIcon icon={faBullhorn} size={30} color={theme.colors.placeholder} />
                </View>
                <Text style={[styles.emptyText, { color: theme.colors.text }]}>No announcements found</Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.placeholder }]}>Check back later for updates.</Text>
            </View>
        )}
      />

      <AnnouncementDetailModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        announcement={selectedAnnouncement}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 16,
  },
  heroContainer: {
    borderRadius: 16,
    margin: 16,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  heroContent: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  heroDescription: {
    fontSize: 14,
    color: '#e0e7ff', // Indigo-100
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createButtonText: {
    color: '#4f46e5',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  statsRow: {
    paddingHorizontal: 20,
    marginBottom: 5,
  },
  statsText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 0, // Explicitly 0 as requested
  },
  leftAccent: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  datePillText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  classBadgeNew: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  classBadgeTextNew: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  authorInitial: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  authorNameSmall: {
    fontSize: 11,
    fontWeight: '700',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
      alignItems: 'center',
      padding: 40,
  },
  emptyIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
  },
  emptyText: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
  },
  emptySubtext: {
      fontSize: 14,
  }
});

export default React.memo(AnnouncementsScreen);