import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faBullhorn, faSearch, faCalendar, faClipboardList, faChartBar, faShoppingCart, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import PollDetailsModal from './PollDetailsModal';

const ContentListModal = React.memo(({ visible, items, type, onClose }) => {
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
                style={[styles.itemCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                onPress={handlePress}
                activeOpacity={hasContent || type === 'polls' ? 0.7 : 1}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: typeInfo.color + '15' }]}>
                        <FontAwesomeIcon icon={typeInfo.icon} size={16} color={typeInfo.color} />
                    </View>
                    <View style={styles.cardContent}>
                        <View style={styles.titleRow}>
                            <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
                                {item.title || item.name || item.subject || item.question || 'Untitled Content'}
                            </Text>
                            {hasContent && (
                                <FontAwesomeIcon
                                    icon={isExpanded ? faChevronUp : faChevronDown}
                                    size={14}
                                    color={theme.colors.placeholder}
                                />
                            )}
                        </View>

                        <View style={styles.badgeRow}>
                            {item.type && (
                                <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '15' }]}>
                                    <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
                                        {item.type.toUpperCase()}
                                    </Text>
                                </View>
                            )}

                            {item.due_date && (
                                <View style={[styles.metaBadge, { backgroundColor: theme.colors.primary + '10' }]}>
                                    <Text style={[styles.metaText, { color: theme.colors.primary }]}>
                                        DUE {formatDate(item.due_date).toUpperCase()}
                                    </Text>
                                </View>
                            )}

                            {item.price && (
                                <Text style={[styles.priceText, { color: theme.colors.primary }]}>
                                    R {item.price.toFixed(2)}
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
                    <View style={[styles.iconBox, { backgroundColor: typeInfo.color + '15' }]}>
                        <FontAwesomeIcon icon={typeInfo.icon} size={18} color={typeInfo.color} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{typeInfo.title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} style={{ marginRight: 12 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder={`Search ${typeInfo.title.toLowerCase()}...`}
                        placeholderTextColor={theme.colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItemCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={typeInfo.icon} size={40} color={theme.colors.cardBorder} />
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                                {searchQuery.trim() ? 'No matches found' : `No ${typeInfo.title.toLowerCase()} available`}
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
});

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
    itemCard: {
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 36,
        height: 36,
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
        marginBottom: 6,
    },
    itemTitle: {
        fontSize: 15,
        fontWeight: '800',
        flex: 1,
        marginRight: 8,
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
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    metaBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    metaText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    priceText: {
        fontSize: 13,
        fontWeight: '900',
    },
    itemDescription: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    fullMessage: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '600',
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
    marketImage: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        marginBottom: 12,
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
});

export default ContentListModal;
