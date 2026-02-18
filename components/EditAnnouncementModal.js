import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEdit, faSave } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const EditAnnouncementModal = React.memo(({ visible, announcement, onClose, onSave }) => {
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
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            propagateSwipe={true}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.4}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: 40, maxHeight: '90%' }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faEdit} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Edit Announcement</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: '#94a3b8' }]}>TITLE</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.card,
                                    color: theme.colors.text,
                                    borderColor: theme.colors.cardBorder,
                                    borderWidth: 1
                                }]}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Announcement Title"
                                placeholderTextColor={theme.colors.placeholder}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: '#94a3b8' }]}>MESSAGE CONTENT</Text>
                            <TextInput
                                style={[styles.input, styles.messageInput, {
                                    backgroundColor: theme.colors.card,
                                    color: theme.colors.text,
                                    borderColor: theme.colors.cardBorder,
                                    borderWidth: 1
                                }]}
                                value={message}
                                onChangeText={setMessage}
                                placeholder="Type your message here..."
                                placeholderTextColor={theme.colors.placeholder}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.saveButtonText}>CONFIRM UPDATES</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
});

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
        letterSpacing: -0.5,
        flex: 1,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        paddingBottom: 10,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 1.5,
    },
    input: {
        borderRadius: 16,
        padding: 16,
        fontSize: 15,
        fontWeight: '700',
    },
    messageInput: {
        minHeight: 140,
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 13,
        letterSpacing: 1,
    },
});

export default EditAnnouncementModal;
