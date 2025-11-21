import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faBullhorn, faSearch, faCalendar, faClipboardList, faChartBar, faShoppingCart, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import PollDetailsModal from './PollDetailsModal';

export default function ContentListModal({ visible, items, type, onClose }) {
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItems, setExpandedItems] = useState({});
    const [selectedPoll, setSelectedPoll] = useState(null);
    const [showPollDetails, setShowPollDetails] = useState(false);

    if (!items) return null;

    const toggleItem = (itemId) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const getTypeInfo = () => {
        switch (type) {
            case 'announcements':
                return { title: 'Announcements', icon: faBullhorn, color: '#FF3B30' };
            case 'homework':
                return { title: 'Homework', icon: faClipboardList, color: '#34C759' };
            case 'assignments':
                return { title: 'Assignments', icon: faCalendar, color: '#5856D6' };
            case 'polls':
                return { title: 'Polls', icon: faChartBar, color: '#FF9500' };
            case 'market':
                return { title: 'Market Items', icon: faShoppingCart, color: '#32ADE6' };
            default:
                return { title: 'Items', icon: faBullhorn, color: '#007AFF' };
        }
    };

    const typeInfo = getTypeInfo();

    // Filter items based on search query
    const filteredItems = items.filter(item => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const title = (item.title || item.name || item.subject || item.question || '').toLowerCase();
        const description = (item.description || item.message || '').toLowerCase();
        return title.includes(query) || description.includes(query);
    });

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderItemCard = ({ item }) => {
        const isExpanded = expandedItems[item.id];
        const hasContent = item.message || item.description || (type === 'market' && item.image_url);

        const handlePress = () => {
            if (type === 'polls') {
                setSelectedPoll(item);
                setShowPollDetails(true);
            } else if (hasContent) {
                toggleItem(item.id);
            }
        };

        return (
            <TouchableOpacity
                style={[styles.itemCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}
                onPress={handlePress}
                activeOpacity={hasContent || type === 'polls' ? 0.7 : 1}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: typeInfo.color + '20' }]}>
                        <FontAwesomeIcon icon={typeInfo.icon} size={18} color={typeInfo.color} />
                    </View>
                    <View style={styles.cardContent}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                                {item.title || item.name || item.subject || item.question || 'Untitled'}
                            </Text>
                            {hasContent && (
                                <FontAwesomeIcon
                                    icon={isExpanded ? faChevronUp : faChevronDown}
                                    size={16}
                                    color={theme.colors.placeholder}
                                    style={{ marginLeft: 8 }}
                                />
                            )}
                        </View>

                        <View style={styles.badgeRow}>
                            {item.type && (
                                <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
                                    <Text style={styles.typeBadgeText}>
                                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                    </Text>
                                </View>
                            )}

                            {item.due_date && (
                                <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                    Due: {formatDate(item.due_date)}
                                </Text>
                            )}
                            {item.created_at && !item.due_date && (
                                <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                    {formatDate(item.created_at)}
                                </Text>
                            )}
                            {item.end_date && (
                                <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                    Ends: {formatDate(item.end_date)}
                                </Text>
                            )}
                            {item.price && (
                                <Text style={[styles.metaText, { color: theme.colors.primary, fontWeight: '600' }]}>
                                    R {item.price}
                                </Text>
                            )}
                        </View>



                        {!isExpanded && hasContent && (
                            <Text style={[styles.itemDescription, { color: theme.colors.placeholder }]} numberOfLines={2}>
                                {item.message || item.description}
                            </Text>
                        )}
                    </View>
                </View>

                {isExpanded && hasContent && (
                    <View style={styles.expandedContent}>
                        {type === 'market' && item.image_url && (
                            <Image
                                source={{ uri: item.image_url }}
                                style={styles.marketImage}
                                resizeMode="cover"
                            />
                        )}
                        <Text style={[styles.fullMessage, { color: theme.colors.text }]}>
                            {item.message || item.description}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

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
                    <FontAwesomeIcon icon={typeInfo.icon} size={24} color={typeInfo.color} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{typeInfo.title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.placeholder} style={{ marginRight: 10 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Search..."
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
                        {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                        {searchQuery.trim() && ` (filtered from ${items.length})`}
                    </Text>
                </View>

                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItemCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={typeInfo.icon} size={48} color={theme.colors.placeholder} />
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                                {searchQuery.trim() ? 'No items match your search' : 'No items found'}
                            </Text>
                        </View>
                    }
                />
            </View>

            <PollDetailsModal
                visible={showPollDetails}
                poll={selectedPoll}
                onClose={() => setShowPollDetails(false)}
            />
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
    itemCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    typeBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    metaText: {
        fontSize: 12,
    },
    itemDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    expandedContent: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    fullMessage: {
        fontSize: 14,
        lineHeight: 22,
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
    marketImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 8,
        marginTop: 4,
    },
});
