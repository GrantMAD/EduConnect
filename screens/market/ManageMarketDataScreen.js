import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ManagementListSkeleton from '../../components/skeletons/ManagementListSkeleton';
import { faPlus, faStore } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../lib/supabase';
import ManageMarketItemListItem from '../../components/ManageMarketItemListItem';
import MarketplaceItemDetailModal from '../../components/MarketplaceItemDetailModal';
import { useToast } from '../../context/ToastContext';

export default function ManageMarketDataScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserItems();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchUserItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('marketplace_items')
      .select('id, created_at, title, description, price, image_url, category')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) console.error(error);
    else setItems(data || []);
    setLoading(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserItems().then(() => setRefreshing(false));
  }, []);

  const handleDelete = (itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('marketplace_items').delete().eq('id', itemId);
            if (error) {
              showToast('Failed to delete item.', 'error');
            } else {
              fetchUserItems();
              setModalVisible(false); // Close modal after deletion
              showToast('Item deleted successfully!', 'success');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (item) => {
    setModalVisible(false); // Close modal before navigating
    navigation.navigate('CreateMarketplaceItem', { item });
  };

  if (loading) return <ManagementListSkeleton />;

  return (
    <View style={styles.container}>
      <View style={styles.mainHeaderContainer}>
        <FontAwesomeIcon icon={faStore} size={24} color="#333" style={styles.mainHeaderIcon} />
        <Text style={styles.header}>Manage Your Items</Text>
      </View>
      <Text style={styles.description}>Here you can edit or delete your marketplace items.</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ManageMarketItemListItem
            item={item}
            onPress={(selectedItem) => {
              setSelectedItemForModal(selectedItem);
              setModalVisible(true);
            }}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't listed any items yet.</Text>
            <TouchableOpacity style={styles.createItemButton} onPress={() => navigation.navigate('CreateMarketplaceItem')}>
              <FontAwesomeIcon icon={faPlus} size={16} color="#fff" />
              <Text style={styles.createItemButtonText}>List your first item!</Text>
            </TouchableOpacity>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateMarketplaceItem')}>
        <FontAwesomeIcon icon={faPlus} size={24} color="#fff" />
      </TouchableOpacity>

      <MarketplaceItemDetailModal
        visible={modalVisible}
        item={selectedItemForModal}
        onClose={() => setModalVisible(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16 },
  header: { fontSize: 24, fontWeight: '700', color: '#333' },
  mainHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  mainHeaderIcon: { marginRight: 10 },
  description: { fontSize: 14, color: '#777', marginBottom: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#888' },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#007AFF',
    borderRadius: 28,
    elevation: 8,
  },
  createItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  createItemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});