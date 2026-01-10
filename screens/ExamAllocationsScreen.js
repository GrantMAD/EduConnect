import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { fetchExamPapers, fetchSeatAllocations, fetchVenue } from '../services/examService';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faTrash, faUser, faChair, faSearch, faTh, faList } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';

const DEFAULT_AVATAR = require('../assets/user.png');

export default function ExamAllocationsScreen({ route, navigation }) {
  const { sessionId, sessionName } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState([]);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [venue, setVenue] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'

  const loadData = async () => {
    try {
      setLoading(true);
      const papersData = await fetchExamPapers(sessionId);
      setPapers(papersData);
      
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

      <View style={styles.paperSelector}>
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
                </View>
            }
          />
      ) : (
          renderSeatingMap()
      )}
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