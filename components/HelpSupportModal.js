import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEnvelope, faQuestionCircle, faBook } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function HelpSupportModal({ visible, onClose }) {
    const { theme } = useTheme();

    const handleEmailSupport = () => {
        Linking.openURL('mailto:support@classconnect.com?subject=ClassConnect Support Request');
    };

    const FAQItem = ({ question, answer }) => (
        <View style={styles.faqItem}>
            <View style={styles.questionContainer}>
                <FontAwesomeIcon icon={faQuestionCircle} size={16} color={theme.colors.primary} />
                <Text style={[styles.question, { color: theme.colors.text }]}>{question}</Text>
            </View>
            <Text style={[styles.answer, { color: theme.colors.placeholder }]}>{answer}</Text>
        </View>
    );

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
                    <FontAwesomeIcon icon={faBook} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Help & Support</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Contact Support</Text>
                            <TouchableOpacity
                                style={[styles.contactButton, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}
                                onPress={handleEmailSupport}
                            >
                                <FontAwesomeIcon icon={faEnvelope} size={20} color={theme.colors.primary} />
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactTitle, { color: theme.colors.text }]}>Email Support</Text>
                                    <Text style={[styles.contactDetail, { color: theme.colors.placeholder }]}>support@classconnect.com</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Frequently Asked Questions</Text>

                            <FAQItem
                                question="How do I reset my password?"
                                answer="Navigate to Settings > Account Management > Change Password to update your password."
                            />

                            <FAQItem
                                question="How do I enable notifications?"
                                answer="Go to Settings > Notification Preferences and toggle the notifications you want to receive."
                            />

                            <FAQItem
                                question="How does the gamification system work?"
                                answer="Earn XP by completing assignments, participating in polls, and engaging with school activities. Level up to unlock badges and rewards in the marketplace."
                            />

                            <FAQItem
                                question="Can parents view their children's progress?"
                                answer="Yes! Parents can link their accounts to their children and view homework, grades, and class schedules."
                            />

                            <FAQItem
                                question="How do I report a bug?"
                                answer="Please email our support team with details about the issue you're experiencing."
                            />
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
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    divider: {
        height: 1,
        marginVertical: 15,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
    },
    contactInfo: {
        marginLeft: 16,
        flex: 1,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    contactDetail: {
        fontSize: 14,
    },
    faqItem: {
        marginBottom: 20,
    },
    questionContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    question: {
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 10,
        flex: 1,
    },
    answer: {
        fontSize: 14,
        lineHeight: 20,
        marginLeft: 26,
    },
});
