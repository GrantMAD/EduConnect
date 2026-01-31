import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarAlt, faClock, faPlus, faTrash, faTimes } from '@fortawesome/free-solid-svg-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const TimetableManager = ({ schedules, onSchedulesChange }) => {
    const { theme } = useTheme();
    const { showToast } = useToast();

    // Helper to get default times
    const getDefaultTimes = () => {
        const now = new Date();
        const startTime = new Date(now);
        startTime.setHours(9, 0, 0, 0); // Default to 9:00 AM

        const endTime = new Date(now);
        endTime.setHours(10, 30, 0, 0); // Default to 10:30 AM

        return { startTime, endTime };
    };

    const [isAddingSchedule, setIsAddingSchedule] = useState(false);
    const defaultTimes = getDefaultTimes();
    const [newSession, setNewSession] = useState({
        date: new Date(),
        startTime: defaultTimes.startTime,
        endTime: defaultTimes.endTime,
        info: ''
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const handleAddSchedule = () => {
        if (!newSession.info.trim()) {
            showToast('Please enter a lesson topic', 'error');
            return;
        }

        // Validate end time is after start time
        if (newSession.endTime <= newSession.startTime) {
            showToast('End time must be after start time', 'error');
            return;
        }

        // Combine the selected date with the selected times
        const finalStartTime = new Date(newSession.date);
        finalStartTime.setHours(newSession.startTime.getHours(), newSession.startTime.getMinutes(), 0, 0);

        const finalEndTime = new Date(newSession.date);
        finalEndTime.setHours(newSession.endTime.getHours(), newSession.endTime.getMinutes(), 0, 0);

        const schedule = {
            date: newSession.date.toISOString().split('T')[0],
            startTime: finalStartTime,
            endTime: finalEndTime,
            info: newSession.info
        };

        onSchedulesChange([...schedules, schedule]);

        // Reset form with new default times
        const resetTimes = getDefaultTimes();
        setNewSession({
            date: new Date(),
            startTime: resetTimes.startTime,
            endTime: resetTimes.endTime,
            info: ''
        });
        setIsAddingSchedule(false);
        showToast('Session added successfully', 'success');
    };

    const handleRemoveSchedule = (index) => {
        const updated = schedules.filter((_, i) => i !== index);
        onSchedulesChange(updated);
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}`;
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#10b981" />
                    <Text style={styles.headerTitle}>CLASS TIMETABLE</Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        { backgroundColor: isAddingSchedule ? '#fee2e2' : '#10b981' }
                    ]}
                    onPress={() => setIsAddingSchedule(!isAddingSchedule)}
                >
                    <Text style={[
                        styles.toggleButtonText,
                        { color: isAddingSchedule ? '#ef4444' : '#fff' }
                    ]}>
                        {isAddingSchedule ? 'CANCEL' : 'NEW SESSION'}
                    </Text>
                </TouchableOpacity>
            </View>

            {isAddingSchedule && (
                <View style={[styles.addForm, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}>
                    <Text style={styles.formLabel}>EVENT DATE</Text>
                    <TouchableOpacity
                        style={[styles.dateButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <FontAwesomeIcon icon={faCalendarAlt} size={14} color={theme.colors.primary} />
                        <Text style={[styles.dateButtonText, { color: theme.colors.text }]}>
                            {newSession.date.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={newSession.date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(Platform.OS === 'ios');
                                if (selectedDate) {
                                    setNewSession({ ...newSession, date: selectedDate });
                                }
                            }}
                        />
                    )}

                    <View style={styles.timeRow}>
                        <View style={styles.timeColumn}>
                            <Text style={styles.formLabel}>STARTS AT</Text>
                            <TouchableOpacity
                                style={[styles.timeButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                                onPress={() => setShowStartTimePicker(true)}
                            >
                                <FontAwesomeIcon icon={faClock} size={14} color={theme.colors.primary} />
                                <Text style={[styles.timeButtonText, { color: theme.colors.text }]}>
                                    {formatTime(newSession.startTime)}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.timeColumn}>
                            <Text style={styles.formLabel}>ENDS AT</Text>
                            <TouchableOpacity
                                style={[styles.timeButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                                onPress={() => setShowEndTimePicker(true)}
                            >
                                <FontAwesomeIcon icon={faClock} size={14} color={theme.colors.primary} />
                                <Text style={[styles.timeButtonText, { color: theme.colors.text }]}>
                                    {formatTime(newSession.endTime)}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showStartTimePicker && (
                        <DateTimePicker
                            value={newSession.startTime}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedTime) => {
                                setShowStartTimePicker(Platform.OS === 'ios');
                                if (selectedTime) {
                                    setNewSession({ ...newSession, startTime: selectedTime });
                                }
                            }}
                        />
                    )}

                    {showEndTimePicker && (
                        <DateTimePicker
                            value={newSession.endTime}
                            mode="time"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, selectedTime) => {
                                setShowEndTimePicker(Platform.OS === 'ios');
                                if (selectedTime) {
                                    setNewSession({ ...newSession, endTime: selectedTime });
                                }
                            }}
                        />
                    )}

                    <Text style={styles.formLabel}>LESSON TOPIC</Text>
                    <TextInput
                        style={[styles.topicInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                        placeholder="e.g. Algebra Introduction"
                        placeholderTextColor={theme.colors.placeholder}
                        value={newSession.info}
                        onChangeText={(text) => setNewSession({ ...newSession, info: text })}
                    />

                    <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={handleAddSchedule}
                    >
                        <FontAwesomeIcon icon={faPlus} size={14} color="#fff" />
                        <Text style={styles.confirmButtonText}>CONFIRM SESSION</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView style={styles.scheduleList} showsVerticalScrollIndicator={false}>
                {schedules.length === 0 ? (
                    <View style={styles.emptyState}>
                        <FontAwesomeIcon icon={faClock} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                        <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>
                            NO SESSIONS SCHEDULED
                        </Text>
                    </View>
                ) : (
                    schedules.map((schedule, index) => (
                        <View
                            key={index}
                            style={[styles.scheduleItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                        >
                            <View style={styles.scheduleLeft}>
                                <View style={styles.dateBadge}>
                                    <Text style={styles.dateMonth}>
                                        {formatDate(schedule.date).split(' ')[0].toUpperCase()}
                                    </Text>
                                    <Text style={styles.dateDay}>
                                        {formatDate(schedule.date).split(' ')[1]}
                                    </Text>
                                </View>
                                <View style={styles.scheduleInfo}>
                                    <Text style={[styles.scheduleTime, { color: theme.colors.text }]}>
                                        {formatTime(schedule.startTime)} — {formatTime(schedule.endTime)}
                                    </Text>
                                    <Text style={[styles.scheduleInfoText, { color: theme.colors.placeholder }]} numberOfLines={1}>
                                        {schedule.info || 'Academic Session'}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleRemoveSchedule(index)}
                            >
                                <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 1.5,
    },
    toggleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    toggleButtonText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    addForm: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#10b981',
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 12,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    dateButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    timeRow: {
        flexDirection: 'row',
        gap: 12,
    },
    timeColumn: {
        flex: 1,
    },
    timeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    timeButtonText: {
        fontSize: 14,
        fontWeight: '700',
    },
    topicInput: {
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    confirmButton: {
        backgroundColor: '#10b981',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
        borderRadius: 16,
        marginTop: 16,
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scheduleList: {
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scheduleItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
    },
    scheduleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dateBadge: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    dateMonth: {
        fontSize: 8,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 0.5,
    },
    dateDay: {
        fontSize: 16,
        fontWeight: '900',
        color: '#fff',
    },
    scheduleInfo: {
        flex: 1,
    },
    scheduleTime: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 2,
    },
    scheduleInfoText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    deleteButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#fee2e2',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default TimetableManager;
