import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function ConfirmationModal({ 
    visible, 
    onClose, 
    onConfirm, 
    title = "Confirm Action", 
    message = "Are you sure you want to proceed?", 
    confirmText = "Confirm", 
    cancelText = "Cancel",
    type = "danger", // "danger" or "primary"
    isLoading = false 
}) {
    const { theme } = useTheme();

    const isDanger = type === 'danger';
    const accentColor = isDanger ? '#FF3B30' : theme.colors.primary;

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={isLoading ? null : onClose}
            animationIn="zoomIn"
            animationOut="zoomOut"
            backdropOpacity={0.5}
            useNativeDriver
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: isDanger ? 'rgba(255, 59, 48, 0.1)' : 'rgba(0, 122, 255, 0.1)' }]}>
                        <FontAwesomeIcon icon={faExclamationTriangle} size={30} color={accentColor} />
                    </View>
                    {!isLoading && (
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
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
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.button, styles.cancelButton, { borderColor: theme.colors.cardBorder }]} 
                        onPress={onClose}
                        disabled={isLoading}
                    >
                        <Text style={[styles.cancelText, { color: theme.colors.text }]}>{cancelText}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            </div>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContent: {
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: -10,
        top: -10,
        padding: 10,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmButton: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    confirmText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
