import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, ScrollView, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEnvelope, faPhone, faUserCircle, faIdBadge, faComment, faStar, faCoins } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import AnimatedAvatarBorder from './AnimatedAvatarBorder';
import { BORDER_STYLES } from '../constants/GamificationStyles';

export default function UserProfileModal({ visible, user, onClose, onMessageUser, equippedItem: propEquippedItem }) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [gamificationStats, setGamificationStats] = useState({ xp: 0, coins: 0 });
    const [statsLoading, setStatsLoading] = useState(false);
    const [fetchedEquippedItem, setFetchedEquippedItem] = useState(null);

    const equippedItem = propEquippedItem || fetchedEquippedItem;

    useEffect(() => {
        if (visible && user) {
            fetchGamificationStats();
            if (!propEquippedItem) {
                fetchEquippedItem();
            }
        } else {
            setFetchedEquippedItem(null);
        }
    }, [visible, user, propEquippedItem]);

    const fetchGamificationStats = async () => {
        if (!user?.id) return;
        setStatsLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_gamification')
                .select('current_xp, coins')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setGamificationStats({
                    xp: data.current_xp || 0,
                    coins: data.coins || 0
                });
            } else {
                setGamificationStats({ xp: 0, coins: 0 });
            }
        } catch (error) {
            console.error('Error fetching gamification stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const fetchEquippedItem = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('user_inventory')
                .select('shop_items(*)')
                .eq('user_id', user.id)
                .eq('is_equipped', true)
                .maybeSingle();

            if (error) throw error;

            if (data?.shop_items) {
                setFetchedEquippedItem(data.shop_items);
            }
        } catch (error) {
            console.error('Error fetching equipped item:', error);
        }
    };

    if (!user) return null;

    const defaultAvatar = require('../assets/user.png');

    const handleCall = () => {
        if (user.number) {
            Linking.openURL(`tel:${user.number}`);
        }
    };

    const handleEmail = () => {
        if (user.email) {
            Linking.openURL(`mailto:${user.email}`);
        }
    };

    const getRoleColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin': return '#FF3B30';
            case 'teacher': return '#34C759';
            case 'student': return '#5856D6';
            case 'parent': return '#FF9500';
            default: return theme.colors.textSecondary;
        }
    };

    const roleColor = getRoleColor(user.role);

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
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faUserCircle} size={20} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>User Profile</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
                    <View style={styles.profileContainer}>
                        <AnimatedAvatarBorder
                            avatarSource={user.avatar_url ? { uri: user.avatar_url } : defaultAvatar}
                            size={96}
                            borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : {}}
                            isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                            isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                            containerStyle={{ marginBottom: 16 }}
                        />
                        <Text style={[styles.userName, { color: theme.colors.text }]}>{user.full_name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
                            <Text style={[styles.roleText, { color: roleColor }]}>{user.role?.toUpperCase() || 'USER'}</Text>
                        </View>
                    </View>

                    {/* Gamification Stats */}
                    <View style={[styles.statsRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIconBox, { backgroundColor: '#f59e0b' + '15' }]}>
                                <FontAwesomeIcon icon={faStar} size={14} color="#f59e0b" />
                            </View>
                            <View style={styles.statTextContainer}>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                    {statsLoading ? '...' : gamificationStats.xp}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>XP</Text>
                            </View>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIconBox, { backgroundColor: '#f59e0b' + '15' }]}>
                                <FontAwesomeIcon icon={faCoins} size={14} color="#f59e0b" />
                            </View>
                            <View style={styles.statTextContainer}>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                    {statsLoading ? '...' : gamificationStats.coins}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>COINS</Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.detailsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                        <TouchableOpacity onPress={handleEmail} style={styles.modalDetailRow} disabled={!user.email}>
                            <FontAwesomeIcon icon={faEnvelope} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
                            <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>{user.email || 'No email provided'}</Text>
                        </TouchableOpacity>
                        <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
                        <TouchableOpacity onPress={handleCall} style={styles.modalDetailRow} disabled={!user.number}>
                            <FontAwesomeIcon icon={faPhone} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
                            <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>{user.number || 'No phone number'}</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.messageButton, { backgroundColor: theme.colors.primary }]}
                        onPress={async () => {
                            if (loading) return;
                            setLoading(true);
                            try {
                                await onMessageUser(user);
                                onClose();
                            } catch (error) {
                                console.error("Error messaging user:", error);
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
                            <Text style={styles.messageButtonText}>SEND DIRECT MESSAGE</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
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
    profileContainer: {
        alignItems: 'center',
        paddingBottom: 24,
    },
    userName: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    roleBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    roleText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    statsRow: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statTextContainer: {
    },
    statValue: {
        fontSize: 18,
        fontWeight: '900',
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 40,
    },
    detailsCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
    },
    modalDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    modalIcon: {
        marginRight: 16,
    },
    modalDetailText: {
        fontSize: 15,
        fontWeight: '600',
    },
    separator: {
        height: 1,
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
});
