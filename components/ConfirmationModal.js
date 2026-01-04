import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const ConfirmationModal = React.memo(({
    visible,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = "danger", // "danger" or "primary"
    isLoading = false
}) => {
    const { theme } = useTheme();

    const isDanger = type === 'danger';
    const accentColor = isDanger ? '#FF3B30' : theme.colors.primary;

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={isLoading ? null : onClose}
            animationIn="zoomIn"
            animationOut="zoomOut"
            backdropOpacity={0.4}
            useNativeDriver
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: accentColor + '15' }]}>
                        <FontAwesomeIcon icon={faExclamationTriangle} size={28} color={accentColor} />
                    </View>
                    {!isLoading && (
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
                    <Text style={[styles.message, { color: theme.colors.placeholder }]}>{message}</Text>
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button, styles.confirmButton, { backgroundColor: accentColor }]}
                        onPress={onConfirm}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.confirmText}>{confirmText.toUpperCase()}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.cancelButton, { borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                        onPress={onClose}
                        disabled={isLoading}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.cancelText, { color: theme.colors.text }]}>{cancelText.toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalContent: {
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
    },
    iconContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: -8,
        top: -8,
        padding: 8,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '600',
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButton: {
        elevation: 0,
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cancelButton: {
        backgroundColor: 'transparent',
    },
    cancelText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default ConfirmationModal;
