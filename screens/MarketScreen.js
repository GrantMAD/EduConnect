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
import { useTheme } from '../context/ThemeContext'; // Import useTheme

export default function MarketScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const { theme } = useTheme(); // Use the theme hook

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
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.mainHeaderContainer}>
          <FontAwesomeIcon icon={faStore} size={24} color={theme.colors.text} style={styles.mainHeaderIcon} />
          <Text style={[styles.header, { color: theme.colors.text }]}>Marketplace</Text>
        </View>
        <Text style={[styles.description, { color: theme.colors.text }]}>Browse items for sale from other students. Press on an item to view the seller's details and contact information.</Text>
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]}>
          <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.placeholder} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search for items..."
            placeholderTextColor={theme.colors.placeholder}
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
              <FontAwesomeIcon icon={categoryIcons[title]} size={18} color={theme.colors.text} style={styles.sectionHeaderIcon} />
              <View>
                <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>{title}</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.text }]}>{categoryDescriptions[title]}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No items found.</Text>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
  
        <TouchableOpacity style={[styles.fab, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.text }]} onPress={() => navigation.navigate('CreateMarketplaceItem')}>
          <FontAwesomeIcon icon={faPlus} size={24} color={theme.colors.buttonPrimaryText} />
        </TouchableOpacity>
  
        <SellerProfileModal
          visible={modalVisible}
          seller={selectedSeller}
          onClose={() => setModalVisible(false)}
        />
      </View>
    );}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 24, fontWeight: '700' },
  mainHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  mainHeaderIcon: { marginRight: 10 },
  description: { fontSize: 14, marginBottom: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    height: 40,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16 },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionHeaderIcon: { marginRight: 10 },
  sectionHeader: { fontSize: 20, fontWeight: 'bold' },
  sectionDescription: { fontSize: 12 },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    elevation: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
