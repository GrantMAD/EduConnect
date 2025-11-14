import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBook, faPlus, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import CreateResourceModal from '../components/CreateResourceModal';
import ResourceDetailModal from '../components/ResourceDetailModal';
import { useSchool } from '../context/SchoolContext';
import RNFetchBlob from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';

export default function ResourcesScreen() {
  const { schoolId } = useSchool();
  const [resources, setResources] = useState({});
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Load role + resources when screen loads
  useEffect(() => {
    if (schoolId) {
      fetchUserRole();
      fetchResources();
    }
  }, [schoolId]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!error) setUserRole(data.role);
  };

  const fetchResources = async () => {
    if (!schoolId) return;
    const { data, error } = await supabase
      .from('resources')
      .select(`
        id,
        title,
        description,
        file_url,
        uploaded_by,
        created_at,
        category,
        users:uploaded_by (
          full_name,
          email
        )
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (!error) {
      const groupedResources = data.reduce((acc, resource) => {
        const category = resource.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(resource);
        return acc;
      }, {});
      setResources(groupedResources);
    }
    setLoading(false);
  };

  const handleOpenFile = async (url) => {
    if (!url) return;

    try {
      const localPath = `${RNFetchBlob.fs.dirs.CacheDir}/${url.split('/').pop()}`;
      await RNFetchBlob.config({ path: localPath }).fetch('GET', url);
      await FileViewer.open(localPath);
    } catch (err) {
      console.error('Cannot open file:', err);
      alert('Failed to open file. Make sure you have an app that can open this file type.');
    }
  };

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

      <ScrollView style={styles.scrollView}>
        {Object.keys(resources).length === 0 ? (
          <Text style={styles.noResourcesText}>No resources available yet.</Text>
        ) : (
          Object.keys(resources).map((category) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={styles.categoryHeader}>{category}</Text>
              {resources[category].map((item) => (
                <TouchableOpacity
                  key={item.id.toString()}
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
        onOpenFile={handleOpenFile}
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
  card: { flexDirection: 'row', backgroundColor: '#f8f8f8', padding: 12, borderRadius: 10, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '700' },
  description: { color: '#555', marginVertical: 4 },
  uploader: { color: '#777', fontSize: 12 },
  scrollView: { flex: 1 },
  categoryContainer: { marginBottom: 20 },
  categoryHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
  noResourcesText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: '#777' },
});
