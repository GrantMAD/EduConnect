import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash, faThumbtack, faReply, faCopy } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';

const MessageActionModal = React.memo(({ visible, onClose, message, isMyMessage, onEdit, onDelete, onPin, onReply, onReaction, isAdmin }) => {
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
                    <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>

                        {/* Quick Reactions */}
                        {!message.is_deleted && (
                            <View style={[styles.reactionContainer, { borderBottomColor: theme.colors.cardBorder }]}>
                                {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                                    <TouchableOpacity
                                        key={emoji}
                                        style={styles.reactionButton}
                                        onPress={() => { onReaction(emoji); onClose(); }}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={{ fontSize: 26 }}>{emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <View style={styles.optionsList}>
                            {/* Reply Action */}
                            {!message.is_deleted && (
                                <TouchableOpacity style={styles.option} onPress={() => { onReply(message); onClose(); }} activeOpacity={0.7}>
                                    <View style={[styles.optionIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <FontAwesomeIcon icon={faReply} size={14} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.optionText, { color: theme.colors.text }]}>Reply to Message</Text>
                                </TouchableOpacity>
                            )}

                            {/* Pin Action */}
                            {isAdmin && (
                                <TouchableOpacity style={styles.option} onPress={() => { onPin(message); onClose(); }} activeOpacity={0.7}>
                                    <View style={[styles.optionIconBox, { backgroundColor: '#f59e0b' + '10' }]}>
                                        <FontAwesomeIcon icon={faThumbtack} size={14} color="#f59e0b" />
                                    </View>
                                    <Text style={[styles.optionText, { color: theme.colors.text }]}>
                                        {message.is_pinned ? 'Unpin from Conversation' : 'Pin to Conversation'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {/* Edit Action */}
                            {isEditable && !message.is_deleted && (
                                <TouchableOpacity style={styles.option} onPress={() => { onEdit(message); onClose(); }} activeOpacity={0.7}>
                                    <View style={[styles.optionIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <FontAwesomeIcon icon={faEdit} size={14} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.optionText, { color: theme.colors.text }]}>Edit Content</Text>
                                </TouchableOpacity>
                            )}

                            {/* Copy Action */}
                            {!message.is_deleted && (
                                <TouchableOpacity style={styles.option} onPress={handleCopy} activeOpacity={0.7}>
                                    <View style={[styles.optionIconBox, { backgroundColor: theme.colors.placeholder + '10' }]}>
                                        <FontAwesomeIcon icon={faCopy} size={14} color={theme.colors.placeholder} />
                                    </View>
                                    <Text style={[styles.optionText, { color: theme.colors.text }]}>Copy to Clipboard</Text>
                                </TouchableOpacity>
                            )}

                            {/* Delete Action */}
                            {isEditable && !message.is_deleted && (
                                <TouchableOpacity style={styles.option} onPress={() => { onDelete(message); onClose(); }} activeOpacity={0.7}>
                                    <View style={[styles.optionIconBox, { backgroundColor: '#ef4444' + '10' }]}>
                                        <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                                    </View>
                                    <Text style={[styles.optionText, { color: '#ef4444' }]}>Delete Message</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        borderRadius: 28,
        overflow: 'hidden',
    },
    reactionContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
    },
    reactionButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsList: {
        paddingVertical: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    optionIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '700',
    },
});

export default MessageActionModal;
