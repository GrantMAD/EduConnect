import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEnvelope, faQuestionCircle, faBook } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

/* ---------------- FAQ ITEM ---------------- */

const FAQItem = React.memo(({ question, answer, theme }) => (
    <View
        style={[
            styles.faqItem,
            {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
                borderWidth: 1,
            },
        ]}
    >
        <View style={styles.questionContainer}>
            <View style={[styles.faqIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
                <FontAwesomeIcon icon={faQuestionCircle} size={12} color={theme.colors.primary} />
            </View>
            <Text style={[styles.question, { color: theme.colors.text }]}>{question}</Text>
        </View>
        <Text style={[styles.answer, { color: theme.colors.text }]}>{answer}</Text>
    </View>
));

/* ---------------- MAIN MODAL ---------------- */

const HelpSupportModal = React.memo(({ visible, onClose }) => {
    const { theme } = useTheme();

    const handleEmailSupport = () => {
        Linking.openURL('mailto:EduLink3321@gmail.com?subject=ClassConnect Support Request');
    };

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
                        <FontAwesomeIcon icon={faBook} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        Support Center
                    </Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
                    <View style={styles.contentContainer}>
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>DIRECT ASSISTANCE</Text>

                            <TouchableOpacity
                                style={[
                                    styles.contactButton,
                                    {
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.cardBorder,
                                        borderWidth: 1,
                                    },
                                ]}
                                onPress={handleEmailSupport}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.contactIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
                                    <FontAwesomeIcon icon={faEnvelope} size={16} color={theme.colors.primary} />
                                </View>
                                <View style={styles.contactInfo}>
                                    <Text style={[styles.contactTitle, { color: theme.colors.text }]}>Email Support Team</Text>
                                    <Text style={[styles.contactDetail, { color: theme.colors.placeholder }]}>
                                        Response within 24 hours
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 16 }]}>
                                FREQUENTLY ASKED QUESTIONS
                            </Text>

                            <FAQItem
                                theme={theme}
                                question="How do I reset my password?"
                                answer="Navigate to Settings > Account > Security to initiate a password change request."
                            />

                            <FAQItem
                                theme={theme}
                                question="How do I enable notifications?"
                                answer="Access Settings > Notifications to customize your alert preferences for all events."
                            />

                            <FAQItem
                                theme={theme}
                                question="Can parents view academic progress?"
                                answer="Yes. Once linked, parents have real-time access to grades, homework, and session attendance."
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
});

/* ---------------- STYLES ---------------- */

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
        paddingBottom: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 16,
        letterSpacing: 1.5,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
    },
    contactIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contactInfo: {
        flex: 1,
    },
    contactTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    contactDetail: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    faqItem: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 12,
    },
    questionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    faqIconBox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    question: {
        fontSize: 14,
        fontWeight: '800',
        flex: 1,
    },
    answer: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '600',
    },
});

export default HelpSupportModal;

