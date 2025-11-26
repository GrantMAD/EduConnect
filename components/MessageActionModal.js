import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash, faThumbtack, faReply, faCopy } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';

const MessageActionModal = ({ visible, onClose, message, isMyMessage, onEdit, onDelete, onPin, onReply, onReaction, isAdmin }) => {
    const { theme } = useTheme();

    if (!message) return null;

    const handleCopy = async () => {
        await Clipboard.setStringAsync(message.content);
        onClose();
    };

    // Check if message is editable (within 15 mins)
    const isEditable = isMyMessage && (new Date() - new Date(message.created_at) < 15 * 60 * 1000);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>

                        {/* Quick Reactions */}
                        {!message.is_deleted && (
                            <View style={styles.reactionContainer}>
                                {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={styles.reactionButton}
                                        onPress={() => { onReaction(emoji); onClose(); }}
                                    >
                                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Reply Action */}
                        {!message.is_deleted && (
                            <TouchableOpacity style={styles.option} onPress={() => { onReply(message); onClose(); }}>
                                <FontAwesomeIcon icon={faReply} size={20} color={theme.colors.text} />
                                <Text style={[styles.optionText, { color: theme.colors.text }]}>Reply</Text>
                            </TouchableOpacity>
                        )}

                        {/* Pin Action (Admins/Creators only) */}
                        {isAdmin && (
                            <TouchableOpacity style={styles.option} onPress={() => { onPin(message); onClose(); }}>
                                <FontAwesomeIcon icon={faThumbtack} size={20} color={theme.colors.text} />
                                <Text style={[styles.optionText, { color: theme.colors.text }]}>
                                    {message.is_pinned ? 'Unpin Message' : 'Pin Message'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Edit Action */}
                        {isEditable && !message.is_deleted && (
                            <TouchableOpacity style={styles.option} onPress={() => { onEdit(message); onClose(); }}>
                                <FontAwesomeIcon icon={faEdit} size={20} color={theme.colors.text} />
                                <Text style={[styles.optionText, { color: theme.colors.text }]}>Edit Message</Text>
                            </TouchableOpacity>
                        )}

                        {/* Copy Action */}
                        {!message.is_deleted && (
                            <TouchableOpacity style={styles.option} onPress={handleCopy}>
                                <FontAwesomeIcon icon={faCopy} size={20} color={theme.colors.text} />
                                <Text style={[styles.optionText, { color: theme.colors.text }]}>Copy Text</Text>
                            </TouchableOpacity>
                        )}

                        {/* Delete Action */}
                        {isEditable && !message.is_deleted && (
                            <TouchableOpacity style={styles.option} onPress={() => { onDelete(message); onClose(); }}>
                                <FontAwesomeIcon icon={faTrash} size={20} color={theme.colors.error} />
                                <Text style={[styles.optionText, { color: theme.colors.error }]}>Delete Message</Text>
                            </TouchableOpacity>
                        )}

                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 12,
        padding: 10,
        elevation: 5,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
    },
    optionText: {
        marginLeft: 15,
        fontSize: 16,
        fontWeight: '500',
    },
    reactionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        marginBottom: 5,
    },
    reactionButton: {
        padding: 5,
    },
});

export default MessageActionModal;
