import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faClock, faCalendarAlt, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function ClassScheduleModal({ visible, onClose, selectedDate, onSave }) {
    const { theme } = useTheme();
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [info, setInfo] = useState('');

    useEffect(() => {
        if (visible) {
            setStartTime('');
            setEndTime('');
            setInfo('');
        }
    }, [visible]);

    const handleTimeChange = (text, isStart) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        let newText = cleaned;
        if (cleaned.length > 2) {
            newText = cleaned.slice(0, 2) + ':' + cleaned.slice(2, 4);
        }

        if (isStart) {
            setStartTime(newText);
        } else {
            setEndTime(newText);
        }
    };

    const handleSave = () => {
        onSave(startTime, endTime, info);
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
            avoidKeyboard={true}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faCalendarAlt} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Schedule Class</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <Text style={[styles.dateText, { color: theme.colors.text }]}>
                        {selectedDate}
                    </Text>

                    <Text style={[styles.sectionLabel, { color: theme.colors.placeholder }]}>Time</Text>
                    <View style={styles.timeInputRow}>
                        <View style={styles.timeInputGroup}>
                            <Text style={[styles.timeInputLabel, { color: theme.colors.placeholder }]}>Start</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                                <TextInput
                                    style={[styles.timeInput, { color: theme.colors.text }]}
                                    placeholder="10:00"
                                    placeholderTextColor={theme.colors.placeholder}
                                    keyboardType="numeric"
                                    maxLength={5}
                                    value={startTime}
                                    onChangeText={(text) => handleTimeChange(text, true)}
                                />
                            </View>
                        </View>

                        <Text style={[styles.timeSeparator, { color: theme.colors.placeholder }]}>-</Text>

                        <View style={styles.timeInputGroup}>
                            <Text style={[styles.timeInputLabel, { color: theme.colors.placeholder }]}>End</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                                <TextInput
                                    style={[styles.timeInput, { color: theme.colors.text }]}
                                    placeholder="11:00"
                                    placeholderTextColor={theme.colors.placeholder}
                                    keyboardType="numeric"
                                    maxLength={5}
                                    value={endTime}
                                    onChangeText={(text) => handleTimeChange(text, false)}
                                />
                            </View>
                        </View>
                    </View>

                    <Text style={[styles.sectionLabel, { color: theme.colors.placeholder }]}>Details</Text>
                    <View style={[styles.infoInputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
                        <TextInput
                            style={[styles.infoInput, { color: theme.colors.text }]}
                            placeholder="Enter class information (e.g., Room 304, Bring textbook)..."
                            placeholderTextColor={theme.colors.placeholder}
                            value={info}
                            onChangeText={setInfo}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSave}
                    >
                        <FontAwesomeIcon icon={faCheck} size={16} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.saveButtonText}>Add to Schedule</Text>
                    </TouchableOpacity>
                </View>
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
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        marginBottom: 20,
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
    contentContainer: {
        paddingBottom: 20,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    timeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    timeInputGroup: {
        flex: 1,
    },
    timeInputLabel: {
        fontSize: 12,
        marginBottom: 5,
        textAlign: 'center',
    },
    inputWrapper: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    timeInput: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
    },
    timeSeparator: {
        fontSize: 24,
        fontWeight: '300',
        marginHorizontal: 15,
        marginTop: 15,
    },
    infoInputWrapper: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 15,
        marginBottom: 25,
        height: 120,
    },
    infoInput: {
        fontSize: 16,
        height: '100%',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
