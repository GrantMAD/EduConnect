import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCoins, faLock, faCheck, faTimes, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const defaultUserImage = require('../../assets/user.png');

const BORDER_STYLES = {
    'border_blue': { borderColor: '#007AFF', borderWidth: 4 },
    'border_green': { borderColor: '#34C759', borderWidth: 4 },
    'border_red': { borderColor: '#FF3B30', borderWidth: 4 },
    'border_gold': { borderColor: '#FFD700', borderWidth: 4 },
    'border_silver': { borderColor: '#C0C0C0', borderWidth: 4 },
    'border_bronze': { borderColor: '#CD7F32', borderWidth: 4 },
    'border_neon': { borderColor: '#FF00FF', borderWidth: 4, shadowColor: '#FF00FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
    'border_fire': { borderColor: '#FF4500', borderWidth: 4, borderStyle: 'dashed' },
    'border_ice': { borderColor: '#00FFFF', borderWidth: 4, shadowColor: '#00FFFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10, elevation: 5 },
    'border_rainbow': { borderColor: '#9400D3', borderWidth: 4, borderStyle: 'dotted' },
};

export default function ShopScreen({ navigation }) {
    const { theme } = useTheme();
    const { coins, purchaseItem, equipItem, equippedItem, current_level } = useGamification();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [purchasing, setPurchasing] = useState(false);
    const [inventory, setInventory] = useState([]);
    const [avatarUrl, setAvatarUrl] = useState(null);

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

            // Fetch user inventory and avatar
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: invData, error: invError } = await supabase
                    .from('user_inventory')
                    .select('item_id')
                    .eq('user_id', user.id);

                if (!invError) {
                    setInventory(invData.map(i => i.item_id));
                }

                // Fetch avatar url
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .single();

                if (!userError && userData) {
                    setAvatarUrl(userData.avatar_url);
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
            // Auto-equip on purchase? Maybe not.
            // But let's refresh the modal to show "Equip" button
        }
    };

    const handleEquip = async () => {
        if (!selectedItem) return;
        const success = await equipItem(selectedItem.id);
        if (success) {
            setSelectedItem(null);
        }
    };

    const AvatarPreview = ({ item, size = 80 }) => {
        const borderStyle = BORDER_STYLES[item.image_url] || {};

        return (
            <View style={[styles.avatarContainer, { width: size, height: size }]}>
                <Image
                    source={avatarUrl ? { uri: avatarUrl } : defaultUserImage}
                    style={[
                        styles.avatarImage,
                        { width: size, height: size, borderRadius: size / 2 },
                        borderStyle
                    ]}
                    resizeMode="cover"
                />
            </View>
        );
    };

    const renderItem = ({ item }) => {
        const isOwned = inventory.includes(item.id);
        const isLocked = item.min_level > current_level;
        const isEquipped = equippedItem?.id === item.id;

        return (
            <TouchableOpacity
                style={[styles.itemCard, { backgroundColor: theme.colors.card, borderColor: isEquipped ? theme.colors.primary : theme.colors.cardBorder, borderWidth: isEquipped ? 2 : 1, opacity: isLocked ? 0.6 : 1 }]}
                onPress={() => setSelectedItem(item)}
                disabled={isLocked}
            >
                <AvatarPreview item={item} size={80} />

                <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={1}>{item.name}</Text>

                    {isEquipped ? (
                        <View style={[styles.ownedBadge, { backgroundColor: theme.colors.primary }]}>
                            <FontAwesomeIcon icon={faCheck} size={12} color="#fff" />
                            <Text style={styles.ownedText}>Equipped</Text>
                        </View>
                    ) : isOwned ? (
                        <View style={styles.ownedBadge}>
                            <FontAwesomeIcon icon={faCheck} size={12} color="#fff" />
                            <Text style={styles.ownedText}>Owned</Text>
                        </View>
                    ) : isLocked ? (
                        <View style={styles.lockedBadge}>
                            <FontAwesomeIcon icon={faLock} size={12} color="#fff" />
                            <Text style={styles.lockedText}>Lvl {item.min_level}</Text>
                        </View>
                    ) : (
                        <View style={styles.priceContainer}>
                            <FontAwesomeIcon icon={faCoins} size={12} color="#FFD700" />
                            <Text style={[styles.priceText, { color: theme.colors.text }]}>{item.cost}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header with Coin Balance */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.customBackButton}>
                    <FontAwesomeIcon icon={faArrowLeft} size={16} color={theme.colors.primary} />
                    <Text style={[styles.customBackButtonText, { color: theme.colors.primary }]}>Back to Profile</Text>
                </TouchableOpacity>

                <View style={styles.titleRow}>
                    <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Shop</Text>
                </View>

                <Text style={[styles.headerDescription, { color: theme.colors.placeholder }]}>
                    Spend your hard-earned coins on cool new items!
                </Text>

                <View style={[styles.balanceContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
                    <Text style={[styles.balanceText, { color: theme.colors.text }]}>Your current coin total is:</Text>
                    <View style={styles.coinValueContainer}>
                        <FontAwesomeIcon icon={faCoins} size={18} color="#FFD700" />
                        <Text style={[styles.coinValueText, { color: theme.colors.text }]}>{coins}</Text>
                    </View>
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={items}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                />
            )}

            {/* Purchase Modal */}
            <Modal
                visible={!!selectedItem}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedItem(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                        {selectedItem && (
                            <>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setSelectedItem(null)}
                                >
                                    <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                                </TouchableOpacity>

                                <View style={{ marginBottom: 20 }}>
                                    <AvatarPreview item={selectedItem} size={120} />
                                </View>

                                <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedItem.name}</Text>
                                <Text style={[styles.modalDescription, { color: theme.colors.placeholder }]}>{selectedItem.description}</Text>

                                {inventory.includes(selectedItem.id) ? (
                                    equippedItem?.id === selectedItem.id ? (
                                        <TouchableOpacity style={[styles.purchaseButton, { backgroundColor: theme.colors.placeholder }]}>
                                            <Text style={styles.purchaseButtonText}>Equipped</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.purchaseButton, { backgroundColor: theme.colors.primary }]}
                                            onPress={handleEquip}
                                        >
                                            <Text style={styles.purchaseButtonText}>Equip</Text>
                                        </TouchableOpacity>
                                    )
                                ) : (
                                    <TouchableOpacity
                                        style={[styles.purchaseButton, { backgroundColor: theme.colors.primary, opacity: coins < selectedItem.cost ? 0.5 : 1 }]}
                                        onPress={handlePurchase}
                                        disabled={coins < selectedItem.cost || purchasing}
                                    >
                                        {purchasing ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.purchaseButtonText}>Buy for {selectedItem.cost}</Text>
                                                <FontAwesomeIcon icon={faCoins} size={16} color="#FFD700" style={{ marginLeft: 8 }} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        padding: 20,
        paddingTop: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    customBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    customBackButtonText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    headerDescription: {
        fontSize: 16,
        marginBottom: 20,
    },
    balanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    balanceText: {
        fontSize: 16,
        fontWeight: '500',
    },
    coinValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    coinValueText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    listContent: {
        padding: 12,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    itemCard: {
        width: '48%',
        marginBottom: 16,
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    avatarContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarImage: {
        // Border styles will be applied here dynamically
    },
    itemInfo: {
        width: '100%',
        alignItems: 'center',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    priceText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    ownedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#34C759',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ownedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8E8E93',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    lockedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 4,
        zIndex: 1,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    purchaseButton: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    purchaseButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
