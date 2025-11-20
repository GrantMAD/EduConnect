// FULL UPDATED MARKET SCREEN WITH FIXED HORIZONTAL SCROLLING

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
  ScrollView,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import MarketScreenSkeleton from '../../components/skeletons/MarketScreenSkeleton';
import {
  faPlus,
  faSearch,
  faStore,
  faBook,
  faLaptop,
  faPen,
  faCouch,
  faTshirt,
  faBox,
  faThLarge,
  faList,
  faSortAmountDown,
  faSortAmountUp
} from '@fortawesome/free-solid-svg-icons';

import { supabase } from '../../lib/supabase';
import MarketplaceItemCard from '../../components/MarketplaceItemCard';
import SellerProfileModal from '../../components/SellerProfileModal';
import MarketplaceItemDetailModal from '../../components/MarketplaceItemDetailModal';
import { useTheme } from '../../context/ThemeContext';

export default function MarketScreen({ navigation }) {
  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [itemDetailModalVisible, setItemDetailModalVisible] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [viewMode, setViewMode] = useState('horizontal');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchItems();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [allItems, searchQuery, selectedCategory, sortBy, viewMode]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('id, created_at, title, description, price, image_url, category, seller:seller_id ( full_name, email, number, avatar_url )')
      .order('created_at', { ascending: false });

    if (!error) setAllItems(data || []);
    setLoading(false);
  };

  const applyFiltersAndSort = () => {
    let result = [...allItems];

    if (searchQuery) {
      result = result.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      result = result.filter(item => item.category === selectedCategory);
    }

    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    }

    if (viewMode === 'grid') {
      setFilteredItems(result);
    } else {
      const groupedItems = result.reduce((acc, item) => {
        const category = item.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {});

      const newSections = Object.keys(groupedItems).map(category => ({
        title: category,
        data: [groupedItems[category]],
      }));

      setSections(newSections);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems().then(() => setRefreshing(false));
  }, []);

  const toggleSort = () => {
    if (sortBy === 'newest') setSortBy('price_asc');
    else if (sortBy === 'price_asc') setSortBy('price_desc');
    else setSortBy('newest');
  };

  const getSortIcon = () => {
    if (sortBy === 'price_asc') return faSortAmountUp;
    if (sortBy === 'price_desc') return faSortAmountDown;
    return faSortAmountDown;
  };

  const getSortLabel = () => {
    if (sortBy === 'price_asc') return 'Price: Low';
    if (sortBy === 'price_desc') return 'Price: High';
    return 'Newest';
  };

  const categories = ['All', 'Books', 'Electronics', 'Stationery', 'Furniture', 'Clothing', 'Other'];
  const categoryIcons = { Books: faBook, Electronics: faLaptop, Stationery: faPen, Furniture: faCouch, Clothing: faTshirt, Other: faBox };
  const categoryDescriptions = {
    Books: 'Find your textbooks and reading materials here.',
    Electronics: 'Find tech items here.',
    Stationery: 'Pens, books & supplies.',
    Furniture: 'Desks, chairs and more.',
    Clothing: 'Uniforms & apparel.',
    Other: 'Misc. items.',
  };

  if (loading) return <MarketScreenSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* Header */}
      <View style={styles.mainHeaderContainer}>
        <FontAwesomeIcon icon={faStore} size={24} color={theme.colors.primary} style={styles.mainHeaderIcon} />
        <Text style={[styles.header, { color: theme.colors.text }]}>Marketplace</Text>
      </View>
      <Text style={[styles.subHeader, { color: theme.colors.placeholder }]}>
        Items are advertised here only. Transactions are handled directly between buyers and sellers.
      </Text>

      {/* Search */}
      <View style={styles.searchContainerWrapper}>
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.cardBackground }]}>
          <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.placeholder} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search for items..."
            placeholderTextColor={theme.colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* CATEGORY FILTER — FIXED HORIZONTAL SCROLL */}
      <View style={styles.filterContainer}>
        <FlatList
          data={categories}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.cardBorder },
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === item
                    ? { color: theme.colors.buttonPrimaryText }
                    : { color: theme.colors.text },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* CONTROLS */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleSort}>
          <FontAwesomeIcon icon={getSortIcon()} size={14} color={theme.colors.text} style={{ marginRight: 6 }} />
          <Text style={[styles.controlText, { color: theme.colors.text }]}>{getSortLabel()}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            style={[styles.iconButton, viewMode === 'horizontal' && { backgroundColor: theme.colors.cardBackground }]}
            onPress={() => setViewMode('horizontal')}
          >
            <FontAwesomeIcon icon={faList} size={16} color={viewMode === 'horizontal' ? theme.colors.primary : theme.colors.placeholder} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, viewMode === 'grid' && { backgroundColor: theme.colors.cardBackground }]}
            onPress={() => setViewMode('grid')}
          >
            <FontAwesomeIcon icon={faThLarge} size={16} color={viewMode === 'grid' ? theme.colors.primary : theme.colors.placeholder} />
          </TouchableOpacity>
        </View>
      </View>

      {/* GRID MODE */}
      {viewMode === 'grid' ? (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={{ flex: 0.5, paddingHorizontal: 8 }}>
              <MarketplaceItemCard
                item={item}
                onViewSeller={() => {
                  setSelectedItem(item);
                  setItemDetailModalVisible(true);
                }}
              />
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      ) : (
        /* SECTION LIST MODE — FULLY FIXED */
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderContainer}>
              <FontAwesomeIcon icon={categoryIcons[title]} size={18} color={theme.colors.primary} style={styles.sectionHeaderIcon} />
              <View>
                <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>{title}</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>{categoryDescriptions[title]}</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <FlatList
              data={item}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <View style={{ width: 200, marginRight: 16 }}>
                  <MarketplaceItemCard
                    item={item}
                    onViewSeller={() => {
                      setSelectedItem(item);
                      setItemDetailModalVisible(true);
                    }}
                  />
                </View>
              )}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateMarketplaceItem')}
      >
        <FontAwesomeIcon icon={faPlus} size={22} color={theme.colors.buttonPrimaryText} />
      </TouchableOpacity>

      <MarketplaceItemDetailModal
        visible={itemDetailModalVisible}
        item={selectedItem}
        onViewSeller={(seller) => {
          setSelectedSeller(seller);
          setModalVisible(true);
        }}
        onClose={() => setItemDetailModalVisible(false)}
      />

      <SellerProfileModal
        visible={modalVisible}
        seller={selectedSeller}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 24, fontWeight: '700' },

  mainHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 4, // Reduced bottom margin to bring subheader closer
  },

  subHeader: {
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  mainHeaderIcon: { marginRight: 16 },
  searchContainerWrapper: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },

  searchInput: { flex: 1, height: 40 },

  filterContainer: { marginBottom: 10 },
  categoryScroll: { paddingHorizontal: 16 },

  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },

  categoryChipText: { fontSize: 14, fontWeight: '600' },

  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 16
  },

  controlButton: { flexDirection: 'row', alignItems: 'center' },
  controlText: { fontSize: 14, fontWeight: '600' },

  iconButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 6
  },

  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 16
  },
  sectionHeaderIcon: { marginRight: 10 },
  sectionHeader: { fontSize: 20, fontWeight: 'bold' },
  sectionDescription: { fontSize: 12 },

  fab: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    right: 20,
    bottom: 20,
  },
});
