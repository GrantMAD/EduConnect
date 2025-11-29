import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import AnnouncementCardSkeleton from '../components/skeletons/AnnouncementCardSkeleton';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faCalendar, faUsers, faTimes } from '@fortawesome/free-solid-svg-icons';
import AnnouncementDetailModal from '../components/AnnouncementDetailModal';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const placeholderImage = require('../assets/user.png'); // Using existing asset as placeholder

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

export default function AnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userClasses, setUserClasses] = useState([]); // New state for classes user is associated with
  const [allClasses, setAllClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { schoolId, loadingSchool, schoolData } = useSchool();
  const { theme } = useTheme(); // Use the theme hook

  useEffect(() => {
    const initializeUserAndClasses = async () => {
      if (loadingSchool) return; // Wait for school data to load

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
  }, [schoolId, loadingSchool, schoolData]); // Re-run when schoolId, loadingSchool or schoolData changes

  const fetchAllClasses = async () => {
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
  };

  useFocusEffect(
    React.useCallback(() => {
      // Fetch announcements only when schoolId, userRole, userClasses, and allClasses are ready
      if (schoolId && userRole !== null && userClasses !== null && allClasses !== null) {
        fetchAnnouncements();
      }
    }, [schoolId, userRole, userClasses, allClasses])
  );

  const fetchUserRole = async () => {
    // This function is now integrated into initializeUserAndClasses
  };

  const fetchUserClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schoolId) {
      setUserClasses([]);
      return;
    }

    try {
      // Fetch user's role first
      const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (userError) throw userError;
      const role = userData?.role;

      let associatedClassIds = [];

      // Fetch classes the user is directly a member of (student or teacher)
      const { data: memberClasses, error: memberError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);
      if (memberError) throw memberError;
      if (memberClasses) {
        associatedClassIds.push(...memberClasses.map(m => m.class_id));
      }

      // If user is a parent, fetch their children's classes
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
  };



  const fetchAnnouncements = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase.from('announcements').select('*, author:users(full_name), class:classes(name)').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(50);  // Pagination: Load first 50 announcements

      const { data, error } = await query;

      if (error) throw error;

      if (userRole === 'admin') {
        setAnnouncements(data);
      } else if (userRole === 'teacher' || userRole === 'student' || userRole === 'parent') {
        const filteredAnnouncements = data.filter(announcement => {
          // Always show general announcements
          if (!announcement.class_id) {
            return true;
          }
          // Show class-specific announcements if the user is in that class
          return userClasses.includes(announcement.class_id);
        });
        setAnnouncements(filteredAnnouncements);
      } else {
        // For other roles or if role not yet loaded, show nothing or general announcements
        setAnnouncements(data.filter(announcement => !announcement.class_id));
      }

    } catch (error) {
      console.error('Error fetching announcements:', error.message);
      // Alert.alert('Error', 'Failed to fetch announcements.'); // Commented out to avoid spamming on minor fetch issues
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  const onRefresh = React.useCallback(async () => {

    setRefreshing(true);

    await fetchAnnouncements();

  }, [schoolId, userRole, userClasses, allClasses]);

  const handleCardPress = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowModal(true);
  };

  if (loading || loadingSchool) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.welcomeContainer}>
          <View style={[styles.skeleton, { width: '70%', height: 24, borderRadius: 4, marginBottom: 5 }]} />
          <View style={[styles.skeleton, { width: '90%', height: 16, borderRadius: 4 }]} />
        </View>
        <View style={[styles.imageContainer, styles.skeleton]} />
        <View style={styles.sectionHeaderContainer}>
          <View style={[styles.skeleton, { width: '40%', height: 20, borderRadius: 4 }]} />
        </View>
        <FlatList
          data={[1, 2, 3]} // Render 3 skeleton cards
          keyExtractor={(item) => item.toString()}
          renderItem={() => <AnnouncementCardSkeleton />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Welcome Area */}
      <View style={styles.welcomeContainer}>
        <Text style={[styles.welcomeText, { color: theme.colors.text }]}>Welcome to Announcements!</Text>
        <Text style={[styles.welcomeDescription, { color: theme.colors.text }]}>Stay updated with the latest news and updates from your school.</Text>
      </View>

      {/* Placeholder Image Area */}
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => userRole === 'admin' && navigation.navigate('SchoolData')}
        disabled={userRole !== 'admin'}
      >
        {schoolData?.logo_url ? (
          <Image source={{ uri: schoolData.logo_url }} style={styles.placeholderImage} />
        ) : (
          <View style={[styles.placeholderImageContainer, { backgroundColor: theme.colors.inputBackground }]}>
            <Text style={[styles.placeholderText, { color: theme.colors.placeholder }]}>Currently no school image</Text>
            {userRole === 'admin' && (
              <Text style={[styles.placeholderSubText, { color: theme.colors.placeholder }]}>Press here to change your school's image in the settings</Text>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* List of Announcements Area */}
      <View style={styles.sectionHeaderContainer}>
        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Latest Announcements</Text>
        {(userRole === 'admin' || userRole === 'teacher') && (
          <TouchableOpacity
            style={styles.addTextButton}
            onPress={() => navigation.navigate('CreateAnnouncement')}
          >
            <Text style={[styles.addTextButtonText, { color: theme.colors.primary }]}>+ Add Announcement</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.announcementCount, { color: theme.colors.placeholder }]}>{announcements.length} announcements</Text>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={onRefresh}
        refreshing={refreshing}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleCardPress(item)} style={[styles.cardContainer, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
            <View style={[styles.typeIndicator, item.type === 'general' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.success }]} />
            <View style={styles.cardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesomeIcon icon={faBullhorn} size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
                </View>
                {new Date(item.created_at) > new Date(Date.now() - 48 * 60 * 60 * 1000) ? (
                  <View style={[styles.newBadge, { backgroundColor: theme.colors.error }]}>
                    <Text style={[styles.newBadgeText, { color: theme.colors.buttonPrimaryText }]}>NEW</Text>
                  </View>
                ) : (
                  <View style={[styles.oldBadge, { backgroundColor: theme.colors.buttonSecondary }]}>
                    <Text style={[styles.oldBadgeText, { color: theme.colors.buttonPrimaryText }]}>OLD</Text>
                  </View>
                )}
              </View>
              <View style={styles.postedByContainer}>
                <Text style={[styles.postedBy, { color: theme.colors.placeholder }]}>Posted by: {item.author ? item.author.full_name : 'Unknown Author'}</Text>
                <Text style={[styles.timeSince, { color: theme.colors.placeholder }]}>{timeSince(item.created_at)}</Text>
              </View>
              <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
              <Text style={[styles.messagePreview, { color: theme.colors.text }]} numberOfLines={3}>
                {item.message.length > 100 ? item.message.substring(0, 100) + '...' : item.message}
              </Text>
              {item.class?.name && (
                <View>
                  <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
                  <View style={styles.classLabelContainer}>
                    <FontAwesomeIcon icon={faUsers} size={12} color={theme.colors.placeholder} />
                    <Text style={[styles.classLabel, { color: theme.colors.placeholder }]}>For class: {item.class.name}</Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No announcements yet.</Text>}
      />

      <AnnouncementDetailModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        announcement={selectedAnnouncement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  welcomeContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  welcomeDescription: {
    fontSize: 16,
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: 20,
    width: '100%',
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  placeholderSubText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  skeleton: {
    backgroundColor: '#E0E0E0', // Skeletons can remain a fixed color or be themed
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  announcementCount: {
    fontSize: 14,
    marginBottom: 10,
  },
  addTextButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addTextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
    overflow: 'hidden', // Ensures the border radius applies to the type indicator
  },
  typeIndicator: {
    width: 8,
    height: '100%',
  },
  generalType: {
    // backgroundColor handled by theme.colors.primary
  },
  classType: {
    // backgroundColor handled by theme.colors.success
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 5,
  },
  newBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 10,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  oldBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 10,
  },
  oldBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  postedBy: {
    fontSize: 12,
  },
  postedByContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeSince: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  messagePreview: {
    fontSize: 14,
  },
  classLabel: {
    fontSize: 12,
    marginLeft: 5,
  },
  separator: {
    height: 1,
    marginVertical: 10,
  },
  classLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
  },
});