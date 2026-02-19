import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCoins, faLock, faCheck, faTimes, faArrowLeft, faStore, faIdCard, faUserCircle, faPalette, faAward, faComments, faChevronRight, faInfoCircle, faArchive } from '@fortawesome/free-solid-svg-icons';
import { BORDER_STYLES, BANNER_STYLES, NAME_COLOR_STYLES, TITLE_STYLES, BUBBLE_STYLES, STICKER_PACKS } from '../../constants/GamificationStyles';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { SkeletonPiece } from '../../components/skeletons/DashboardScreenSkeleton';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAvatarUrl } from '../../lib/utils';

// Import services
import { fetchShopItems, fetchUserInventory } from '../../services/gamificationService';
import { getCurrentUser } from '../../services/authService';
import { getUserProfile } from '../../services/userService';

const { width } = Dimensions.get('window');

const ShopItemSkeleton = React.memo(() => {
    const { theme } = useTheme();
    return (
        <View style={[styles.itemCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <SkeletonPiece style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }} />
            <View style={styles.itemInfo}>
                <SkeletonPiece style={{ width: 80, height: 16, borderRadius: 4, marginBottom: 8 }} />
                <SkeletonPiece style={{ width: 50, height: 20, borderRadius: 12 }} />
            </View>
        </View>
    );
});

const ShopScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { 
        coins, purchaseItem, equipItem, 
        equippedBorder, equippedBanner, equippedNameColor, equippedTitle, equippedBubbleStyle, 
        ownedStickerPacks, current_level 
    } = useGamification();
    
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [purchasing, setPurchasing] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [userId, setUserId] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [fullName, setFullName] = useState('Student');
    const [showScrollHint, setShowScrollHint] = useState(true);

    const handleTabScroll = (event) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isCloseToBottom = layoutMeasurement.width + contentOffset.x >= contentSize.width - 20;
        if (isCloseToBottom && showScrollHint) {
            setShowScrollHint(false);
        }
    };

      const fetchShopData = useCallback(async () => {
        setLoading(true);
        try {
          const itemsData = await fetchShopItems();
    
          const authUser = await getCurrentUser();
          if (authUser) {
            const invData = await fetchUserInventory(authUser.id);
            if (invData) setInventory(invData.map(i => i.item_id));
    
            const userData = await getUserProfile(authUser.id);
    
            if (userData) {
              setAvatarUrl(userData.avatar_url);
              setUserEmail(userData.email);
              setUserId(userData.id);
              setFullName(userData.full_name || 'Student');
            }
          }
    
          setItems(itemsData || []);
        } catch (error) {
          console.error('Error fetching shop data:', error);
        } finally {
          setLoading(false);
        }
      }, []);
        useEffect(() => {
        fetchShopData();
    }, [fetchShopData]);

    const handlePurchase = useCallback(async () => {
        if (!selectedItem) return;
        setPurchasing(true);
        const success = await purchaseItem(selectedItem);
        setPurchasing(false);
        if (success) {
            setInventory(prev => [...prev, selectedItem.id]);
        }
    }, [selectedItem, purchaseItem]);

    const handleEquip = useCallback(async () => {
        if (!selectedItem) return;
        const success = await equipItem(selectedItem);
        if (success) setSelectedItem(null);
    }, [selectedItem, equipItem]);

    const getActionDetails = useCallback((item) => {
        if (!item) return { label: '', action: () => {}, disabled: true };
        
        const isOwned = inventory.includes(item.id);
        const isLocked = item.min_level > current_level;
        const cat = item.category;
        
        if (cat === 'sticker_pack') {
            const isPurchased = ownedStickerPacks?.some(p => p.id === item.id);
            if (isPurchased) return { label: 'Unlocked', action: () => {}, disabled: true };
            if (isLocked) return { label: `Lvl ${item.min_level}`, action: () => {}, disabled: true };
            if (coins < item.cost) return { label: 'Not Enough', action: () => {}, disabled: true };
            return { label: `Buy for ${item.cost}`, action: handlePurchase, disabled: false };
        }

        let currentEquipped = null;
        if (cat === 'banner') currentEquipped = equippedBanner;
        else if (cat === 'name_color') currentEquipped = equippedNameColor;
        else if (cat === 'title') currentEquipped = equippedTitle;
        else if (cat === 'bubble_style') currentEquipped = equippedBubbleStyle;
        else currentEquipped = equippedBorder;

        const isEquipped = currentEquipped?.id === item.id;
        const canAfford = coins >= item.cost;

        if (isEquipped) return { label: 'Equipped', action: () => {}, disabled: true };
        if (isOwned) return { label: 'Equip', action: () => handleEquip(), disabled: false };
        if (isLocked) return { label: `Lvl ${item.min_level}`, action: () => {}, disabled: true };
        if (!canAfford) return { label: 'Not Enough Coins', action: () => {}, disabled: true };
        
        return { label: `Buy for ${item.cost}`, action: handlePurchase, disabled: false };
    }, [inventory, current_level, ownedStickerPacks, coins, equippedBanner, equippedNameColor, equippedTitle, equippedBubbleStyle, equippedBorder, handlePurchase, handleEquip]);

    const ItemPreview = React.memo(({ item, size = 80 }) => {
        const cat = item.category;

        if (cat === 'banner') {
            const bannerStyle = BANNER_STYLES[item.image_url] || { background: ['#ccc', '#eee'] };
            return (
                <LinearGradient 
                    colors={bannerStyle.background} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 0}} 
                    style={[styles.bannerPreview, { width: size * 1.5, height: size * 0.8 }]}
                >
                    <Text style={styles.previewLabel}>BANNER</Text>
                </LinearGradient>
            );
        }

        if (cat === 'name_color') {
            const colorStyle = NAME_COLOR_STYLES[item.image_url] || { style: { color: '#666' } };
            return (
                <View style={[styles.previewBox, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.namePreviewText, colorStyle.style]}>{fullName.split(' ')[0]}</Text>
                </View>
            );
        }

        if (cat === 'title') {
            const titleStyle = TITLE_STYLES[item.image_url] || { label: 'Title', colors: { bg: '#eee', text: '#666' } };
            return (
                <View style={[styles.previewBox, { backgroundColor: theme.colors.surface }]}>
                    <View style={[styles.titleTag, { backgroundColor: titleStyle.colors.bg }]}>
                        <Text style={[styles.titleTagText, { color: titleStyle.colors.text }]}>{titleStyle.label}</Text>
                    </View>
                </View>
            );
        }

        if (cat === 'bubble_style') {
            const bubbleStyle = BUBBLE_STYLES[item.image_url] || { backgroundColor: '#eee' };
            const bubbleContent = (
                <View style={[styles.bubblePreview, { 
                    backgroundColor: bubbleStyle.backgroundColor,
                    borderColor: bubbleStyle.borderColor,
                    borderWidth: bubbleStyle.borderWidth || 0,
                    borderRadius: bubbleStyle.borderRadius || 12,
                }]}>
                    <Text style={{ color: bubbleStyle.textColor || '#000', fontSize: 10, fontWeight: 'bold' }}>Hello!</Text>
                </View>
            );

            if (bubbleStyle.gradient) {
                return (
                    <LinearGradient 
                        colors={bubbleStyle.gradient} 
                        start={{x: 0, y: 0}} 
                        end={{x: 1, y: 0}} 
                        style={styles.bubblePreview}
                    >
                        <Text style={{ color: bubbleStyle.textColor || '#fff', fontSize: 10, fontWeight: 'bold' }}>Hello!</Text>
                    </LinearGradient>
                );
            }
            return bubbleContent;
        }

        if (cat === 'sticker_pack') {
            const pack = STICKER_PACKS[item.image_url] || { stickers: ['❓'] };
            return (
                <View style={[styles.previewBox, { backgroundColor: theme.colors.surface }]}>
                    <Text style={{ fontSize: 32 }}>{pack.stickers[0]}</Text>
                </View>
            );
        }

        const borderStyle = BORDER_STYLES[item.image_url] || {};
        return (
            <AnimatedAvatarBorder
                avatarSource={getAvatarUrl(avatarUrl, userEmail, userId)}
                size={size}
                borderStyle={borderStyle}
                isRainbow={borderStyle.rainbow}
                isAnimated={borderStyle.animated}
            />
        );
    });

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (activeTab === 'owned') return inventory.includes(item.id);
            if (activeTab === 'all') return true;
            const cat = item.category;
            if (activeTab === 'border') return cat === 'avatar_border' || cat === 'border' || !cat;
            return cat === activeTab;
        });
    }, [items, activeTab, inventory]);

    const tabs = useMemo(() => [
        { id: 'all', label: 'All', icon: faStore },
        { id: 'owned', label: 'Owned', icon: faArchive },
        { id: 'border', label: 'Borders', icon: faUserCircle },
        { id: 'banner', label: 'Banners', icon: faIdCard },
        { id: 'name_color', label: 'Colors', icon: faPalette },
        { id: 'title', label: 'Titles', icon: faAward },
        { id: 'bubble_style', label: 'Bubbles', icon: faComments },
        { id: 'sticker_pack', label: 'Stickers', icon: faPalette },
    ], []);

    const renderItem = useCallback(({ item }) => {
        const details = getActionDetails(item);
        const isEquipped = details.label === 'Equipped' || details.label === 'Unlocked';
        const isLocked = item.min_level > current_level;

        return (
            <TouchableOpacity
                style={[styles.itemCard, {
                    backgroundColor: theme.colors.card,
                    borderColor: isEquipped ? theme.colors.primary : theme.colors.cardBorder,
                    borderWidth: isEquipped ? 2 : 1,
                }]}
                onPress={() => setSelectedItem(item)}
                activeOpacity={0.7}
            >
                <View style={styles.previewContainer}>
                    <ItemPreview item={item} size={70} />
                    {isLocked && (
                        <View style={styles.lockedOverlay}>
                            <FontAwesomeIcon icon={faLock} size={24} color="rgba(255,255,255,0.9)" />
                            <View style={styles.levelBadge}>
                                <Text style={styles.levelBadgeText}>Lvl {item.min_level}</Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
                    
                    {isEquipped ? (
                        <View style={[styles.badge, { backgroundColor: theme.colors.primary, borderColor: 'transparent' }]}>
                            <FontAwesomeIcon icon={faCheck} size={10} color="#fff" style={{ marginRight: 4 }} />
                            <Text style={[styles.badgeText, { color: '#fff' }]}>Equipped</Text>
                        </View>
                    ) : isLocked ? (
                        <View style={[styles.badge, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
                            <Text style={[styles.badgeText, { color: '#9CA3AF' }]}>Locked</Text>
                        </View>
                    ) : details.label === 'Equip' ? (
                        <View style={[styles.badge, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
                            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>Owned</Text>
                        </View>
                    ) : (
                        <View style={[styles.badge, { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' }]}>
                            <FontAwesomeIcon icon={faCoins} size={10} color="#F59E0B" style={{ marginRight: 4 }} />
                            <Text style={[styles.badgeText, { color: '#92400E' }]}>{item.cost}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    }, [theme, current_level, getActionDetails]);

    const renderTabItem = useCallback(({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryChip,
                activeTab === item.id
                    ? { backgroundColor: theme.colors.primary }
                    : { backgroundColor: theme.colors.cardBackground || theme.colors.surface, borderWidth: 1, borderColor: theme.colors.cardBorder },
            ]}
            onPress={() => setActiveTab(item.id)}
        >
            <FontAwesomeIcon 
                icon={item.icon} 
                size={12} 
                color={activeTab === item.id ? '#FFF' : theme.colors.text} 
                style={{ marginRight: 6 }}
            />
            <Text
                style={[
                    styles.categoryChipText,
                    activeTab === item.id
                        ? { color: '#FFF' }
                        : { color: theme.colors.text },
                ]}
            >
                {item.label}
            </Text>
        </TouchableOpacity>
    ), [activeTab, theme.colors]);

    const modalActionDetails = useMemo(() => getActionDetails(selectedItem), [selectedItem, getActionDetails]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#9333ea', '#4f46e5']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroContainer}
            >
                {/* Back Button */}
                <TouchableOpacity 
                    onPress={() => navigation.navigate('Profile')} 
                    style={[styles.backButtonContainer, { marginBottom: 16, paddingHorizontal: 0 }]}
                >
                    <FontAwesomeIcon icon={faArrowLeft} size={14} color="#fff" />
                    <Text style={[styles.backButtonText, { color: "#fff" }]}>Back to Profile</Text>
                </TouchableOpacity>

                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.heroTitle}>Rewards Shop</Text>
                            <TouchableOpacity style={{ marginLeft: 8 }}>
                                <FontAwesomeIcon icon={faInfoCircle} size={16} color="rgba(255,255,255,0.7)" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.heroDescription}>
                            Spend your hard-earned coins on exclusive rewards!
                        </Text>
                    </View>
                    <View style={styles.balanceBadge}>
                        <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.balanceValue}>{coins || 0}</Text>
                            <FontAwesomeIcon icon={faCoins} size={16} color="#fcd34d" style={{ marginLeft: 6 }} />
                        </View>
                    </View>
                </View>
            </LinearGradient>

            {/* Category Tabs (Market-style Filter) */}
            <View style={styles.filterContainer}>
                <FlatList
                    data={tabs}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTabItem}
                    onScroll={handleTabScroll}
                    scrollEventThrottle={16}
                />
                {showScrollHint && (
                    <View style={styles.hintContainer}>
                        <Text style={[styles.hintText, { color: theme.colors.placeholder }]}>
                            Scroll right to see more categories →
                        </Text>
                    </View>
                )}
            </View>

            <FlatList
                data={loading ? [1, 2, 3, 4, 5, 6] : filteredItems}
                renderItem={loading ? () => <ShopItemSkeleton /> : renderItem}
                keyExtractor={(item, index) => loading ? index.toString() : item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                ListEmptyComponent={!loading && (
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No items found in this category.</Text>
                    </View>
                )}
            />

            {/* Selection Modal */}
            <Modal
                visible={!!selectedItem}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedItem(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        {selectedItem && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedItem.name}</Text>
                                        <View style={[styles.modalCategoryBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                                            <Text style={[styles.modalCategoryText, { color: theme.colors.primary }]}>
                                                {(selectedItem.category || 'Border').toUpperCase().replace('_', ' ')}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity 
                                        onPress={() => setSelectedItem(null)}
                                        style={[styles.closeButton, { backgroundColor: theme.colors.cardBackground || '#F3F4F6' }]}
                                    >
                                        <FontAwesomeIcon icon={faTimes} size={16} color={theme.colors.placeholder} />
                                    </TouchableOpacity>
                                </View>

                                <View style={[styles.modalPreviewContainer, { backgroundColor: theme.colors.cardBackground || '#F9FAFB' }]}>
                                    <ItemPreview item={selectedItem} size={140} />
                                </View>

                                <View style={styles.modalInfoSection}>
                                    <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                                        {selectedItem.description || `Enhance your profile with this exclusive ${selectedItem.category || 'item'}!`}
                                    </Text>
                                    
                                    {selectedItem.min_level > current_level && (
                                        <View style={styles.requirementRow}>
                                            <FontAwesomeIcon icon={faLock} size={14} color="#EF4444" />
                                            <Text style={styles.requirementText}>Requires Level {selectedItem.min_level}</Text>
                                        </View>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[styles.actionButton, { 
                                        backgroundColor: modalActionDetails.disabled ? '#E5E7EB' : theme.colors.primary,
                                        shadowColor: theme.colors.primary,
                                        elevation: modalActionDetails.disabled ? 0 : 4,
                                    }]}
                                    onPress={modalActionDetails.action}
                                    disabled={modalActionDetails.disabled || purchasing}
                                >
                                    {purchasing ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.actionButtonText}>{modalActionDetails.label.replace('Buy for ', '')}</Text>
                                            {modalActionDetails.label.includes('Buy') && (
                                                <View style={styles.buttonCoinRow}>
                                                    <Text style={styles.buttonCoinText}>{selectedItem.cost}</Text>
                                                    <FontAwesomeIcon icon={faCoins} size={16} color="#FBBF24" style={{ marginLeft: 6 }} />
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

export default React.memo(ShopScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroContainer: {
        padding: 20,
        marginBottom: 0,
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
    balanceBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'flex-end',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 8,
        fontWeight: '900',
    },
    balanceValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
    },
    backButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 6,
    },
    backButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    filterContainer: { marginBottom: 8, marginTop: 12 },
    categoryScroll: { paddingHorizontal: 16 },
    hintContainer: { 
        paddingHorizontal: 20, 
        marginTop: 6,
        alignItems: 'flex-end',
    },
    hintText: {
        fontSize: 10,
        fontWeight: '600',
        fontStyle: 'italic',
        opacity: 0.8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    categoryChipText: { fontSize: 12, fontWeight: '700' },
    listContent: { padding: 12, paddingBottom: 40 },
    columnWrapper: { justifyContent: 'space-between' },
    itemCard: { 
        width: '48%', 
        marginBottom: 16, 
        borderRadius: 24, 
        padding: 12, 
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    previewContainer: { 
        height: 100, 
        width: '100%',
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: 12,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.02)',
        overflow: 'hidden',
    },
    lockedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelBadge: {
        position: 'absolute',
        bottom: 8,
        backgroundColor: '#4f46e5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    levelBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    itemInfo: { width: '100%', alignItems: 'center' },
    itemName: { fontSize: 13, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.2 },
    badge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 60,
        justifyContent: 'center'
    },
    badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
    bannerPreview: { borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    previewLabel: { color: '#fff', fontSize: 8, fontWeight: 'bold', opacity: 0.5 },
    previewBox: { width: 70, height: 70, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderStyle: 'dashed' },
    namePreviewText: { fontSize: 16, fontWeight: '900' },
    titleTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    titleTagText: { fontSize: 10, fontWeight: 'bold' },
    bubblePreview: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        padding: 24, 
        paddingTop: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        width: '100%', 
        marginBottom: 24 
    },
    modalTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    modalCategoryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginTop: 4,
        alignSelf: 'flex-start'
    },
    modalCategoryText: {
        fontSize: 10,
        fontWeight: '900',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalPreviewContainer: { 
        width: '100%',
        height: 200,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalInfoSection: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 32,
    },
    modalDescription: { 
        fontSize: 15, 
        textAlign: 'center', 
        lineHeight: 22,
        fontWeight: '500',
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    requirementText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '700',
    },
    actionButton: { 
        width: '100%', 
        paddingVertical: 18, 
        borderRadius: 20, 
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    actionButtonText: { color: '#fff', fontSize: 17, fontWeight: '900' },
    buttonCoinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        paddingLeft: 12,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.2)',
    },
    buttonCoinText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '900',
    },
    emptyContainer: { flex: 1, alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 16, fontStyle: 'italic' }
});