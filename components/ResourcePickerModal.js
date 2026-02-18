import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faTimes,
    faLink,
    faSearch,
    faFileAlt,
    faCheck
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchResourcesWithVotes, linkResourceToClass } from '../services/resourceService';

export default function ResourcePickerModal({ isOpen, onClose, classId, lessonPlanId = null, onSelect, onRefresh }) {
    const { theme } = useTheme();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [resources, setResources] = useState([]);
    const [linkingId, setLinkingId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadResources();
        }
    }, [isOpen]);

    const loadResources = async () => {
        setLoading(true);
        try {
            // Fetch personal and school resources
            const [personal, school] = await Promise.all([
                fetchResourcesWithVotes({ activeTab: 'personal', userId: user.id, profile }),
                fetchResourcesWithVotes({ activeTab: 'public', schoolId: profile.school_id, userId: user.id, profile })
            ]);

            // Combine and unique
            const combined = [...personal, ...school];
            const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            
            // Filter out those already linked to this specific context
            const available = unique.filter(res => 
                !res.class_resources?.some(cr => 
                    cr.class_id === classId && cr.lesson_plan_id === lessonPlanId
                )
            );

            setResources(available);
        } catch (error) {
            console.error(error);
            showToast('Failed to load library', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async (resource) => {
        setLinkingId(resource.id);
        try {
            await linkResourceToClass(resource.id, classId, lessonPlanId);
            showToast('Resource linked successfully', 'success');
            if (onSelect) onSelect(resource);
            if (onRefresh) onRefresh();
            onClose();
        } catch (error) {
            console.error(error);
            showToast('Failed to link resource', 'error');
        } finally {
            setLinkingId(null);
        }
    };

    const filteredResources = resources.filter(r => 
        r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Modal
            isVisible={isOpen}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            propagateSwipe={true}
            style={styles.modal}
        >
            <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.swipeIndicator} />
                
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faLink} size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>Link from Library</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Existing Materials</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}>
                        <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} />
                        <TextInput
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            placeholder="Search library..."
                            placeholderTextColor={theme.colors.placeholder}
                            style={[styles.searchInput, { color: theme.colors.text }]}
                        />
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={theme.colors.primary} style={{ margin: 40 }} />
                ) : (
                    <FlatList
                        data={filteredResources}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <FontAwesomeIcon icon={faFileAlt} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No resources found</Text>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.resourceItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}
                                onPress={() => handleLink(item)}
                                disabled={linkingId === item.id}
                            >
                                <View style={styles.itemLeft}>
                                    <View style={[styles.itemIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <FontAwesomeIcon icon={faFileAlt} size={16} color={theme.colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.itemTitle, { color: theme.colors.text }]}>{item.title}</Text>
                                        <Text style={[styles.itemCategory, { color: theme.colors.placeholder }]}>{item.category?.toUpperCase()}</Text>
                                    </View>
                                </View>
                                {linkingId === item.id ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                    <View style={[styles.checkCircle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
                                        <FontAwesomeIcon icon={faCheck} size={10} color={theme.colors.cardBorder} />
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                )}
                
                <View style={{ height: 40 }} />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal: { margin: 0, justifyContent: 'flex-end' },
    container: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', minHeight: '50%' },
    swipeIndicator: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900' },
    subtitle: { fontSize: 13, fontWeight: '500' },
    closeBtn: { padding: 4 },
    searchContainer: { padding: 20, paddingBottom: 10 },
    searchBar: { height: 50, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
    searchInput: { flex: 1, fontSize: 14, fontWeight: '700' },
    listContent: { padding: 20, paddingTop: 10 },
    resourceItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
    itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    itemIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    itemTitle: { fontSize: 15, fontWeight: '800' },
    itemCategory: { fontSize: 10, fontWeight: '900', marginTop: 2 },
    checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { padding: 60, alignItems: 'center', gap: 16 },
    emptyText: { fontSize: 14, fontWeight: '700' }
});
