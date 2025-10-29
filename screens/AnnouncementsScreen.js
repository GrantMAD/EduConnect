import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useFocusEffect } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn, faCalendar, faUser, faTag, faTimes } from '@fortawesome/free-solid-svg-icons';

const placeholderImage = require('../assets/user.png'); // Using existing asset as placeholder

export default function AnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [userClasses, setUserClasses] = useState([]); // New state for classes user is associated with
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const { schoolId } = useSchool();

  useEffect(() => {
    const initializeUserAndClasses = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error: userError } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
      await fetchUserClasses();
      setLoading(false);
    };

    initializeUserAndClasses();
  }, [schoolId]); // Re-run when schoolId changes

  useFocusEffect(
    React.useCallback(() => {
      // Fetch announcements only when schoolId, userRole, and userClasses are ready
      if (schoolId && userRole !== null && userClasses !== null) {
        fetchAnnouncements();
      }
    }, [schoolId, userRole, userClasses])
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

        // Fetch classes where the user is a student

        const { data: studentClasses, error: studentError } = await supabase

          .from('classes')

          .select('id')

          .eq('school_id', schoolId)

          .contains('users', [user.id]); // Check if user.id is in the 'users' array

  

        // Fetch classes where the user is a teacher

        const { data: teacherClasses, error: teacherError } = await supabase

          .from('classes')

          .select('id')

          .eq('school_id', schoolId)

          .eq('teacher_id', user.id);

  

        if (studentError) throw studentError;

        if (teacherError) throw teacherError;

  

        const allAssociatedClasses = [...(studentClasses || []), ...(teacherClasses || [])];

        const uniqueClassIds = [...new Set(allAssociatedClasses.map(cls => cls.id))];

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

        let query = supabase.from('announcements').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });

  

        const { data, error } = await query;

  

        if (error) throw error;

  

        if (userRole === 'admin') {

          setAnnouncements(data);

        } else if (userRole === 'teacher' || userRole === 'student') {

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

        Alert.alert('Error', 'Failed to fetch announcements.');

      } finally {

        setLoading(false);

      }

    };

  const handleCardPress = (announcement) => {
    setSelectedAnnouncement(announcement);
    setShowModal(true);
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      {/* Welcome Area */}
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Welcome to Announcements!</Text>
        <Text style={styles.welcomeDescription}>Stay updated with the latest news and updates from your school.</Text>
      </View>

      {/* Placeholder Image Area */}
      <View style={styles.imageContainer}>
        <Image source={placeholderImage} style={styles.placeholderImage} />
      </View>

      {/* List of Announcements Area */}
      <View style={styles.sectionHeaderContainer}>
        <Text style={styles.sectionHeader}>Latest Announcements</Text>
        {(userRole === 'admin' || userRole === 'teacher') && (
          <TouchableOpacity
            style={styles.addTextButton}
            onPress={() => navigation.navigate('CreateAnnouncement')}
          >
            <Text style={styles.addTextButtonText}>+ Add Announcement</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleCardPress(item)} style={styles.cardContainer}>
            <View style={[styles.typeIndicator, item.type === 'general' ? styles.generalType : styles.classType]} />
            <View style={styles.cardContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                <FontAwesomeIcon icon={faBullhorn} size={18} color="#007AFF" style={{ marginRight: 10 }} />
                <Text style={styles.title}>{item.title}</Text>
              </View>
              <Text style={styles.messagePreview} numberOfLines={3}>
                {item.message.length > 100 ? item.message.substring(0, 100) + '...' : item.message}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No announcements yet.</Text>}
      />

      {/* Announcement Detail Modal */}
      <Modal
        isVisible={showModal}
        onBackdropPress={() => setShowModal(false)}
        animationIn="fadeInUp"
        animationOut="fadeOutDown"
        backdropOpacity={0.4}
      >
                <View style={styles.modalContent}>
                  <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseButton}>
                    <FontAwesomeIcon icon={faTimes} size={20} color="#666" />
                  </TouchableOpacity>
        
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
            <FontAwesomeIcon icon={faBullhorn} size={24} color="#007AFF" style={{ marginRight: 10, marginTop: 2 }} />
            <Text style={styles.modalTitle}>{selectedAnnouncement?.title}</Text>
          </View>

          <View style={styles.modalSeparator} />

          <Text style={styles.modalMessageText}>{selectedAnnouncement?.message}</Text>

          <View style={styles.modalSeparator} />

          {selectedAnnouncement?.class_id && (
            <View style={styles.modalDetailRow}>
              <FontAwesomeIcon icon={faTag} size={16} color="#007AFF" style={styles.modalIcon} />
              <Text style={styles.modalDetailText}>Target Class: {selectedAnnouncement.class_id}</Text>
            </View>
          )}

          <View style={styles.modalDetailRow}>
            <FontAwesomeIcon icon={faCalendar} size={16} color="#007AFF" style={styles.modalIcon} />
            <Text style={styles.modalDetailText}>Posted: {new Date(selectedAnnouncement?.created_at).toLocaleString()}</Text>
          </View>
                </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  welcomeContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: '#ddd',
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
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addTextButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addTextButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
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
    backgroundColor: '#007AFF', // Blue for general announcements
  },
  classType: {
    backgroundColor: '#28a745', // Green for class-specific announcements
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  messagePreview: {
    fontSize: 14,
    color: '#555',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 22,
    borderRadius: 10,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  modalMessageText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  modalSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 10,
    width: '100%',
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
    flexWrap: 'wrap', // Allow text to wrap
  },
  modalIcon: {
    marginRight: 10,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#555',
  },
  modalClass: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
});