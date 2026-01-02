import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faFileContract } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function TermsOfServiceModal({ visible, onClose }) {
    const { theme } = useTheme();

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
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: 40 }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faFileContract} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Legal Agreement</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
                    <View style={styles.contentContainer}>
                        <View style={[styles.updateBadge, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <Text style={[styles.lastUpdated, { color: theme.colors.placeholder }]}>
                                EFFECTIVE JANUARY 1, 2026
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. TERMS OF USE</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.text }]}>
                                By accessing and using ClassConnect, you accept and agree to be bound by the terms and provisions of this agreement.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. USER CONDUCT</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.text }]}>
                                Permission is granted for personal, non-commercial use. Users are prohibited from:
                            </Text>
                            <View style={styles.bulletList}>
                                <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Reverse engineering system architecture</Text>
                                <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Unauthorized data extraction</Text>
                                <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Harassment or misuse of platform tools</Text>
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. ACCOUNT RESPONSIBILITY</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.text }]}>
                                You are responsible for maintaining the absolute confidentiality of your credentials and for all activities that occur under your session.
                            </Text>
                        </View>
                    </View>
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
        maxHeight: '85%',
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
    updateBadge: {
        alignSelf: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 32,
    },
    lastUpdated: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 12,
        letterSpacing: 1,
    },
    sectionText: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '600',
    },
    bulletList: {
        marginTop: 12,
        gap: 8,
    },
    bulletPoint: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 8,
    },
    divider: {
        height: 1,
        marginVertical: 24,
    },
});
