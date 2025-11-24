import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Image, ActivityIndicator } from 'react-native';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSearch, faUserPlus } from '@fortawesome/free-solid-svg-icons';

export default function NewChatScreen({ navigation }) {
    const { createChannel } = useChat();
    const { theme } = useTheme();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [creating, setCreating] = useState(false);

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
            setUsers(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartChat = async (selectedUser) => {
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
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.userCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleStartChat(item)}
            disabled={creating}
        >
            <Image
                source={item.avatar_url ? { uri: item.avatar_url } : require('../../assets/user.png')}
                style={styles.avatar}
            />
            <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.colors.text }]}>{item.full_name}</Text>
                <Text style={[styles.userRole, { color: theme.colors.textSecondary }]}>{item.role} • {item.email}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <FontAwesomeIcon icon={faUserPlus} size={24} color={theme.colors.primary} style={{ marginRight: 10 }} />
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.colors.text }}>
                        New Message
                    </Text>
                </View>
                <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>
                    Select a user to start a conversation
                </Text>
            </View>

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

            {creating && (
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
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 8,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: 16,
        backgroundColor: '#E0E0E0',
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
    },
    userRole: {
        fontSize: 14,
        textTransform: 'capitalize',
        opacity: 0.7,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
