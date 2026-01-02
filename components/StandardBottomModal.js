import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StandardBottomModal({ visible, onClose, title, icon, description, children, hideHeader }) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

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
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={styles.swipeIndicator} />
                {!hideHeader && (
                    <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                        {icon && (
                            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                                <FontAwesomeIcon icon={icon} size={18} color={theme.colors.primary} />
                            </View>
                        )}
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                            <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                        </TouchableOpacity>
                    </View>
                )}
                {description && (
                    <Text style={[styles.description, { color: theme.colors.placeholder }]}>{description}</Text>
                )}
                <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                    {children}
                </ScrollView>
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
        maxHeight: '90%',
        minHeight: '30%',
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
        marginBottom: 20,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
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
    description: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
        marginBottom: 16,
    },
    contentContainer: {
        paddingBottom: 20,
    },
});
