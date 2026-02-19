import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator, Dimensions } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faUserPlus, faUsers, faCheck, faChevronRight, faChevronLeft, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useToastActions } from '../../context/ToastContext';
import { getAvatarUrl } from '../../lib/utils';
import AnimatedAvatarBorder from '../../components/AnimatedAvatarBorder';
import { BORDER_STYLES } from '../../constants/GamificationStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, fetchUsersBySchool } from '../../services/userService';
import { fetchUsersEquippedItems } from '../../services/gamificationService';

const { width } = Dimensions.get('window');

const NewChatScreen = ({ navigation }) => {
    const { createChannel } = useChat();
    const { theme } = useTheme();
    const { showToast } = useToastActions();
    const insets = useSafeAreaInsets();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [creating, setCreating] = useState(false);

    const [isGroupMode, setIsGroupMode] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState(new Set());

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const authUser = await getCurrentUser();
            if (!authUser) return;

            const userProfile = await getUserProfile(authUser.id);
            if (!userProfile) throw new Error('User profile not found');
            const schoolId = userProfile.school_id;

            const data = await fetchUsersBySchool(schoolId, { searchQuery });
            const filteredData = data.filter(u => u.id !== authUser.id).slice(0, 50);

            const userIds = filteredData.map(user => user.id);

            if (userIds.length > 0) {
                const inventoryData = await fetchUsersEquippedItems(userIds);

                if (inventoryData) {
                    const inventoryMap = {};
                    inventoryData.forEach(item => {
                        const shopItem = Array.isArray(item.shop_items) ? item.shop_items[0] : item.shop_items;
                        inventoryMap[item.user_id] = shopItem;
                    });

                    const processedUsers = filteredData.map(user => ({
                        ...user,
                        equipped_item: inventoryMap[user.id] || null
                    }));

                    setUsers(processedUsers);
                } else {
                    setUsers(filteredData || []);
                }
            } else {
                setUsers(filteredData || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleUserPress = useCallback(async (selectedUser) => {
        if (isGroupMode) {
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
    }, [isGroupMode, createChannel, navigation]);

    const handleCreateGroup = useCallback(async () => {
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
            showToast('Group created successfully', 'success');
            navigation.replace('ChatRoom', { channelId: channel.id, name: groupName.trim() });
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    }, [groupName, selectedUsers, createChannel, navigation, showToast]);

    const getRoleColor = useCallback((role) => {
        switch (role?.toLowerCase()) {
            case 'admin': return '#e11d48';
            case 'teacher': return '#4f46e5';
            case 'student': return '#10b981';
            case 'parent': return '#f59e0b';
            default: return theme.colors.placeholder;
        }
    }, [theme.colors]);

    const renderItem = useCallback(({ item }) => {
        const isSelected = selectedUsers.has(item.id);
        const roleColor = getRoleColor(item.role);

        return (
            <TouchableOpacity
                style={[
                    styles.userCard,
                    { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 },
                    isGroupMode && isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }
                ]}
                onPress={() => handleUserPress(item)}
                disabled={creating}
                activeOpacity={0.7}
            >
                <AnimatedAvatarBorder
                    avatarSource={getAvatarUrl(item.avatar_url, item.email, item.id)}
                    size={48}
                    borderStyle={item.equipped_item ? BORDER_STYLES[item.equipped_item.image_url] : {}}
                    isRainbow={item.equipped_item && BORDER_STYLES[item.equipped_item.image_url]?.rainbow}
                    isAnimated={item.equipped_item && BORDER_STYLES[item.equipped_item.image_url]?.animated}
                />
                <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.colors.text }]} numberOfLines={1}>{item.full_name}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
                        <Text style={[styles.roleText, { color: roleColor }]}>
                            {item.role?.toUpperCase() || 'USER'}
                        </Text>
                    </View>
                </View>

                {isGroupMode ? (
                    <View style={[
                        styles.selectionCircle,
                        { borderColor: isSelected ? theme.colors.primary : theme.colors.cardBorder },
                        isSelected && { backgroundColor: theme.colors.primary }
                    ]}>
                        {isSelected && <FontAwesomeIcon icon={faCheck} size={10} color="#fff" />}
                    </View>
                ) : (
                    <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.cardBorder} />
                )}
            </TouchableOpacity>
        );
    }, [isGroupMode, selectedUsers, getRoleColor, handleUserPress, creating, theme.colors]);

    const toggleMode = useCallback(() => {
        setIsGroupMode(prev => !prev);
        setSelectedUsers(new Set());
        setGroupName('');
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroContainer}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()} 
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingTop: 16 }}
                            activeOpacity={0.7}
                        >
                            <FontAwesomeIcon icon={faChevronLeft} size={14} color="#fff" />
                            <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700', fontSize: 14 }}>Back to Chat list</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.heroTitle}>{isGroupMode ? 'New Group' : 'New Chat'}</Text>
                        <Text style={styles.heroDescription}>
                            {isGroupMode 
                                ? 'Name your group and select members to get started.' 
                                : 'Select a user to start a conversation, or tap the Group button to create a group chat.'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={toggleMode}
                        style={styles.modeToggleBtn}
                    >
                        <FontAwesomeIcon icon={isGroupMode ? faPlus : faUsers} size={14} color="#4f46e5" />
                        <Text style={styles.modeToggleText}>{isGroupMode ? 'DM' : 'Group'}</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                {isGroupMode && (
                    <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginBottom: 12 }]}>
                        <FontAwesomeIcon icon={faUsers} size={16} color={theme.colors.placeholder} style={{ marginRight: 12 }} />
                        <TextInput
                            style={[styles.input, { color: theme.colors.text }]}
                            placeholder="Group Name"
                            placeholderTextColor={theme.colors.placeholder}
                            value={groupName}
                            onChangeText={setGroupName}
                        />
                    </View>
                )}

                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.placeholder} style={{ marginRight: 12 }} />
                    <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="Search for a user..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={fetchUsers}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={[styles.listContent, { paddingBottom: isGroupMode ? 120 : 20 + insets.bottom }]}
                    ListEmptyComponent={!loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No users found.</Text>
                        </View>
                    )}
                />
            )}

            {isGroupMode && (
                <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.cardBorder, borderTopWidth: 1, paddingBottom: insets.bottom + 16 }]}>
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

export default React.memo(NewChatScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroContainer: {
        padding: 24,
        paddingTop: 10,
        elevation: 0,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
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
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -1,
    },
    heroDescription: {
        color: '#e0e7ff',
        fontSize: 14,
        fontWeight: '500',
    },
    modeToggleBtn: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    modeToggleText: {
        color: '#4f46e5',
        fontWeight: 'bold',
        marginLeft: 6,
        fontSize: 14,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 16,
        height: 56,
    },
    input: { flex: 1, fontSize: 15, fontWeight: '700' },
    loadingContainer: { padding: 40, alignItems: 'center' },
    listContent: { padding: 20 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 12,
        borderRadius: 20,
    },
    userInfo: { flex: 1, marginLeft: 16 },
    userName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
    roleText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    selectionCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    footer: { padding: 20, position: 'absolute', bottom: 0, width: '100%' },
    createButton: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    createButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, fontStyle: 'italic' },
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
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 16,
        backgroundColor: '#E0E0E0',
    },
});