// FULL UPDATED MARKET SCREEN WITH FIXED HORIZONTAL SCROLLING AND ANALYTICS

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import MarketScreenSkeleton, { SkeletonPiece, MarketplaceItemCardSkeleton } from '../../components/skeletons/MarketScreenSkeleton';
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
import MarketplaceAnalytics from '../../components/market/MarketplaceAnalytics';
import { useTheme } from '../../context/ThemeContext';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import LinearGradient from 'react-native-linear-gradient';

const CategoryChip = React.memo(({ item, selected, onPress, theme }) => (
    <TouchableOpacity
        style={[
        styles.categoryChip,
        selected === item
            ? { backgroundColor: theme.colors.primary }
            : { backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.cardBorder },
        ]}
        onPress={() => onPress(item)}
    >
        <Text
        style={[
            styles.categoryChipText,
            selected === item
            ? { color: theme.colors.buttonPrimaryText }
            : { color: theme.colors.text },
        ]}
        >
        {item}
        </Text>
    </TouchableOpacity>
));

const MarketScreen = ({ navigation }) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [itemDetailModalVisible, setItemDetailModalVisible] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [userRole, setUserRole] = useState('');

  const [viewMode, setViewMode] = useState('horizontal');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const { theme } = useTheme();
  const { createChannel, channels, user } = useChat();
  const { showToast } = useToast();

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select('id, created_at, title, description, price, image_url, category, seller_id, seller:users!seller_id(id, full_name, email, avatar_url, role)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error) setAllItems(data || []);
    setLoading(false);
  }, []);

  const fetchUserRole = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
      setUserRole(data?.role || '');
    } catch (e) {}
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserRole();
      fetchItems();
    });
    return unsubscribe;
  }, [navigation, fetchUserRole, fetchItems]);

  const categories = useMemo(() => ['All', 'Books', 'Electronics', 'Stationery', 'Furniture', 'Clothing', 'Other'], []);
  const categoryIcons = useMemo(() => ({ Books: faBook, Electronics: faLaptop, Stationery: faPen, Furniture: faCouch, Clothing: faTshirt, Other: faBox }), []);
  const categoryDescriptions = useMemo(() => ({
    Books: 'Find your textbooks and reading materials here.',
    Electronics: 'Find tech items here.',
    Stationery: 'Pens, books & supplies.',
    Furniture: 'Desks, chairs and more.',
    Clothing: 'Uniforms & apparel.',
    Other: 'Misc. items.',
  }), []);

  const processedData = useMemo(() => {
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
      return { filteredItems: result, sections: [] };
    } else {
      const groupedItems = result.reduce((acc, item) => {
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

      return { filteredItems: [], sections };
    }
  }, [allItems, searchQuery, selectedCategory, sortBy, viewMode]);

  const { filteredItems, sections } = processedData;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchItems().then(() => setRefreshing(false));
  }, [fetchItems]);

  const toggleSort = useCallback(() => {
    setSortBy(prev => {
        if (prev === 'newest') return 'price_asc';
        if (prev === 'price_asc') return 'price_desc';
        return 'newest';
    });
  }, []);

  const sortInfo = useMemo(() => {
    if (sortBy === 'price_asc') return { icon: faSortAmountUp, label: 'Price: Low' };
    if (sortBy === 'price_desc') return { icon: faSortAmountDown, label: 'Price: High' };
    return { icon: faSortAmountDown, label: 'Newest' };
  }, [sortBy]);

  const handleMessageSeller = useCallback(async (seller) => {
    if (!user) {
      showToast('You must be logged in to message sellers', 'error');
      return;
    }

    if (seller.id === user.id) {
      showToast('You cannot message yourself', 'error');
      return;
    }

    try {
      const existingChannel = channels.find(channel =>
        channel.type === 'direct' &&
        channel.channel_members.some(member => member.user_id === seller.id)
      );

      if (existingChannel) {
        navigation.navigate('ChatRoom', { channelId: existingChannel.id, name: seller.full_name });
      } else {
        const newChannel = await createChannel(seller.full_name, 'direct', [seller.id]);
        navigation.navigate('ChatRoom', { channelId: newChannel.id, name: seller.full_name });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      showToast('Failed to start chat', 'error');
    }
  }, [user, channels, createChannel, navigation, showToast]);

  const handleItemPress = useCallback((item) => {
    setSelectedItem(item);
    setItemDetailModalVisible(true);
  }, []);

  const handleViewSeller = useCallback((seller) => {
    setSelectedSeller(seller);
    setModalVisible(true);
  }, []);

  const ListHeader = useCallback(() => (
    <View>
      <LinearGradient
        colors={['#9333ea', '#4f46e5']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
            <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>Student Marketplace</Text>
                <Text style={styles.heroDescription}>
                    Buy, sell, and trade school supplies within your community.
                </Text>
            </View>
            <TouchableOpacity
                style={styles.heroButton}
                onPress={() => navigation.navigate('CreateMarketplaceItem', { fromMarketScreen: true })}
            >
                <FontAwesomeIcon icon={faPlus} size={14} color="#9333ea" />
                <Text style={styles.heroButtonText}>Sell</Text>
            </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16 }}>
        {!loading && userRole === 'admin' && (
            <MarketplaceAnalytics items={allItems} />
        )}

        <View style={styles.searchContainerWrapper}>
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.placeholder} style={styles.searchIcon} />
            {loading ? (
                <SkeletonPiece style={{ flex: 1, height: 20, borderRadius: 4 }} />
            ) : (
                <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search for items..."
                placeholderTextColor={theme.colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                />
            )}
            </View>
        </View>

        <View style={styles.filterContainer}>
            {loading ? (
            <View style={{ flexDirection: 'row' }}>
                {[1, 2, 3, 4].map(i => (
                <SkeletonPiece key={i} style={{ width: 80, height: 35, borderRadius: 20, marginRight: 8 }} />
                ))}
            </View>
            ) : (
            <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <CategoryChip 
                        item={item} 
                        selected={selectedCategory} 
                        onPress={setSelectedCategory} 
                        theme={theme} 
                    />
                )}
            />
            )}
        </View>

        {!loading && (
            <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleSort}>
                <FontAwesomeIcon icon={sortInfo.icon} size={14} color={theme.colors.text} style={{ marginRight: 6 }} />
                <Text style={[styles.controlText, { color: theme.colors.text }]}>{sortInfo.label}</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                style={[styles.iconButton, viewMode === 'horizontal' && { backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.cardBorder }]}
                onPress={() => setViewMode('horizontal')}
                >
                <FontAwesomeIcon icon={faList} size={16} color={viewMode === 'horizontal' ? theme.colors.primary : theme.colors.placeholder} />
                </TouchableOpacity>

                <TouchableOpacity
                style={[styles.iconButton, viewMode === 'grid' && { backgroundColor: theme.colors.cardBackground, borderWidth: 1, borderColor: theme.colors.cardBorder }]}
                onPress={() => setViewMode('grid')}
                >
                <FontAwesomeIcon icon={faThLarge} size={16} color={viewMode === 'grid' ? theme.colors.primary : theme.colors.placeholder} />
                </TouchableOpacity>
            </View>
            </View>
        )}
      </View>
    </View>
  ), [loading, userRole, allItems, theme, searchQuery, selectedCategory, categories, toggleSort, sortInfo, viewMode, navigation]);

  const renderGridItem = useCallback(({ item }) => (
    <View style={{ flex: 0.5, paddingHorizontal: 8 }}>
      <MarketplaceItemCard
        item={item}
        onViewSeller={() => handleItemPress(item)}
      />
    </View>
  ), [handleItemPress]);

  const renderSectionHeader = useCallback(({ section: { title } }) => (
    <View style={styles.sectionHeaderContainer}>
      <FontAwesomeIcon icon={categoryIcons[title]} size={18} color={theme.colors.primary} style={styles.sectionHeaderIcon} />
      <View>
        <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>{categoryDescriptions[title]}</Text>
      </View>
    </View>
  ), [theme, categoryIcons, categoryDescriptions]);

  const renderSectionItem = useCallback(({ item }) => (
    <FlatList
      data={item}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
      keyExtractor={(item) => item.id.toString()}
      nestedScrollEnabled={true}
      removeClippedSubviews={false}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <View style={{ width: 200, marginRight: 16 }}>
          <MarketplaceItemCard
            item={item}
            onViewSeller={() => handleItemPress(item)}
          />
        </View>
      )}
    />
  ), [handleItemPress]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <View>
            <ListHeader />
            <FlatList
                data={[1, 2, 3, 4]}
                keyExtractor={(item) => item.toString()}
                numColumns={2}
                renderItem={() => (
                    <View style={{ flex: 0.5, paddingHorizontal: 8 }}>
                    <MarketplaceItemCardSkeleton />
                    </View>
                )}
                contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 80 }}
            />
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          ListHeaderComponent={ListHeader}
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          renderItem={renderGridItem}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          removeClippedSubviews={true}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
        />
      ) : (
        <SectionList
          ListHeaderComponent={ListHeader}
          sections={sections}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderSectionItem}
        />
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateMarketplaceItem', { fromMarketScreen: true })}
      >
        <FontAwesomeIcon icon={faPlus} size={22} color={theme.colors.buttonPrimaryText} />
      </TouchableOpacity>

      <MarketplaceItemDetailModal
        visible={itemDetailModalVisible}
        item={selectedItem}
        onViewSeller={handleViewSeller}
        onMessageSeller={handleMessageSeller}
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

export default React.memo(MarketScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 24, fontWeight: '700' },

  heroContainer: {
    padding: 20,
    marginBottom: 16,
    elevation: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  heroContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  heroTextContainer: {
      flex: 1,
      paddingRight: 10,
  },
  heroTitle: {
      color: '#fff',
      fontSize: 24,
      fontWeight: '800',
      marginBottom: 6,
  },
  heroDescription: {
      color: '#e0e7ff',
      fontSize: 14,
  },
  heroButton: {
      backgroundColor: '#fff',
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
  },
  heroButtonText: {
      color: '#9333ea',
      fontWeight: 'bold',
      marginLeft: 6,
      fontSize: 14,
  },

  mainHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  subHeader: {
    fontSize: 14,
    marginBottom: 16,
  },

  mainHeaderIcon: { marginRight: 16 },
  searchContainerWrapper: {
    marginBottom: 12,
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
  categoryScroll: { },

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
