import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faBookOpen, faSearch, faClock, faInfoCircle, faAlignLeft, faCalendarAlt, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const ClassListModal = React.memo(({ visible, classes, onClose }) => {
    const { theme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSchedules, setExpandedSchedules] = useState({});

    if (!classes) return null;

    const toggleSchedule = (scheduleId) => {
        setExpandedSchedules(prev => ({
            ...prev,
            [scheduleId]: !prev[scheduleId]
        }));
    };

    // Filter classes based on search query
    const filteredClasses = classes.filter(cls => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const name = (cls.name || '').toLowerCase();

        // Also search in schedules
        const schedulesMatch = cls.schedules?.some(schedule => {
            const title = (schedule.title || '').toLowerCase();
            const description = (schedule.description || '').toLowerCase();
            const classInfo = (schedule.class_info || '').toLowerCase();
            return title.includes(query) || description.includes(query) || classInfo.includes(query);
        });

        return name.includes(query) || schedulesMatch;
    });

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return { date: dateStr, time: timeStr };
    };

    const renderScheduleItem = (schedule) => {
        const startInfo = formatDateTime(schedule.start_time);
        const endInfo = formatDateTime(schedule.end_time);
        const isExpanded = expandedSchedules[schedule.id];
        const hasExpandableContent = schedule.description || schedule.class_info;

        return (
            <TouchableOpacity
                key={schedule.id}
                style={[styles.scheduleItem, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}
                onPress={() => hasExpandableContent && toggleSchedule(schedule.id)}
                activeOpacity={hasExpandableContent ? 0.7 : 1}
            >
                <View style={styles.scheduleMainContent}>
                    <View style={styles.scheduleLeft}>
                        {schedule.title && (
                            <View style={styles.scheduleTitleRow}>
                                <FontAwesomeIcon icon={faBookOpen} size={14} color="#007AFF" style={{ marginRight: 8 }} />
                                <Text style={[styles.scheduleTitle, { color: theme.colors.text }]} numberOfLines={1}>
                                    {schedule.title}
                                </Text>
                            </View>
                        )}

                        <View style={styles.scheduleHeader}>
                            {schedule.start_time && (
                                <View style={[styles.dateBadge, { backgroundColor: '#007AFF' }]}>
                                    <FontAwesomeIcon icon={faCalendarAlt} size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
                                    <Text style={styles.dateBadgeText}>{startInfo.date}</Text>
                                </View>
                            )}
                            {schedule.start_time && (
                                <View style={styles.timeRow}>
                                    <FontAwesomeIcon icon={faClock} size={12} color={theme.colors.primary} style={{ marginRight: 4 }} />
                                    <Text style={[styles.timeText, { color: theme.colors.primary }]}>
                                        {startInfo.time}
                                        {schedule.end_time && ` - ${endInfo.time}`}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {hasExpandableContent && (
                        <FontAwesomeIcon
                            icon={isExpanded ? faChevronUp : faChevronDown}
                            size={16}
                            color={theme.colors.placeholder}
                            style={{ marginLeft: 8 }}
                        />
                    )}
                </View>

                {isExpanded && hasExpandableContent && (
                    <View style={styles.expandedContent}>
                        {schedule.description && (
                            <View style={styles.scheduleInfoRow}>
                                <FontAwesomeIcon icon={faAlignLeft} size={12} color={theme.colors.placeholder} style={{ marginRight: 6 }} />
                                <Text style={[styles.scheduleInfoText, { color: theme.colors.placeholder }]}>
                                    {schedule.description}
                                </Text>
                            </View>
                        )}

                        {schedule.class_info && (
                            <View style={styles.scheduleInfoRow}>
                                <FontAwesomeIcon icon={faInfoCircle} size={12} color={theme.colors.primary} style={{ marginRight: 6 }} />
                                <Text style={[styles.scheduleInfoText, { color: theme.colors.text }]}>
                                    {schedule.class_info}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderClassCard = ({ item }) => (
        <View style={[styles.classCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: '#007AFF' + '20' }]}>
                    <FontAwesomeIcon icon={faBookOpen} size={20} color="#007AFF" />
                </View>
                <View style={styles.headerTextContainer}>
                    <Text style={[styles.className, { color: theme.colors.text }]}>{item.name}</Text>
                    {item.schedules && item.schedules.length > 0 && (
                        <Text style={[styles.scheduleCount, { color: theme.colors.placeholder }]}>
                            {item.schedules.length} {item.schedules.length === 1 ? 'session' : 'sessions'}
                        </Text>
                    )}
                </View>
            </View>

            {item.schedules && item.schedules.length > 0 && (
                <View style={styles.schedulesContainer}>
                    {item.schedules.map(schedule => renderScheduleItem(schedule))}
                </View>
            )}

            {(!item.schedules || item.schedules.length === 0) && (
                <Text style={[styles.noSchedulesText, { color: theme.colors.placeholder }]}>
                    No scheduled sessions for this class
                </Text>
            )}
        </View>
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
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faBookOpen} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Classes</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} style={{ marginRight: 12 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Search your classes..."
                        placeholderTextColor={theme.colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                <FlatList
                    data={filteredClasses}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderClassCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={faBookOpen} size={40} color={theme.colors.cardBorder} />
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                                {searchQuery.trim() ? 'No matching classes found' : 'You have no classes yet'}
                            </Text>
                        </View>
                    }
                />
            </View>
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
        marginBottom: 8,
        borderRadius: 16,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    listContainer: {
        paddingTop: 16,
        paddingBottom: 40,
    },
    classCard: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTextContainer: {
        flex: 1,
    },
    className: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    scheduleCount: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    schedulesContainer: {
        gap: 8,
    },
    scheduleItem: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    scheduleMainContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scheduleLeft: {
        flex: 1,
    },
    scheduleTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    scheduleTitle: {
        fontSize: 14,
        fontWeight: '800',
        flex: 1,
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    dateBadgeText: {
        color: '#FFFFFF',
        fontSize: 9,
        fontWeight: '900',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    expandedContent: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    scheduleInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    scheduleInfoText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
    },
    noSchedulesText: {
        fontSize: 13,
        fontWeight: '600',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 12,
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

export default ClassListModal;