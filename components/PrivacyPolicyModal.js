import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function PrivacyPolicyModal({ visible, onClose }) {
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
                    <FontAwesomeIcon icon={faShieldAlt} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Privacy Policy</Text>
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
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Information We Collect</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We collect information that you provide directly to us, including:
                            </Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Name and email address</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Profile information and avatar</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Academic information (grades, assignments, schedules)</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• User-generated content (posts, comments, marketplace items)</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. How We Use Your Information</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We use the information we collect to:
                            </Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Provide, maintain, and improve our services</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Send you notifications and updates</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Facilitate communication between students, teachers, and parents</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Monitor and analyze usage patterns</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Detect and prevent fraud or abuse</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. Information Sharing</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We do not sell your personal information. We may share your information with:
                            </Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Other users within your school (as appropriate for your role)</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Service providers who assist in operating our platform</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Law enforcement when required by law</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Data Security</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>5. Student Privacy</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We are committed to protecting student privacy and comply with applicable education privacy laws, including FERPA and COPPA. We:
                            </Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Collect only necessary student information</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Never use student data for advertising</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Allow parents to review and request deletion of student data</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>6. Your Rights</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                You have the right to:
                            </Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Access your personal information</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Correct inaccurate information</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Request deletion of your information</Text>
                            <Text style={[styles.bulletPoint, { color: theme.colors.placeholder }]}>• Opt-out of certain data processing activities</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>7. Cookies and Tracking</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We use cookies and similar tracking technologies to collect information about your browsing activities and to personalize your experience.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>8. Data Retention</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We retain your information for as long as your account is active or as needed to provide services. We may retain certain information as required by law or for legitimate business purposes.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>9. Changes to This Policy</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date and, for significant changes, by providing additional notice.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>10. Contact Us</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                If you have questions about this Privacy Policy, please contact us at privacy@classconnect.com.
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
