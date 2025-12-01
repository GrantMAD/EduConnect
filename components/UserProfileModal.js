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
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faUserCircle} size={26} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>User Profile</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.profileContainer}>
                        <AnimatedAvatarBorder
                            avatarSource={user.avatar_url ? { uri: user.avatar_url } : defaultAvatar}
                            size={80}
                            borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : {}}
                            isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                            isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                            containerStyle={{ marginBottom: 10 }}
                        />
                        <Text style={[styles.userName, { color: theme.colors.text }]}>{user.full_name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                            <Text style={[styles.roleText, { color: roleColor }]}>{user.role || 'User'}</Text>
                        </View>
                    </View>

                    {/* Gamification Stats */}
                    <View style={[styles.statsRow, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                        <View style={styles.statItem}>
                            <FontAwesomeIcon icon={faStar} size={20} color="#FFD700" />
                            <View style={styles.statTextContainer}>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                    {statsLoading ? '...' : gamificationStats.xp}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>XP</Text>
                            </View>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
                        <View style={styles.statItem}>
                            <FontAwesomeIcon icon={faCoins} size={20} color="#FFA500" />
                            <View style={styles.statTextContainer}>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                    {statsLoading ? '...' : gamificationStats.coins}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>Coins</Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.detailsCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                        <TouchableOpacity onPress={handleEmail} style={styles.modalDetailRow} disabled={!user.email}>
                            <FontAwesomeIcon icon={faEnvelope} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
                            <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>{user.email || 'No email provided'}</Text>
                        </TouchableOpacity>
                        <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
                        <TouchableOpacity onPress={handleCall} style={styles.modalDetailRow} disabled={!user.number}>
                            <FontAwesomeIcon icon={faPhone} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
                            <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>{user.number || 'No number provided'}</Text>
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
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faComment} size={16} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.messageButtonText}>Message User</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <Text style={[styles.hintText, { color: theme.colors.placeholder }]}>Tap email or number to contact user</Text>
                </ScrollView>
            </View>
        </Modal>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginLeft: 15,
        flex: 1,
    },
    modalCloseButton: {
        padding: 5,
    },
    profileContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    // avatar style removed as it's handled by AnimatedAvatarBorder
    userName: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 5,
    },
    roleBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    statsRow: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statTextContainer: {
        marginLeft: 10,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 12,
    },
    statDivider: {
        width: 1,
        height: '80%',
    },
    detailsCard: {
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        marginBottom: 10,
        marginTop: 10,
    },
    modalDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    modalIcon: {
        marginRight: 12,
    },
    modalDetailText: {
        fontSize: 16,
    },
    separator: {
        height: 1,
        marginVertical: 8,
    },
    hintText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 5,
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        marginTop: 10,
        marginBottom: 10,
    },
    messageButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
