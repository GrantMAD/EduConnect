import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, FlatList, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUsers, faEnvelope, faPhone, faUserCircle, faSearch } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const defaultUserImage = require('../assets/user.png');

export default function UserListModal({ visible, users, category, onClose, onUserPress }) {
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    if (!users) return null;

    const getCategoryInfo = () => {
        switch (category) {
            case 'total':
                return { title: 'All Users', icon: faUsers, color: '#007AFF' };
            case 'admin':
                return { title: 'Administrators', icon: faUserCircle, color: '#FF3B30' };
            case 'teacher':
                return { title: 'Teachers', icon: faUserCircle, color: '#34C759' };
            case 'student':
                return { title: 'Students', icon: faUserCircle, color: '#5856D6' };
            case 'parent':
                return { title: 'Parents', icon: faUserCircle, color: '#FF9500' };
            default:
                return { title: 'Users', icon: faUsers, color: '#007AFF' };
        }
    };

    const categoryInfo = getCategoryInfo();

    // Filter users based on search query
    const filteredUsers = users.filter(user => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const name = (user.full_name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return name.includes(query) || email.includes(query);
    });

    const renderUserCard = ({ item }) => (
        <TouchableOpacity
            style={[styles.userCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}
            onPress={() => onUserPress && onUserPress(item)}
            activeOpacity={0.7}
        >
            <Image
                source={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage}
                style={[styles.avatar, { borderColor: categoryInfo.color }]}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.colors.text }]}>{item.full_name || 'No Name'}</Text>
                {item.email && (
                    <View style={styles.infoRow}>
                        <FontAwesomeIcon icon={faEnvelope} size={12} color={theme.colors.placeholder} style={{ marginRight: 6 }} />
                        <Text style={[styles.userDetail, { color: theme.colors.placeholder }]} numberOfLines={1}>{item.email}</Text>
                    </View>
                )}
                {item.number && (
                    <View style={styles.infoRow}>
                        <FontAwesomeIcon icon={faPhone} size={12} color={theme.colors.placeholder} style={{ marginRight: 6 }} />
                        <Text style={[styles.userDetail, { color: theme.colors.placeholder }]}>{item.number}</Text>
                    </View>
                )}
                <View style={[styles.roleBadge, { backgroundColor: categoryInfo.color + '20' }]}>
                    <Text style={[styles.roleText, { color: categoryInfo.color }]}>{item.role}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

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
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: categoryInfo.color + '15' }]}>
                        <FontAwesomeIcon icon={categoryInfo.icon} size={18} color={categoryInfo.color} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>{categoryInfo.title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} style={{ marginRight: 12 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Search by name or email..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={faUsers} size={40} color={theme.colors.cardBorder} />
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                                {searchQuery.trim() ? 'No matching users found' : 'No users in this category'}
                            </Text>
                        </View>
                    }
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 40,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '85%',
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
        flex: 1,
        letterSpacing: -0.5,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        marginTop: 24,
        marginBottom: 16,
        borderRadius: 16,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    listContainer: {
        paddingBottom: 40,
    },
    userCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        alignItems: 'center',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 14,
        marginRight: 16,
        borderWidth: 2,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    userDetail: {
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        marginTop: 4,
    },
    roleText: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 16,
    },
});
