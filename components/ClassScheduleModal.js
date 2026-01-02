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
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.4}
            style={{ justifyContent: 'flex-end', margin: 0 }}
            avoidKeyboard={true}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: 40 }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faCalendarAlt} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Schedule Class</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <View style={[styles.dateLabel, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.dateText, { color: theme.colors.text }]}>
                            {selectedDate?.toUpperCase()}
                        </Text>
                    </View>

                    <Text style={[styles.sectionLabel, { color: '#94a3b8' }]}>TIMING</Text>
                    <View style={styles.timeInputRow}>
                        <View style={styles.timeInputGroup}>
                            <Text style={[styles.timeInputLabel, { color: theme.colors.placeholder }]}>START</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
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
                            <Text style={[styles.timeInputLabel, { color: theme.colors.placeholder }]}>END</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
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

                    <Text style={[styles.sectionLabel, { color: '#94a3b8' }]}>CLASS DETAILS</Text>
                    <View style={[styles.infoInputWrapper, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                        <TextInput
                            style={[styles.infoInput, { color: theme.colors.text }]}
                            placeholder="Enter room number, required materials, or other instructions..."
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
                        activeOpacity={0.8}
                    >
                        <Text style={styles.saveButtonText}>CONFIRM SCHEDULE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
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
        marginBottom: 24,
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
    contentContainer: {
        paddingBottom: 20,
    },
    dateLabel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignSelf: 'center',
        marginBottom: 24,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 12,
        letterSpacing: 1.5,
    },
    timeInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    timeInputGroup: {
        flex: 1,
    },
    timeInputLabel: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    inputWrapper: {
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 56,
        justifyContent: 'center',
    },
    timeInput: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
    },
    timeSeparator: {
        fontSize: 24,
        fontWeight: '300',
        marginHorizontal: 16,
        marginTop: 18,
    },
    infoInputWrapper: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 32,
        height: 120,
    },
    infoInput: {
        fontSize: 14,
        fontWeight: '600',
        height: '100%',
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1,
    },
});
