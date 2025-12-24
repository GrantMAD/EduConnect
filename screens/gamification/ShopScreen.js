import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCoins, faLock, faCheck, faTimes, faArrowLeft, faStore, faIdCard, faUserCircle, faPalette, faAward, faComments, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { BORDER_STYLES, BANNER_STYLES, NAME_COLOR_STYLES, TITLE_STYLES, BUBBLE_STYLES, STICKER_PACKS } from '../../constants/GamificationStyles';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { SkeletonPiece } from '../../components/skeletons/DashboardScreenSkeleton';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ShopItemSkeleton = () => {
    const { theme } = useTheme();
    return (
        <View style={[styles.itemCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 0.5 }]}>
            <SkeletonPiece style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }} />
            <View style={styles.itemInfo}>
                <SkeletonPiece style={{ width: 80, height: 16, borderRadius: 4, marginBottom: 8 }} />
                <SkeletonPiece style={{ width: 50, height: 20, borderRadius: 12 }} />
            </View>
        </View>
    );
};

const defaultUserImage = require('../../assets/user.png');

export default function ShopScreen({ navigation }) {
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
    const [activeTab, setActiveTab] = useState('all');
    const [fullName, setFullName] = useState('Student');

    useEffect(() => {
        fetchShopData();
    }, []);

    const fetchShopData = async () => {
        setLoading(true);
        try {
            // Fetch items
            const { data: itemsData, error: itemsError } = await supabase
                .from('shop_items')
                .select('*')
                .eq('is_active', true)
                .order('cost', { ascending: true });

            if (itemsError) throw itemsError;

            // Fetch user info
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: invData } = await supabase
                    .from('user_inventory')
                    .select('item_id')
                    .eq('user_id', user.id);

                if (invData) setInventory(invData.map(i => i.item_id));

                const { data: userData } = await supabase
                    .from('users')
                    .select('avatar_url, full_name')
                    .eq('id', user.id)
                    .single();

                if (userData) {
                    setAvatarUrl(userData.avatar_url);
                    setFullName(userData.full_name || 'Student');
                }
            }

            setItems(itemsData || []);
        } catch (error) {
            console.error('Error fetching shop data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedItem) return;
        setPurchasing(true);
        const success = await purchaseItem(selectedItem);
        setPurchasing(false);
        if (success) {
            setInventory(prev => [...prev, selectedItem.id]);
        }
    };

    const handleEquip = async () => {
        if (!selectedItem) return;
        const success = await equipItem(selectedItem);
        if (success) setSelectedItem(null);
    };

    const getActionDetails = (item) => {
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
        if (isOwned) return { label: 'Equip', action: () => handleEquip(item), disabled: false };
        if (isLocked) return { label: `Lvl ${item.min_level}`, action: () => {}, disabled: true };
        if (!canAfford) return { label: 'Not Enough Coins', action: () => {}, disabled: true };
        
        return { label: `Buy for ${item.cost}`, action: handlePurchase, disabled: false };
    };

    const ItemPreview = ({ item, size = 80 }) => {
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

        // Default: Border
        const borderStyle = BORDER_STYLES[item.image_url] || {};
        return (
            <AnimatedAvatarBorder
                avatarSource={avatarUrl ? { uri: avatarUrl } : defaultUserImage}
                size={size}
                borderStyle={borderStyle}
                isRainbow={borderStyle.rainbow}
                isAnimated={borderStyle.animated}
            />
        );
    };

    const filteredItems = items.filter(item => {
        if (activeTab === 'all') return true;
        const cat = item.category;
        if (activeTab === 'border') return cat === 'avatar_border' || cat === 'border' || !cat;
        return cat === activeTab;
    });

    const tabs = [
        { id: 'all', label: 'All', icon: faStore },
        { id: 'border', label: 'Borders', icon: faUserCircle },
        { id: 'banner', label: 'Banners', icon: faIdCard },
        { id: 'name_color', label: 'Colors', icon: faPalette },
        { id: 'title', label: 'Titles', icon: faAward },
        { id: 'bubble_style', label: 'Bubbles', icon: faComments },
        { id: 'sticker_pack', label: 'Stickers', icon: faPalette },
    ];

    const renderItem = ({ item }) => {
        const details = getActionDetails(item);
        const isEquipped = details.label === 'Equipped' || details.label === 'Unlocked';

        return (
            <TouchableOpacity
                style={[styles.itemCard, {
                    backgroundColor: theme.colors.card,
                    borderColor: isEquipped ? theme.colors.primary : theme.colors.cardBorder,
                    borderWidth: isEquipped ? 2 : 0.5,
                }]}
                onPress={() => setSelectedItem(item)}
                disabled={item.min_level > current_level}
            >
                <View style={styles.previewContainer}>
                    <ItemPreview item={item} size={70} />
                </View>

                <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>
                    
                    <View style={[styles.badge, { 
                        backgroundColor: isEquipped ? theme.colors.primary : (details.disabled ? '#8E8E93' : theme.colors.cardBackground || '#F5F5F5'),
                        borderColor: details.disabled ? 'transparent' : theme.colors.cardBorder || '#DDD',
                        borderWidth: details.disabled ? 0 : 1
                    }]}>
                        {isEquipped && <FontAwesomeIcon icon={faCheck} size={10} color="#fff" style={{ marginRight: 4 }} />}
                        {!isEquipped && !details.disabled && <FontAwesomeIcon icon={faCoins} size={10} color="#FFD700" style={{ marginRight: 4 }} />}
                        <Text style={[styles.badgeText, { color: isEquipped ? '#fff' : (details.disabled ? '#fff' : theme.colors.text) }]}>
                            {details.label.includes('Buy for') ? item.cost : details.label}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Back Button */}
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.backButtonContainer}>
                <FontAwesomeIcon icon={faArrowLeft} size={14} color={theme.colors.primary} />
                <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>Back to Profile</Text>
            </TouchableOpacity>

            {/* Header and Balance Row */}
            <View style={styles.headerRow}>
                <View style={styles.headerTitleGroup}>
                    <FontAwesomeIcon icon={faStore} size={20} color={theme.colors.primary} style={styles.mainHeaderIcon} />
                    <Text style={[styles.headerText, { color: theme.colors.text }]}>Shop</Text>
                </View>

                {/* Coin Balance (Gradient Style) - Ultra Compact Single Line */}
                <LinearGradient 
                    colors={['#6366F1', '#8B5CF6']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 0}} 
                    style={styles.balanceGradient}
                >
                    <View style={styles.balanceInfo}>
                        <Text style={styles.balanceLabel}>Balance: </Text>
                        <Text style={styles.balanceValue}>{coins}</Text>
                        <FontAwesomeIcon icon={faCoins} size={10} color="#FFD700" style={{ marginLeft: 4 }} />
                    </View>
                </LinearGradient>
            </View>
            
            <Text style={[styles.subHeader, { color: theme.colors.placeholder }]}>
                Spend your hard-earned coins on exclusive rewards!
            </Text>

            {/* Category Tabs Indicator */}
            <View style={styles.scrollIndicatorRow}>
                <Text style={[styles.scrollIndicatorText, { color: theme.colors.placeholder }]}>Scroll for more categories</Text>
                <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.placeholder} />
            </View>

            {/* Category Tabs (Market-style Filter) */}
            <View style={styles.filterContainer}>
                <FlatList
                    data={tabs}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
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
                                size={14} 
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
                    )}
                />
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
                                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedItem.name}</Text>
                                    <TouchableOpacity onPress={() => setSelectedItem(null)}>
                                        <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalPreview}>
                                    <ItemPreview item={selectedItem} size={120} />
                                </View>

                                <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                                    {selectedItem.description}
                                </Text>

                                {(() => {
                                    const details = getActionDetails(selectedItem);
                                    return (
                                        <TouchableOpacity
                                            style={[styles.actionButton, { 
                                                backgroundColor: details.disabled ? '#E5E7EB' : theme.colors.primary,
                                                opacity: details.disabled && !details.label.includes('Equipped') ? 0.5 : 1
                                            }]}
                                            onPress={details.action}
                                            disabled={details.disabled || purchasing}
                                        >
                                            {purchasing ? (
                                                <ActivityIndicator color="#fff" />
                                            ) : (
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={styles.actionButtonText}>{details.label}</Text>
                                                    {details.label.includes('Buy') && <FontAwesomeIcon icon={faCoins} size={16} color="#FFD700" style={{ marginLeft: 8 }} />}
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })()}
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 8,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        marginBottom: 4,
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 8,
        marginTop: 10,
        gap: 6,
    },
    backButtonText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    mainHeaderIcon: { marginRight: 8 },
    headerText: { fontSize: 22, fontWeight: '900' },
    subHeader: {
        fontSize: 12,
        paddingHorizontal: 16,
        marginBottom: 12,
        lineHeight: 18,
    },
    balanceGradient: {
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        elevation: 3,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    balanceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.8)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    balanceValue: {
        fontSize: 14,
        fontWeight: '900',
        color: '#FFF',
    },
    scrollIndicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        marginBottom: 6,
        gap: 4,
    },
    scrollIndicatorText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    filterContainer: { marginBottom: 16 },
    categoryScroll: { paddingHorizontal: 16 },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
    },
    categoryChipText: { fontSize: 14, fontWeight: '600' },
    listContent: { padding: 12, paddingBottom: 40 },
    columnWrapper: { justifyContent: 'space-between' },
    itemCard: { width: '48%', marginBottom: 16, borderRadius: 20, padding: 15, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'rgba(0,0,0,0.05)' },
    previewContainer: { height: 90, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    itemInfo: { width: '100%', alignItems: 'center' },
    itemName: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
    badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    bannerPreview: { borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    previewLabel: { color: '#fff', fontSize: 8, fontWeight: 'bold', opacity: 0.5 },
    previewBox: { width: 70, height: 70, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderStyle: 'dashed' },
    namePreviewText: { fontSize: 16, fontWeight: '900' },
    titleTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    titleTagText: { fontSize: 10, fontWeight: 'bold' },
    bubblePreview: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, alignItems: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
    modalTitle: { fontSize: 24, fontWeight: '900' },
    modalPreview: { marginBottom: 30 },
    modalDescription: { fontSize: 16, textAlign: 'center', marginBottom: 30, lineHeight: 24 },
    actionButton: { width: '100%', paddingVertical: 16, borderRadius: 15, alignItems: 'center' },
    actionButtonText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    emptyContainer: { flex: 1, alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 16, fontStyle: 'italic' }
});
