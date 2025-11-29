import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEdit, faSave } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function EditAnnouncementModal({ visible, announcement, onClose, onSave }) {
    const { theme } = useTheme();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (announcement) {
            setTitle(announcement.title);
            setMessage(announcement.message);
        }
    }, [announcement]);

    const handleSave = async () => {
        if (!title.trim() || !message.trim()) return;

        setLoading(true);
        try {
            await onSave(announcement.id, title, message);
            onClose();
        } catch (error) {
            console.error("Error saving announcement:", error);
        } finally {
            setLoading(false);
        }
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
                    <FontAwesomeIcon icon={faEdit} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Edit Announcement</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <View style={styles.contentContainer}>
                    <Text style={[styles.label, { color: theme.colors.text }]}>Title</Text>
                    <TextInput
                        style={[styles.input, {
                            backgroundColor: theme.colors.inputBackground,
                            color: theme.colors.text,
                            borderColor: theme.colors.cardBorder
                        }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Announcement Title"
                        placeholderTextColor={theme.colors.placeholder}
                    />

                    <Text style={[styles.label, { color: theme.colors.text }]}>Message</Text>
                    <TextInput
                        style={[styles.input, styles.messageInput, {
                            backgroundColor: theme.colors.inputBackground,
                            color: theme.colors.text,
                            borderColor: theme.colors.cardBorder
                        }]}
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Announcement Message"
                        placeholderTextColor={theme.colors.placeholder}
                        multiline
                        textAlignVertical="top"
                    />

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} size={16} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </>
                        )}
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
        paddingBottom: 10,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        fontSize: 16,
    },
    messageInput: {
        minHeight: 120,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        marginTop: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
