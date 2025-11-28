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
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={categoryInfo.icon} size={24} color={categoryInfo.color} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>{categoryInfo.title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.placeholder} style={{ marginRight: 10 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Search by name or email..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <FontAwesomeIcon icon={faTimes} size={16} color={theme.colors.placeholder} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.countContainer}>
                    <Text style={[styles.countText, { color: theme.colors.text }]}>
                        {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
                        {searchQuery.trim() && ` (filtered from ${users.length})`}
                    </Text>
                </View>

                <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={faUsers} size={48} color={theme.colors.placeholder} />
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                                {searchQuery.trim() ? 'No users match your search' : 'No users found'}
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginTop: 10,
        marginBottom: 5,
        borderRadius: 10,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 0,
    },
    clearButton: {
        padding: 5,
    },
    countContainer: {
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    countText: {
        fontSize: 14,
        fontWeight: '600',
    },
    listContainer: {
        paddingBottom: 20,
    },
    userCard: {
        flexDirection: 'row',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        alignItems: 'center',
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
        borderWidth: 2,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 3,
    },
    userDetail: {
        fontSize: 13,
        flex: 1,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 6,
    },
    roleText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 12,
    },
});
