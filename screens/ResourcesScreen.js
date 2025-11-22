import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBook, faPlus, faFileAlt, faThumbsUp, faThumbsDown } from '@fortawesome/free-solid-svg-icons';
import CreateResourceModal from '../components/CreateResourceModal';
import ResourceDetailModal from '../components/ResourceDetailModal';
import { useSchool } from '../context/SchoolContext';
import RNFetchBlob from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';
import { useGamification } from '../context/GamificationContext';

export default function ResourcesScreen() {
  const { schoolId } = useSchool();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUserRole();
    fetchResources();
  }, [schoolId]);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserRole(data.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchResources = async (silent = false) => {
    if (!schoolId) return;

    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          users (full_name, email)
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate vote counts for each resource
      const resourcesWithVotes = await Promise.all(
        data.map(async (resource) => {
          const { data: votes } = await supabase
            .from('resource_votes')
            .select('vote')
            .eq('resource_id', resource.id);

          const upvotes = votes?.filter(v => v.vote === 1).length || 0;
          const downvotes = votes?.filter(v => v.vote === -1).length || 0;

          return { ...resource, upvotes, downvotes };
        })
      );

      setResources(resourcesWithVotes);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Group resources by category
  const groupedResources = resources.reduce((acc, resource) => {
    const category = resource.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(resource);
    return acc;
  }, {});

  // Filter resources by search term
  const filteredResources = Object.keys(groupedResources).reduce((acc, category) => {
    const filtered = groupedResources[category].filter(resource =>
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {});

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 40 }} />;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <FontAwesomeIcon icon={faBook} size={24} color="#007AFF" style={styles.headerIcon} />
          <Text style={styles.header}>Resources</Text>
        </View>
        {(userRole === 'teacher' || userRole === 'admin') && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <FontAwesomeIcon icon={faPlus} size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.descriptionText}>Access and manage all your educational resources here.</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by title..."
        value={searchTerm}
        onChangeText={setSearchTerm}
      />

      <ScrollView style={styles.scrollView}>
        {Object.keys(filteredResources).length === 0 ? (
          <Text style={styles.noResourcesText}>No resources available yet.</Text>
        ) : (
          Object.keys(filteredResources).map((category) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={styles.categoryHeader}>{category}</Text>
              {filteredResources[category].map((item) => (
                <View key={item.id.toString()} style={styles.resourceItemContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedResource(item);
                      setDetailModalVisible(true);
                    }}
                  >
                    <View style={styles.card}>
                      <FontAwesomeIcon icon={faFileAlt} size={24} color="#007AFF" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.description} numberOfLines={2} ellipsizeMode="tail">
                          {item.description}
                        </Text>
                        <Text style={styles.uploader}>
                          Uploaded by: {item.users?.full_name ?? item.users?.email ?? "Unknown"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <View style={styles.voteSummaryContainer}>
                    <FontAwesomeIcon icon={faThumbsUp} size={16} color="#28A745" />
                    <Text style={styles.voteCount}>{item.upvotes}</Text>
                    <FontAwesomeIcon icon={faThumbsDown} size={16} color="#FF3B30" style={{ marginLeft: 12 }} />
                    <Text style={styles.voteCount}>{item.downvotes}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <CreateResourceModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          fetchResources();
        }}
      />

      <ResourceDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        resource={selectedResource}
        onVotesChanged={() => fetchResources(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { marginRight: 10 },
  descriptionText: { fontSize: 16, color: '#555', marginBottom: 20 },
  container: { padding: 16, flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: '700' },
  addButton: { flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  card: { flexDirection: 'row', backgroundColor: '#f8f8f8', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '700' },
  description: { color: '#555', marginVertical: 4 },
  uploader: { color: '#777', fontSize: 12 },
  scrollView: { flex: 1 },
  categoryContainer: { marginBottom: 20 },
  categoryHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
  noResourcesText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' },
  searchInput: {
    height: 40,
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  resourceItemContainer: {
    marginBottom: 20,
  },
  voteSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: -10,
    right: 15,
    backgroundColor: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    borderWidth: 1,
    borderColor: '#eee',
  },
  voteCount: { marginLeft: 4, marginRight: 8, fontSize: 14, color: '#555' },
});
