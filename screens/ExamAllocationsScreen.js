import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchExamPapers, fetchSeatAllocations, fetchVenue, fetchExamVenues, autoAllocatePaper, clearPaperAllocations, fetchExamSession } from '../services/examService';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faTrash, faUser, faChair, faSearch, faTh, faList, faMagic, faCheckCircle, faPlus } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import Button from '../components/Button';

const DEFAULT_AVATAR = require('../assets/user.png');

export default function ExamAllocationsScreen({ route, navigation }) {
  const { sessionId, sessionName } = route.params;
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { theme } = useTheme();
  
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [venue, setVenue] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  // Auto Allocate State
  const [session, setSession] = useState(null);
  const [venues, setVenues] = useState([]);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedVenueForAuto, setSelectedVenueForAuto] = useState(null);
  const [allocating, setAllocating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [papersData, venuesData, sessionData] = await Promise.all([
          fetchExamPapers(sessionId),
          fetchExamVenues(profile.school_id),
          fetchExamSession(sessionId)
      ]);
      setPapers(papersData);
      setVenues(venuesData);
      setSession(sessionData);
      
      if (papersData.length > 0 && !selectedPaperId) {
          setSelectedPaperId(papersData[0].id);
          await loadAllocations(papersData[0].id);
      } else if (selectedPaperId) {
          await loadAllocations(selectedPaperId);
      } else {
          setLoading(false);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const loadAllocations = async (paperId) => {
      try {
          const data = await fetchSeatAllocations(paperId);
          setAllocations(data);
          
          if (data.length > 0 && data[0].venue_id) {
              const venueData = await fetchVenue(data[0].venue_id);
              setVenue(venueData);
          } else {
              setVenue(null);
          }
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
      if (selectedPaperId) {
          setLoading(true);
          loadAllocations(selectedPaperId);
      }
  }, [selectedPaperId]);

  const handleDeleteAllocation = async (id) => {
      try {
          const { error } = await supabase.from('exam_seat_allocations').delete().eq('id', id);
          if (error) throw error;
          setAllocations(prev => prev.filter(a => a.id !== id));
      } catch (error) {
          Alert.alert("Error", "Failed to remove seat.");
      }
  };

  const handleAutoAllocate = async () => {
    if (!selectedVenueForAuto) {
        Alert.alert("Select Venue", "Please select a venue for allocation.");
        return;
    }

    setAllocating(true);
    try {
        const count = await autoAllocatePaper(selectedPaperId, selectedVenueForAuto, profile.school_id, session?.target_grade);
        Alert.alert("Success", `Allocated ${count} seats for this paper.`);
        setShowAllocateModal(false);
        loadAllocations(selectedPaperId);
    } catch (error) {
        Alert.alert("Allocation Failed", error.message);
    } finally {
        setAllocating(false);
    }
  };

  const handleClearAllocations = async () => {
      Alert.alert(
          "Clear Paper Allocations",
          "Are you sure? This will remove all assigned seats for this specific paper.",
          [
              { text: "Cancel", style: "cancel" },
              {
                  text: "Clear All",
                  style: "destructive",
                  onPress: async () => {
                      setLoading(true);
                      try {
                          await clearPaperAllocations(selectedPaperId);
                          loadAllocations(selectedPaperId);
                          Alert.alert("Success", "All allocations for this paper cleared.");
                      } catch (error) {
                          Alert.alert("Error", error.message);
                          setLoading(false);
                      }
                  }
              }
          ]
      );
  };

  const renderAllocationItem = ({ item }) => (
    <View style={[styles.itemCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.itemInfo}>
            <View style={styles.studentRow}>
                <Image 
                    source={item.student?.avatar_url ? { uri: item.student.avatar_url } : DEFAULT_AVATAR} 
                    style={styles.avatarList} 
                />
                <Text style={[styles.studentName, { color: theme.text }]}>{item.student?.full_name || 'Unknown Student'}</Text>
            </View>
            <Text style={[styles.studentId, { color: theme.textSecondary }]}>{item.student?.number || item.student?.email}</Text>
        </View>
        <View style={styles.seatBadge}>
            <FontAwesomeIcon icon={faChair} size={12} color="#0d9488" />
            <Text style={styles.seatText}>{item.seat_label}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteAllocation(item.id)} style={styles.deleteButton}>
            <FontAwesomeIcon icon={faTrash} size={14} color={theme.error || '#ef4444'} />
        </TouchableOpacity>
    </View>
  );

  const renderSeatingMap = () => {
      if (!venue) return <Text style={{textAlign: 'center', marginTop: 20, color: theme.textSecondary}}>No venue information available.</Text>;

      const grid = [];
      const cellSize = 50;

      const allocationMap = {};
      allocations.forEach(a => {
          allocationMap[`${a.seat_row}-${a.seat_col}`] = a;
      });

      for (let r = 1; r <= venue.rows; r++) {
          const rowCells = [];
          for (let c = 1; c <= venue.columns; c++) {
              const allocation = allocationMap[`${r}-${c}`];
              const seatLabel = `${String.fromCharCode(64 + r)}-${c}`;
              
              rowCells.push(
                  <View key={`${r}-${c}`} style={[
                      styles.gridCell, 
                      { width: cellSize, height: cellSize, backgroundColor: theme.cardBackground, borderColor: theme.border, overflow: 'hidden' }
                  ]}>
                      {allocation ? (
                          <Image 
                            source={allocation.student?.avatar_url ? { uri: allocation.student.avatar_url } : DEFAULT_AVATAR} 
                            style={{ width: '100%', height: '100%' }} 
                            resizeMode="cover"
                          />
                      ) : (
                          <Text style={[styles.gridSeatLabel, { color: theme.textSecondary }]}>{seatLabel}</Text>
                      )}
                  </View>
              );
          }
          grid.push(<View key={r} style={styles.gridRow}>{rowCells}</View>);
      }

      return (
          <ScrollView horizontal contentContainerStyle={{ padding: 20 }}>
              <ScrollView>
                  <View style={styles.gridContainer}>
                      <View style={styles.screenIndicator}>
                          <Text style={styles.screenText}>FRONT OF HALL</Text>
                      </View>
                      {grid}
                  </View>
              </ScrollView>
          </ScrollView>
      );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
            colors={['#0f766e', '#14b8a6']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesomeIcon icon={faArrowLeft} size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.heroTitle}>Seat Allocations</Text>
                    <Text style={styles.heroSubtitle}>{sessionName}</Text>
                    <Text style={styles.heroDescription}>View and manage seating arrangements for this session.</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} style={styles.toggleButton}>
                <FontAwesomeIcon icon={viewMode === 'list' ? faTh : faList} size={18} color="white" />
            </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.topActionsRow}>
          <View style={styles.paperSelectorContainer}>
              <FlatList
                horizontal
                data={papers}
                showsHorizontalScrollIndicator={false}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={[
                            styles.paperTab, 
                            selectedPaperId === item.id ? { backgroundColor: '#0d9488' } : { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.border }
                        ]}
                        onPress={() => setSelectedPaperId(item.id)}
                    >
                        <Text style={[
                            styles.paperTabText, 
                            selectedPaperId === item.id ? { color: 'white' } : { color: theme.text }
                        ]}>{item.paper_code}</Text>
                    </TouchableOpacity>
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
              />
          </View>
          
          <View style={styles.actionButtonsContainer}>
              <TouchableOpacity 
                style={[styles.miniActionButton, { backgroundColor: '#0d948815' }]} 
                onPress={() => setShowAllocateModal(true)}
              >
                  <FontAwesomeIcon icon={faMagic} size={14} color="#0d9488" />
                  <Text style={[styles.miniActionText, { color: '#0d9488' }]}>Auto</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.miniActionButton, { backgroundColor: '#ef444415' }]} 
                onPress={handleClearAllocations}
              >
                  <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                  <Text style={[styles.miniActionText, { color: '#ef4444' }]}>Clear</Text>
              </TouchableOpacity>
          </View>
      </View>

      {loading ? (
          <View style={styles.centerContainer}><ActivityIndicator size="large" color="#0d9488" /></View>
      ) : viewMode === 'list' ? (
          <FlatList
            data={allocations}
            renderItem={renderAllocationItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No allocations for this paper.</Text>
                    <TouchableOpacity 
                        style={[styles.emptyButton, { backgroundColor: '#0d9488' }]}
                        onPress={() => setShowAllocateModal(true)}
                    >
                        <Text style={styles.emptyButtonText}>Auto Allocate Now</Text>
                    </TouchableOpacity>
                </View>
            }
          />
      ) : (
          renderSeatingMap()
      )}

      {/* Allocation Modal */}
      <Modal visible={showAllocateModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.surface || '#ffffff' }]}>
                  <View style={styles.modalHeader}>
                      <Text style={[styles.modalTitle, { color: theme.text }]}>Auto Allocate Paper</Text>
                      <TouchableOpacity onPress={() => setShowAllocateModal(false)}>
                          <FontAwesomeIcon icon={faPlus} size={20} color={theme.textSecondary} style={{ transform: [{ rotate: '45deg' }] }} />
                      </TouchableOpacity>
                  </View>
                  <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
                      Select a venue to automatically assign seats for this paper.
                      {session?.target_grade ? ` (Filtering for ${session.target_grade})` : ''}
                  </Text>

                  <ScrollView style={{ maxHeight: 200, marginVertical: 16 }}>
                      {venues.map(v => (
                          <TouchableOpacity
                              key={v.id}
                              style={[
                                  styles.venueItem,
                                  { backgroundColor: theme.background, borderColor: selectedVenueForAuto === v.id ? '#0d9488' : theme.border }
                              ]}
                              onPress={() => setSelectedVenueForAuto(v.id)}
                          >
                              <View style={{ flex: 1 }}>
                                  <Text style={[styles.venueName, { color: theme.text }]}>{v.name}</Text>
                                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Capacity: {v.capacity}</Text>
                              </View>
                              {selectedVenueForAuto === v.id && (
                                  <FontAwesomeIcon icon={faCheckCircle} size={16} color="#0d9488" />
                              )}
                          </TouchableOpacity>
                      ))}
                  </ScrollView>

                  <Button title="Start Allocation" onPress={handleAutoAllocate} loading={allocating} />
              </View>
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    padding: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 0,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  heroSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      marginTop: 2,
  },
  heroDescription: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      marginTop: 4,
  },
  backButton: {
      padding: 4,
  },
  toggleButton: {
      padding: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 8,
  },
  topActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: 16,
  },
  paperSelectorContainer: {
      flex: 1,
  },
  actionButtonsContainer: {
      flexDirection: 'row',
      gap: 8,
  },
  miniActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
  },
  miniActionText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
  },
  paperSelector: {
      marginBottom: 8,
  },
  paperTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
  },
  paperTabText: {
      fontWeight: '700',
      fontSize: 12,
  },
  listContent: {
      padding: 16,
  },
  itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 8,
  },
  itemInfo: {
      flex: 1,
  },
  studentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      gap: 12,
  },
  avatarList: {
      width: 28,
      height: 28,
      borderRadius: 14,
  },
  studentName: {
      fontSize: 14,
      fontWeight: '700',
  },
  studentId: {
      fontSize: 12,
      marginLeft: 40,
  },
  seatBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0fdfa',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginRight: 12,
      gap: 6,
  },
  seatText: {
      color: '#0f766e',
      fontWeight: '900',
      fontSize: 14,
  },
  deleteButton: {
      padding: 8,
  },
  centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 40,
  },
  emptyText: {
      fontSize: 14,
      marginBottom: 16,
  },
  emptyButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
  },
  emptyButtonText: {
      color: 'white',
      fontWeight: '700',
      fontSize: 14,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
  },
  modalContent: {
      borderRadius: 24,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: '900',
  },
  modalDesc: {
      fontSize: 14,
      marginBottom: 16,
      lineHeight: 20,
  },
  venueItem: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  venueName: {
      fontWeight: '700',
      fontSize: 15,
      marginBottom: 2,
  },
  gridContainer: {
      alignItems: 'center',
  },
  gridRow: {
      flexDirection: 'row',
      marginBottom: 8,
  },
  gridCell: {
      marginRight: 8,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
  },
  gridSeatLabel: {
      fontSize: 10,
      fontWeight: 'bold',
  },
  screenIndicator: {
      width: '100%',
      backgroundColor: '#e5e7eb',
      padding: 4,
      marginBottom: 20,
      borderRadius: 4,
      alignItems: 'center',
  },
  screenText: {
      fontSize: 10,
      fontWeight: 'bold',
      color: '#9ca3af',
      letterSpacing: 2,
  },
});