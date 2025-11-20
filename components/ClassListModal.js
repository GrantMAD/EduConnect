import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faBookOpen, faSearch, faClock, faInfoCircle, faAlignLeft, faCalendarAlt, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function ClassListModal({ visible, classes, onClose }) {
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
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faBookOpen} size={24} color="#007AFF" />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Classes</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faSearch} size={16} color={theme.colors.placeholder} style={{ marginRight: 10 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.text }]}
                        placeholder="Search classes..."
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
                        {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'}
                        {searchQuery.trim() && ` (filtered from ${classes.length})`}
                    </Text>
                </View>

                <FlatList
                    data={filteredClasses}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderClassCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <FontAwesomeIcon icon={faBookOpen} size={48} color={theme.colors.placeholder} />
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                                {searchQuery.trim() ? 'No classes match your search' : 'No classes found'}
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
    classCard: {
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
        marginBottom: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTextContainer: {
        flex: 1,
    },
    className: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    scheduleCount: {
        fontSize: 13,
        fontWeight: '500',
    },
    schedulesContainer: {
        gap: 8,
    },
    scheduleItem: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
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
        marginBottom: 8,
    },
    scheduleTitle: {
        fontSize: 15,
        fontWeight: '600',
        flex: 1,
    },
    scheduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
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
        fontSize: 11,
        fontWeight: '700',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    expandedContent: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    scheduleInfoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    scheduleInfoText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    noSchedulesText: {
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 8,
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
