import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function StandardBottomModal({ visible, onClose, title, icon, children }) {
    const { theme } = useTheme();

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
                    {icon && <FontAwesomeIcon icon={icon} size={24} color={theme.colors.primary} style={{ marginRight: 15 }} />}
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>
                <View style={styles.contentContainer}>
                    {children}
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
        maxHeight: '90%',
        minHeight: '30%',
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
        flex: 1,
    },
    modalCloseButton: {
        padding: 5,
    },
    contentContainer: {
        paddingBottom: 20,
    },
});
