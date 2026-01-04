import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faGraduationCap, faUsers, faTrophy, faStore } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const AppInfoModal = React.memo(({ visible, onClose }) => {
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
                        <FontAwesomeIcon icon={faGraduationCap} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Platform Information</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
                    <View style={styles.contentContainer}>
                        <View style={styles.logoContainer}>
                            <View style={[styles.logoIconBox, { backgroundColor: theme.colors.primary }]}>
                                <FontAwesomeIcon icon={faGraduationCap} size={40} color="#fff" />
                            </View>
                            <Text style={[styles.appName, { color: theme.colors.text }]}>ClassConnect</Text>
                            <View style={[styles.versionBadge, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                <Text style={[styles.versionText, { color: theme.colors.placeholder }]}>STABLE RELEASE v1.0.0</Text>
                            </View>
                        </View>

                        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>MISSION</Text>
                            <Text style={[styles.sectionText, { color: theme.colors.text }]}>
                                ClassConnect is a comprehensive school management platform designed to streamline communication and collaboration between students, teachers, parents, and administrators.
                            </Text>
                        </View>

                        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>CORE CAPABILITIES</Text>
                            <View style={styles.featureList}>
                                <View style={styles.featureItem}>
                                    <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <FontAwesomeIcon icon={faUsers} size={10} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.featureText, { color: theme.colors.text }]}>Unified User Management</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <FontAwesomeIcon icon={faGraduationCap} size={10} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.featureText, { color: theme.colors.text }]}>Curriculum & Task Tracking</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <FontAwesomeIcon icon={faTrophy} size={10} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.featureText, { color: theme.colors.text }]}>Gamified Learning Progress</Text>
                                </View>
                                <View style={styles.featureItem}>
                                    <View style={[styles.featureIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                                        <FontAwesomeIcon icon={faStore} size={10} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.featureText, { color: theme.colors.text }]}>Integrated Marketplace</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.footerInfo}>
                            <Text style={[styles.credits, { color: theme.colors.placeholder }]}>
                                Developed with excellence for global education.
                            </Text>
                            <Text style={[styles.copyright, { color: theme.colors.placeholder }]}>
                                © 2026 CLASSCONNECT. ALL RIGHTS RESERVED.
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
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
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    appName: {
        fontSize: 28,
        fontWeight: '900',
        marginTop: 16,
        letterSpacing: -1,
    },
    versionBadge: {
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    versionText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    infoCard: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 12,
        letterSpacing: 1.5,
        color: '#94a3b8',
    },
    sectionText: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '600',
    },
    featureList: {
        gap: 12,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featureIcon: {
        width: 24,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    featureText: {
        fontSize: 13,
        fontWeight: '700',
    },
    footerInfo: {
        marginTop: 24,
        alignItems: 'center',
    },
    credits: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    copyright: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default AppInfoModal;
