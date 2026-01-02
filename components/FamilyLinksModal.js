import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUserFriends, faChild, faUser } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';

export default function FamilyLinksModal({ visible, onClose }) {
    const { theme } = useTheme();
    const { schoolId } = useSchool();
    const [loading, setLoading] = useState(true);
    const [groupedFamilies, setGroupedFamilies] = useState([]);

    useEffect(() => {
        if (visible) {
            fetchFamilyLinks();
        }
    }, [visible]);

    const fetchFamilyLinks = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('parent_child_relationships')
                .select(`
                    id,
                    parent:users!parent_id(id, full_name, email, avatar_url),
                    child:users!child_id(id, full_name, email, avatar_url)
                `)
                .eq('parent.school_id', schoolId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Group children by parent
            const grouped = {};
            (data || []).forEach(link => {
                const parentId = link.parent?.id;
                if (!parentId) return;

                if (!grouped[parentId]) {
                    grouped[parentId] = {
                        parent: link.parent,
                        children: []
                    };
                }
                if (link.child) {
                    grouped[parentId].children.push(link.child);
                }
            });

            // Convert to array
            const familiesArray = Object.values(grouped);
            setGroupedFamilies(familiesArray);
        } catch (error) {
            console.error('Error fetching family links:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderFamilyGroup = ({ item }) => (
        <View style={[styles.familyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            {/* Parent Section */}
            <View style={styles.parentSection}>
                <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                    <FontAwesomeIcon icon={faUser} size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.personInfo}>
                    <Text style={[styles.roleLabel, { color: theme.colors.placeholder }]}>PARENT</Text>
                    <Text style={[styles.personName, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.parent?.full_name || 'Unknown'}
                    </Text>
                    <Text style={[styles.personEmail, { color: theme.colors.placeholder }]} numberOfLines={1}>
                        {item.parent?.email || ''}
                    </Text>
                </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

            {/* Children Section */}
            <View style={styles.childrenSection}>
                <View style={styles.childrenHeader}>
                    <FontAwesomeIcon icon={faChild} size={12} color={theme.colors.placeholder} />
                    <Text style={[styles.childrenLabel, { color: theme.colors.placeholder }]}>
                        CHILDREN ({item.children.length})
                    </Text>
                </View>

                {item.children.map((child, index) => (
                    <View
                        key={child.id}
                        style={[
                            styles.childRow,
                            index !== item.children.length - 1 && styles.childRowBorder,
                            { borderBottomColor: theme.colors.cardBorder }
                        ]}
                    >
                        <View style={[styles.childIconBox, { backgroundColor: '#FF9500' + '15' }]}>
                            <FontAwesomeIcon icon={faChild} size={14} color="#FF9500" />
                        </View>
                        <View style={styles.childInfo}>
                            <Text style={[styles.childName, { color: theme.colors.text }]} numberOfLines={1}>
                                {child.full_name || 'Unknown'}
                            </Text>
                            <Text style={[styles.childEmail, { color: theme.colors.placeholder }]} numberOfLines={1}>
                                {child.email || ''}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            style={styles.modal}
            animationIn="slideInUp"
            animationOut="slideOutDown"
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.swipeIndicator} />

                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.headerIconBox, { backgroundColor: '#AF52DE' + '15' }]}>
                        <FontAwesomeIcon icon={faUserFriends} size={18} color="#AF52DE" />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Family Links</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={groupedFamilies}
                        renderItem={renderFamilyGroup}
                        keyExtractor={(item) => item.parent.id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <FontAwesomeIcon icon={faUserFriends} size={48} color={theme.colors.placeholder} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                                    No family links found
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 8,
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
        marginBottom: 20,
    },
    headerIconBox: {
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
    },
    closeButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    familyCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    parentSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    personInfo: {
        flex: 1,
    },
    roleLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginBottom: 3,
    },
    personName: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    personEmail: {
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        marginVertical: 16,
    },
    childrenSection: {
        gap: 8,
    },
    childrenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    childrenLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    childRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    childRowBorder: {
        borderBottomWidth: 1,
    },
    childIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    childInfo: {
        flex: 1,
    },
    childName: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    childEmail: {
        fontSize: 11,
        fontWeight: '500',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '600',
    },
});
