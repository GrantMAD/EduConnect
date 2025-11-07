import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import MarketScreenSkeleton from '../components/skeletons/MarketScreenSkeleton';
import { faPlus, faSearch, faStore, faBook, faLaptop, faPen, faCouch, faTshirt, faBox } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import MarketplaceItemCard from '../components/MarketplaceItemCard';
import SellerProfileModal from '../components/SellerProfileModal';

export default function MarketScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchItems();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchItems = async () => {
    let query = supabase
      .from('marketplace_items')
      .select('id, created_at, title, description, price, image_url, category, seller:seller_id ( full_name, email, number, avatar_url )')
      .order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else if (data && data.length > 0) {
      const groupedItems = data.reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});

      const sections = Object.keys(groupedItems).map(category => ({
        title: category,
        data: [groupedItems[category]],
      }));
      setItems(sections);
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems().then(() => setRefreshing(false));
  }, [searchQuery]);

    const handleSearch = (text) => {
      setSearchQuery(text);
      fetchItems();
    };
  
    const handleViewSeller = (seller) => {
      setSelectedSeller(seller);
      setModalVisible(true);
    };
  
    const categoryIcons = {
      Books: faBook,
      Electronics: faLaptop,
      Stationery: faPen,
      Furniture: faCouch,
      Clothing: faTshirt,
      Other: faBox,
    };
  
    const categoryDescriptions = {
      Books: 'Find your textbooks and reading materials here.',
      Electronics: 'From calculators to laptops, find your tech here.',
      Stationery: 'All the pens, paper, and supplies you need.',
      Furniture: 'Desks, chairs, and more for your study space.',
      Clothing: 'School uniforms and other apparel.',
      Other: 'Miscellaneous items for sale.',
    };
  
    if (loading) return <MarketScreenSkeleton />;
  
    return (
      <View style={styles.container}>
        <View style={styles.mainHeaderContainer}>
          <FontAwesomeIcon icon={faStore} size={24} color="#333" style={styles.mainHeaderIcon} />
          <Text style={styles.header}>Marketplace</Text>
        </View>
        <Text style={styles.description}>Browse items for sale from other students. Press on an item to view the seller's details and contact information.</Text>
        <View style={styles.searchContainer}>
          <FontAwesomeIcon icon={faSearch} size={16} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for items..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
  
        <SectionList
          sections={items}
          keyExtractor={(section) => section.title}
          renderItem={({ item }) => (
            <FlatList
              data={item}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => <MarketplaceItemCard item={item} onViewSeller={handleViewSeller} />}
              keyExtractor={(item) => item.id.toString()}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderContainer}>
              <FontAwesomeIcon icon={categoryIcons[title]} size={18} color="#333" style={styles.sectionHeaderIcon} />
              <View>
                <Text style={styles.sectionHeader}>{title}</Text>
                <Text style={styles.sectionDescription}>{categoryDescriptions[title]}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items found.</Text>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
  
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateMarketplaceItem')}>
          <FontAwesomeIcon icon={faPlus} size={24} color="#fff" />
        </TouchableOpacity>
  
        <SellerProfileModal
          visible={modalVisible}
          seller={selectedSeller}
          onClose={() => setModalVisible(false)}
        />
      </View>
    );}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16 },
  header: { fontSize: 24, fontWeight: '700', color: '#333' },
  mainHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  mainHeaderIcon: { marginRight: 10 },
  description: { fontSize: 14, color: '#777', marginBottom: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#888' },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionHeaderIcon: { marginRight: 10 },
  sectionHeader: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  sectionDescription: { fontSize: 12, color: '#777' },
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
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
