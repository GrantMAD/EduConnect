import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faGraduationCap, faUsers, faTrophy, faStore } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function AppInfoModal({ visible, onClose }) {
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
                    <FontAwesomeIcon icon={faGraduationCap} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>About ClassConnect</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>
                        <View style={styles.logoContainer}>
                            <FontAwesomeIcon icon={faGraduationCap} size={64} color={theme.colors.primary} />
                            <Text style={[styles.appName, { color: theme.colors.text }]}>ClassConnect</Text>
                            <Text style={[styles.version, { color: theme.colors.placeholder }]}>Version 1.0.0</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                ClassConnect is a comprehensive school management platform designed to streamline communication and collaboration between students, teachers, parents, and administrators.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Features</Text>
                            <View style={styles.featureItem}>
                                <FontAwesomeIcon icon={faUsers} size={16} color={theme.colors.primary} />
                                <Text style={[styles.featureText, { color: theme.colors.placeholder }]}>User Management & Role-Based Access</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <FontAwesomeIcon icon={faGraduationCap} size={16} color={theme.colors.primary} />
                                <Text style={[styles.featureText, { color: theme.colors.placeholder }]}>Class Schedules & Homework Tracking</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <FontAwesomeIcon icon={faTrophy} size={16} color={theme.colors.primary} />
                                <Text style={[styles.featureText, { color: theme.colors.placeholder }]}>Gamification & Leaderboards</Text>
                            </View>
                            <View style={styles.featureItem}>
                                <FontAwesomeIcon icon={faStore} size={16} color={theme.colors.primary} />
                                <Text style={[styles.featureText, { color: theme.colors.placeholder }]}>Marketplace & Rewards System</Text>
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Credits</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.placeholder }]}>
                                Developed with ❤️ for educational institutions worldwide.
                            </Text>
                            <Text style={[styles.copyright, { color: theme.colors.placeholder }]}>
                                © 2025 ClassConnect. All rights reserved.
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
    logoContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    appName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 16,
    },
    version: {
        fontSize: 14,
        marginTop: 4,
    },
    divider: {
        height: 1,
        marginVertical: 15,
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 15,
        lineHeight: 22,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        fontSize: 14,
        marginLeft: 12,
        flex: 1,
    },
    copyright: {
        fontSize: 12,
        marginTop: 16,
        textAlign: 'center',
    },
});
