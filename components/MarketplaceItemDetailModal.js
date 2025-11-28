import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faTag, faUserCircle, faMoneyBillWave, faEdit, faTrash, faComment } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function MarketplaceItemDetailModal({ visible, item, onClose, onViewSeller, onMessageSeller, onEdit, onDelete }) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);

    if (!item) return null;

    const isManagementMode = !!(onEdit || onDelete);

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faTag} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Item Details</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <Image
                        source={{ uri: item.image_url || 'https://via.placeholder.com/300' }}
                        style={[styles.itemImage, { borderColor: theme.colors.cardBorder }]}
                    />

                    <View style={styles.contentContainer}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
                        <Text style={[styles.price, { color: theme.colors.primary }]}>R {item.price.toFixed(2)}</Text>

                        <View style={[styles.badgeContainer, { backgroundColor: theme.colors.inputBackground }]}>
                            <Text style={[styles.categoryBadge, { color: theme.colors.text }]}>{item.category || 'Other'}</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <Text style={[styles.sectionLabel, { color: theme.colors.placeholder }]}>Description</Text>
                        <Text style={[styles.description, { color: theme.colors.text }]}>{item.description}</Text>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        {isManagementMode ? (
                            <View style={styles.actionButtonsContainer}>
                                {onEdit && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.editButton, { backgroundColor: theme.colors.primary }]}
                                        onPress={() => onEdit(item)}
                                    >
                                        <FontAwesomeIcon icon={faEdit} size={16} color="#fff" />
                                        <Text style={styles.actionButtonText}>Edit</Text>
                                    </TouchableOpacity>
                                )}
                                {onDelete && (
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.deleteButton, { backgroundColor: theme.colors.error }]}
                                        onPress={() => onDelete(item.id)}
                                    >
                                        <FontAwesomeIcon icon={faTrash} size={16} color="#fff" />
                                        <Text style={styles.actionButtonText}>Delete</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : (

                            <View>
                                <TouchableOpacity
                                    style={[styles.sellerButton, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}
                                    onPress={
                                        () => {
                                            onClose();
                                            setTimeout(() => onViewSeller(item.seller), 500);
                                        }}
                                >
                                    <View style={styles.sellerInfo}>
                                        <Text style={[styles.sellerLabel, { color: theme.colors.placeholder }]}>Sold by</Text>
                                        <Text style={[styles.sellerName, { color: theme.colors.text }]}>{item.seller?.full_name || 'Unknown Seller'}</Text>
                                    </View>
                                    <FontAwesomeIcon icon={faUserCircle} size={24} color={theme.colors.primary} />
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
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <>
                                            <FontAwesomeIcon icon={faComment} size={16} color="#fff" style={{ marginRight: 8 }} />
                                            <Text style={styles.messageButtonText}>Message Seller</Text>
                                        </>
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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 15,
        flex: 1,
    },
    modalCloseButton: {
        padding: 5,
    },
    itemImage: {
        width: '100%',
        height: 250,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    price: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
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
    divider: {
        height: 1,
        marginVertical: 15,
    },
    sectionLabel: {
        fontSize: 14,
        marginBottom: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
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
    sellerInfo: {
        flex: 1,
    },
    sellerLabel: {
        fontSize: 12,
        marginBottom: 2,
    },
    sellerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
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
    editButton: {
        // backgroundColor set dynamically
    },
    deleteButton: {
        // backgroundColor set dynamically
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        marginTop: 10,
    },
    messageButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
