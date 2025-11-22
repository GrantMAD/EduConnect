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
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faFileContract} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Terms of Service</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>
                        <Text style={[styles.lastUpdated, { color: theme.colors.placeholder }]}>
                            Last Updated: January 1, 2025
                        </Text>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Acceptance of Terms</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                By accessing and using ClassConnect, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our service.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. Use License</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                Permission is granted to temporarily access ClassConnect for personal, non-commercial use only. This is the grant of a license, not a transfer of title, and under this license you may not:
                            </Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Modify or copy the materials</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Use the materials for any commercial purpose</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Attempt to decompile or reverse engineer any software</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Remove any copyright or proprietary notations</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. User Accounts</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. User Content</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                Users may post, upload, or submit content to ClassConnect. You retain all rights to your content, but grant us a license to use, display, and distribute your content within the platform.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>5. Prohibited Activities</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                You agree not to engage in any of the following prohibited activities:
                            </Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Violating laws or regulations</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Harassing, abusing, or harming other users</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Impersonating others</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Distributing malware or harmful code</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>6. Termination</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We may terminate or suspend your account immediately, without prior notice, for any reason, including breach of these Terms.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>7. Limitation of Liability</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                ClassConnect shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>8. Changes to Terms</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We reserve the right to modify these terms at any time. We will notify users of any changes by updating the "Last Updated" date.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>9. Contact Information</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                If you have any questions about these Terms, please contact us at support@classconnect.com.
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
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        minHeight: '50%',
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
        marginLeft: 15,
        flex: 1,
    },
    modalCloseButton: {
        padding: 5,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    lastUpdated: {
        fontSize: 13,
        fontStyle: 'italic',
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 10,
    },
    sectionText: {
        fontSize: 14,
        lineHeight: 22,
    },
    bulletPoint: {
        fontSize: 14,
        lineHeight: 22,
        marginLeft: 10,
        marginTop: 4,
    },
    divider: {
        height: 1,
        marginVertical: 15,
    },
});
