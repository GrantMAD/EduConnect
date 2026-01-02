import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faTag, faUserCircle, faMoneyBillWave, faEdit, faTrash, faComment } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function MarketplaceItemDetailModal({ visible, item, onClose, onViewSeller, onMessageSeller, onEdit, onDelete }) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    if (!item) return null;

    const isManagementMode = !!(onEdit || onDelete);

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.4}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 40) }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faTag} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Item Details</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
                    <Image
                        source={
                            !imageError && item.image_url
                                ? { uri: item.image_url }
                                : require('../assets/item_placeholder.png')
                        }
                        style={[styles.itemImage, { borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                        resizeMode="cover"
                        onError={() => setImageError(true)}
                    />

                    <View style={styles.contentContainer}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
                            <Text style={[styles.price, { color: theme.colors.primary }]}>R {item.price.toFixed(2)}</Text>
                        </View>

                        <View style={[styles.categoryLabel, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <Text style={[styles.categoryText, { color: theme.colors.placeholder }]}>{item.category?.toUpperCase() || 'OTHER'}</Text>
                        </View>

                        <Text style={[styles.description, { color: theme.colors.text }]}>{item.description}</Text>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        {isManagementMode ? (
                            <View style={styles.actionButtonsContainer}>
                                {onEdit && (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                                        onPress={() => onEdit(item)}
                                    >
                                        <Text style={styles.actionBtnText}>EDIT LISTING</Text>
                                    </TouchableOpacity>
                                )}
                                {onDelete && (
                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}
                                        onPress={() => onDelete(item.id)}
                                    >
                                        <Text style={styles.actionBtnText}>DELETE</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (
                            <View>
                                <TouchableOpacity
                                    style={[styles.sellerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                                    onPress={() => {
                                        onClose();
                                        setTimeout(() => onViewSeller(item.seller), 500);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.sellerAvatarBox, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <FontAwesomeIcon icon={faUserCircle} size={20} color={theme.colors.primary} />
                                    </View>
                                    <View style={styles.sellerInfo}>
                                        <Text style={[styles.sellerLabel, { color: theme.colors.placeholder }]}>SOLD BY</Text>
                                        <Text style={[styles.sellerName, { color: theme.colors.text }]}>{item.seller?.full_name || 'Unknown Seller'}</Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.messageButton, { backgroundColor: theme.colors.primary }]}
                                    onPress={async () => {
                                        if (loading) return;
                                        setLoading(true);
                                        try {
                                            await onMessageSeller(item.seller);
                                            onClose();
                                        } catch (error) {
                                            console.error("Error messaging seller:", error);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                    activeOpacity={0.8}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.messageButtonText}>SEND MESSAGE TO SELLER</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView >
            </View >
        </Modal >
    );
}

const styles = StyleSheet.create({
    modalContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
        flex: 1,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemImage: {
        width: '100%',
        height: 280,
        borderRadius: 24,
        marginBottom: 24,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        flex: 1,
        marginRight: 12,
        letterSpacing: -0.5,
    },
    price: {
        fontSize: 20,
        fontWeight: '900',
    },
    categoryLabel: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 24,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    description: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        marginVertical: 24,
    },
    sellerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
    },
    sellerAvatarBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    sellerInfo: {
        flex: 1,
    },
    sellerLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    sellerName: {
        fontSize: 15,
        fontWeight: '800',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    },
    messageButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageButtonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1,
    },
    badgeContainer: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 15,
    },
    categoryBadge: {
        fontSize: 14,
        fontWeight: '500',
    },
    sectionLabel: {
        fontSize: 14,
        marginBottom: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sellerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 10,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        marginHorizontal: 5,
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
});
