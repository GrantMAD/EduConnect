import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ManagementListSkeleton, { SkeletonPiece } from '../../components/skeletons/ManagementListSkeleton';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import { faPlus, faStore, faArrowLeft, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import ManageMarketItemListItem from '../../components/ManageMarketItemListItem';
import MarketplaceItemDetailModal from '../../components/MarketplaceItemDetailModal';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../../services/authService';
import { fetchSellerItems, deleteMarketplaceItem } from '../../services/marketplaceService';

const { width } = Dimensions.get('window');

const ManageMarketDataScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState(null);

  const { showToast } = useToast();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const fetchUserItems = useCallback(async () => {
    try {
      const authUser = await getCurrentUser();
      if (!authUser) return;

      const data = await fetchSellerItems(authUser.id);
      setItems(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserItems();
    });
    return unsubscribe;
  }, [navigation, fetchUserItems]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserItems().then(() => setRefreshing(false));
  }, [fetchUserItems]);

  const handleDelete = useCallback((itemId) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMarketplaceItem(itemId);
              fetchUserItems();
              setModalVisible(false); 
              showToast('Item deleted successfully!', 'success');
            } catch (error) {
              showToast('Failed to delete item.', 'error');
            }
          },
        },
      ]
    );
  }, [fetchUserItems, showToast]);

  const handleEdit = useCallback((item) => {
    setModalVisible(false); 
    navigation.navigate('CreateMarketplaceItem', { item });
  }, [navigation]);

  const handleItemPress = useCallback((selectedItem) => {
    setSelectedItemForModal(selectedItem);
    setModalVisible(true);
  }, []);

  const ListHeader = useMemo(() => (
    <View>
        <LinearGradient
            colors={['#9333ea', '#4f46e5']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroContainer}
        >
            <View style={styles.heroContent}>
                <View style={styles.heroTextContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHero}>
                            <FontAwesomeIcon icon={faChevronLeft} size={18} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.heroTitle}>Manage Listings</Text>
                    </View>
                    <Text style={styles.heroDescription}>
                        View, edit, or remove your items from the student marketplace.
                    </Text>
                </View>
                <View style={styles.iconBoxHero}>
                    <FontAwesomeIcon icon={faStore} size={24} color="rgba(255,255,255,0.7)" />
                </View>
            </View>
        </LinearGradient>
    </View>
  ), [navigation]);

  const renderItem = useCallback(({ item }) => loading ? (
    <View style={{ paddingHorizontal: 20 }}><CardSkeleton /></View>
  ) : (
    <View style={{ paddingHorizontal: 20 }}>
      <ManageMarketItemListItem
          item={item}
          onPress={handleItemPress}
      />
    </View>
  ), [loading, handleItemPress]);

  const EmptyComponent = useCallback(() => !loading && (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBox, { backgroundColor: theme.colors.cardBackground }]}>
          <FontAwesomeIcon icon={faStore} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
      </View>
      <Text style={[styles.emptyText, { color: theme.colors.text }]}>You haven't listed any items yet.</Text>
      <TouchableOpacity 
          style={[styles.createItemButton, { backgroundColor: theme.colors.primary }]} 
          onPress={() => navigation.navigate('CreateMarketplaceItem')}
          activeOpacity={0.8}
      >
        <FontAwesomeIcon icon={faPlus} size={14} color="#fff" />
        <Text style={styles.createItemButtonText}>List your first item!</Text>
      </TouchableOpacity>
    </View>
  ), [loading, theme.colors, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        ListHeaderComponent={ListHeader}
        data={loading ? [1, 2, 3] : items}
        keyExtractor={(item, index) => loading ? index.toString() : item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={EmptyComponent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom, flexGrow: 1 }}
      />
      
      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: 20 + insets.bottom }]} 
        onPress={() => navigation.navigate('CreateMarketplaceItem')}
        activeOpacity={0.8}
      >
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

export default React.memo(ManageMarketDataScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: {
    padding: 24,
    paddingTop: 40,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 20,
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
      fontSize: 28,
      fontWeight: '900',
      marginBottom: 8,
      letterSpacing: -1,
  },
  heroDescription: {
      color: '#f5f3ff',
      fontSize: 14,
      fontWeight: '500',
  },
  backButtonHero: { marginRight: 12 },
  iconBoxHero: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  createItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginTop: 24,
  },
  createItemButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
