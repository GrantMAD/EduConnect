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
    // Using a Map for O(1) lookups and to keep user objects for the chips UI
    const [selectedUsersMap, setSelectedUsersMap] = useState(new Map());

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
            setSelectedUsersMap(prev => {
                const newMap = new Map(prev);
                if (newMap.has(selectedUser.id)) {
                    newMap.delete(selectedUser.id);
                } else {
                    newMap.set(selectedUser.id, selectedUser);
                }
                return newMap;
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
        if (selectedUsersMap.size === 0) {
            showToast('Please select at least one user', 'error');
            return;
        }

        setCreating(true);
        try {
            const userIds = Array.from(selectedUsersMap.keys());
            const channel = await createChannel(groupName.trim(), 'group', userIds);
            showToast('Group created successfully', 'success');
            navigation.replace('ChatRoom', { channelId: channel.id, name: groupName.trim() });
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    }, [groupName, selectedUsersMap, createChannel, navigation, showToast]);

    const toggleSelectAll = useCallback(() => {
        if (users.length === 0) return;
        
        const allVisibleSelected = users.every(u => selectedUsersMap.has(u.id));
        
        setSelectedUsersMap(prev => {
            const newMap = new Map(prev);
            if (allVisibleSelected) {
                users.forEach(u => newMap.delete(u.id));
            } else {
                users.forEach(u => newMap.set(u.id, u));
            }
            return newMap;
        });
    }, [users, selectedUsersMap]);

    const removeSelectedUser = useCallback((userId) => {
        setSelectedUsersMap(prev => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
        });
    }, []);

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
        const isSelected = selectedUsersMap.has(item.id);
        const roleColor = getRoleColor(item.role);

        return (
            <TouchableOpacity
                style={[
                    styles.userCard,
                    { backgroundColor: theme.colors.card, borderColor: isSelected ? theme.colors.primary : theme.colors.cardBorder, borderWidth: isSelected ? 2 : 1 },
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
    }, [isGroupMode, selectedUsersMap, getRoleColor, handleUserPress, creating, theme.colors]);

    const toggleMode = useCallback(() => {
        setIsGroupMode(prev => !prev);
        setSelectedUsersMap(new Map());
        setGroupName('');
    }, []);

    const renderSelectedChips = () => {
        if (!isGroupMode || selectedUsersMap.size === 0) return null;
        
        return (
            <View style={styles.chipsContainer}>
                <FlatList
                    horizontal
                    data={Array.from(selectedUsersMap.values())}
                    keyExtractor={item => item.id}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <View style={[styles.chip, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
                            <Image 
                                source={getAvatarUrl(item.avatar_url, item.email, item.id)} 
                                style={styles.chipAvatar} 
                            />
                            <Text style={[styles.chipText, { color: theme.colors.primary }]}>{item.full_name.split(' ')[0]}</Text>
                            <TouchableOpacity onPress={() => removeSelectedUser(item.id)} style={styles.chipRemove}>
                                <FontAwesomeIcon icon={faPlus} size={10} color={theme.colors.primary} style={{ transform: [{ rotate: '45deg' }] }} />
                            </TouchableOpacity>
                        </View>
                    )}
                    contentContainerStyle={styles.chipsListContent}
                />
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.heroContainer, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()} 
                            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
                            activeOpacity={0.7}
                        >
                            <FontAwesomeIcon icon={faChevronLeft} size={14} color="#fff" />
                            <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700', fontSize: 14 }}>Back</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.heroTitle}>{isGroupMode ? 'New Group' : 'New Chat'}</Text>
                        <Text style={styles.heroDescription}>
                            {isGroupMode 
                                ? 'Select members for your group.' 
                                : 'Start a private conversation.'}
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
                        placeholder="Search users..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <FontAwesomeIcon icon={faPlus} size={14} color={theme.colors.placeholder} style={{ transform: [{ rotate: '45deg' }] }} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {renderSelectedChips()}

            <View style={styles.listHeader}>
                <Text style={[styles.listHeaderTitle, { color: theme.colors.placeholder }]}>
                    {loading ? 'SEARCHING DIRECTORY...' : `${users.length} USERS FOUND`}
                </Text>
                {isGroupMode && users.length > 0 && (
                    <TouchableOpacity onPress={toggleSelectAll}>
                        <Text style={[styles.selectAllText, { color: theme.colors.primary }]}>
                            {users.every(u => selectedUsersMap.has(u.id)) ? 'DESELECT ALL' : 'SELECT ALL'}
                        </Text>
                    </TouchableOpacity>
                )}
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
                <View style={[styles.footer, { backgroundColor: theme.colors.card, borderTopColor: theme.colors.cardBorder, borderTopWidth: 1, paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity
                        style={[
                            styles.createButton,
                            { backgroundColor: theme.colors.primary },
                            (!groupName.trim() || selectedUsersMap.size === 0) && { opacity: 0.5 }
                        ]}
                        onPress={handleCreateGroup}
                        disabled={!groupName.trim() || selectedUsersMap.size === 0 || creating}
                    >
                        {creating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Group ({selectedUsersMap.size})</Text>
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
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroContainer: {
        padding: 24,
        paddingBottom: 32,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
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
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -1,
    },
    heroDescription: {
        color: '#e0e7ff',
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.9,
    },
    modeToggleBtn: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    modeToggleText: {
        color: '#4f46e5',
        fontWeight: '900',
        marginLeft: 8,
        fontSize: 14,
        textTransform: 'uppercase',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 20,
        height: 56,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    input: { flex: 1, fontSize: 15, fontWeight: '700' },
    chipsContainer: {
        marginTop: 16,
        height: 44,
    },
    chipsListContent: {
        paddingHorizontal: 20,
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 4,
        paddingRight: 12,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
    },
    chipAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 8,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '800',
    },
    chipRemove: {
        marginLeft: 8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 20,
        marginBottom: 8,
    },
    listHeaderTitle: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    selectAllText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    loadingContainer: { padding: 40, alignItems: 'center' },
    listContent: { padding: 20, paddingTop: 4 },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 12,
        borderRadius: 24,
    },
    userInfo: { flex: 1, marginLeft: 16 },
    userName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 2 },
    roleText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    selectionCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    footer: { padding: 20, position: 'absolute', bottom: 0, width: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32, elevation: 20 },
    createButton: { height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
    createButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { fontSize: 16, fontWeight: '600', opacity: 0.5 },
});

export default React.memo(NewChatScreen);
