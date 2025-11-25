import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faUserPlus, faUsers, faCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES } from '../../constants/GamificationStyles';

const defaultUserImage = require('../../assets/user.png');

export default function NewChatScreen({ navigation }) {
    const { createChannel } = useChat();
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [creating, setCreating] = useState(false);

    // Group Chat State
    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState(new Set());

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();

            let query = supabase
                .from('users')
                .select('id, full_name, email, avatar_url, role')
                .neq('id', currentUser.id) // Don't show self
                .limit(50);

            if (searchQuery) {
                query = query.ilike('full_name', `%${searchQuery}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Manually fetch equipped items for all users
            const userIds = (data || []).map(user => user.id);

            if (userIds.length > 0) {
                const { data: inventoryData } = await supabase
                    .from('user_inventory')
                    .select('user_id, shop_items(id, name, image_url)')
                    .in('user_id', userIds)
                    .eq('is_equipped', true);

                if (inventoryData) {
                    const inventoryMap = {};
                    inventoryData.forEach(item => {
                        const shopItem = Array.isArray(item.shop_items) ? item.shop_items[0] : item.shop_items;
                        inventoryMap[item.user_id] = shopItem;
                    });

                    // Inject equipped items into user data
                    const processedUsers = (data || []).map(user => ({
                        ...user,
                        equipped_item: inventoryMap[user.id] || null
                    }));

                    setUsers(processedUsers);
                } else {
                    setUsers(data || []);
                }
            } else {
                setUsers(data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUserPress = async (selectedUser) => {
        if (isGroupMode) {
            // Toggle selection
            setSelectedUsers(prev => {
                const newSet = new Set(prev);
                if (newSet.has(selectedUser.id)) {
                    newSet.delete(selectedUser.id);
                } else {
                    newSet.add(selectedUser.id);
                }
                return newSet;
            });
        } else {
            // Direct Message - Start immediately
            setCreating(true);
            try {
                const channelName = `${selectedUser.full_name}`;
                const channel = await createChannel(channelName, 'direct', [selectedUser.id]);
                navigation.replace('ChatRoom', { channelId: channel.id, name: channelName });
            } catch (error) {
                console.error(error);
            } finally {
                setCreating(false);
            }
        }
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            showToast('Please enter a group name', 'error');
            return;
        }
        if (selectedUsers.size === 0) {
            showToast('Please select at least one user', 'error');
            return;
        }

        setCreating(true);
        try {
            const userIds = Array.from(selectedUsers);
            const channel = await createChannel(groupName.trim(), 'group', userIds);
            navigation.replace('ChatRoom', { channelId: channel.id, name: groupName.trim() });
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const getRoleColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin':
                return theme.colors.error; // Red
            case 'teacher':
                return theme.colors.primary; // Blue/Primary
            case 'student':
                return '#4CAF50'; // Green
            case 'parent':
                return '#FF9800'; // Orange
            default:
                return theme.colors.textSecondary; // Grey
        }
    };

    const renderItem = ({ item }) => {
        const isSelected = selectedUsers.has(item.id);
        const roleColor = getRoleColor(item.role);

        return (
            <TouchableOpacity
                style={[
                    styles.userCard,
                    {
                        backgroundColor: theme.colors.surface,
                    },
                    isGroupMode && isSelected && { backgroundColor: theme.colors.primary + '10' }
                ]}
                onPress={() => handleUserPress(item)}
                disabled={creating}
            >
                <AnimatedAvatarBorder
                    avatarSource={item.avatar_url ? { uri: item.avatar_url } : defaultUserImage}
                    size={48}
                    borderStyle={item.equipped_item ? BORDER_STYLES[item.equipped_item.image_url] : {}}
                    isRainbow={item.equipped_item && BORDER_STYLES[item.equipped_item.image_url]?.rainbow}
                    isAnimated={item.equipped_item && BORDER_STYLES[item.equipped_item.image_url]?.animated}
                />
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.colors.text }]}>{item.full_name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
                        <Text style={[styles.roleText, { color: roleColor }]}>
                            {item.role || 'User'}
                        </Text>
                    </View>
                </View>

                {isGroupMode ? (
                    <View style={[
                        styles.selectionCircle,
                        { borderColor: isSelected ? theme.colors.primary : theme.colors.textSecondary },
                        isSelected && { backgroundColor: theme.colors.primary }
                    ]}>
                        {isSelected && <FontAwesomeIcon icon={faCheck} size={10} color="#fff" />}
                    </View>
                ) : (
                    <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FontAwesomeIcon icon={isGroupMode ? faUsers : faUserPlus} size={24} color={theme.colors.primary} style={{ marginRight: 10 }} />
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.colors.text }}>
                            {isGroupMode ? 'New Group' : 'New Message'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            setIsGroupMode(!isGroupMode);
                            setSelectedUsers(new Set());
                            setGroupName('');
                        }}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: isGroupMode ? theme.colors.surface : theme.colors.primary,
                            borderRadius: 8
                        }}
                    >
                        {!isGroupMode && <FontAwesomeIcon icon={faUserPlus} size={14} color="#fff" style={{ marginRight: 6 }} />}
                        <Text style={{ color: isGroupMode ? theme.colors.primary : '#fff', fontWeight: '600' }}>
                            {isGroupMode ? 'Cancel' : 'Create Group'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>
                    {isGroupMode ? 'Name your group and add members' : 'Select a user to start a conversation'}
                </Text>
            </View>

            {/* Group Name Input */}
            {isGroupMode && (
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, marginBottom: 8 }]}>
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Group Name"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={groupName}
                        onChangeText={setGroupName}
                    />
                </View>
            )}

            <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
                <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    placeholder="Search users..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={(text) => {
                        setSearchQuery(text);
                    }}
                    onSubmitEditing={fetchUsers}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                />
            )}

            {/* Create Group Button */}
            {isGroupMode && (
                <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
                    <TouchableOpacity
                        style={[
                            styles.createButton,
                            { backgroundColor: theme.colors.primary },
                            (!groupName.trim() || selectedUsers.size === 0) && { opacity: 0.5 }
                        ]}
                        onPress={handleCreateGroup}
                        disabled={!groupName.trim() || selectedUsers.size === 0 || creating}
                    >
                        {creating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Group ({selectedUsers.size})</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {creating && !isGroupMode && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 8,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
        flexGrow: 0,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
        backgroundColor: '#E0E0E0',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginTop: 2,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
    },
    createButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
