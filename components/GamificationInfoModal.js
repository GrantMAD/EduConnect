import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faInfoCircle, faTrophy, faCoins, faFire, faMedal } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const GamificationInfoModal = React.memo(({ visible, onClose }) => {
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
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faInfoCircle} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>System Guide</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
                    <View style={styles.contentContainer}>

                        {/* XP Section */}
                        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b' + '15' }]}>
                                    <FontAwesomeIcon icon={faTrophy} size={14} color="#f59e0b" />
                                </View>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Experience (XP)</Text>
                            </View>
                            <Text style={[styles.description, { color: theme.colors.text }]}>
                                Earn XP by completing tasks, attending classes, and participating in polls. Level up to unlock rewards!
                            </Text>
                        </View>

                        {/* Coins Section */}
                        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#f59e0b' + '15' }]}>
                                    <FontAwesomeIcon icon={faCoins} size={14} color="#f59e0b" />
                                </View>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>EduCoins</Text>
                            </View>
                            <Text style={[styles.description, { color: theme.colors.text }]}>
                                You earn <Text style={{ fontWeight: '900', color: theme.colors.primary }}>1 Coin for every 10 XP</Text>. Use them in the Shop to customize your profile.
                            </Text>
                        </View>

                        {/* Streak Section */}
                        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#ef4444' + '15' }]}>
                                    <FontAwesomeIcon icon={faFire} size={14} color="#ef4444" />
                                </View>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Daily Streaks</Text>
                            </View>
                            <Text style={[styles.description, { color: theme.colors.text }]}>
                                Log in daily to maintain your streak. Don't break the chain or your multiplier will reset!
                            </Text>
                        </View>

                        {/* Badges Section */}
                        <View style={[styles.section, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionIcon, { backgroundColor: '#4f46e5' + '15' }]}>
                                    <FontAwesomeIcon icon={faMedal} size={14} color="#4f46e5" />
                                </View>
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Achievements</Text>
                            </View>
                            <Text style={[styles.description, { color: theme.colors.text }]}>
                                Unlock special badges as you reach milestones. Show off your accomplishments on your profile.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: theme.colors.primary }]}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.closeButtonText}>UNDERSTOOD</Text>
                        </TouchableOpacity>

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
        paddingBottom: 40,
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
    section: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    description: {
        fontSize: 13,
        lineHeight: 20,
        fontWeight: '600',
    },
    closeButton: {
        marginTop: 24,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default GamificationInfoModal;
