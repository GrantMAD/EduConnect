import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faInfoCircle, faTrophy, faCoins, faFire, faMedal } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function GamificationInfoModal({ visible, onClose }) {
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
                    <FontAwesomeIcon icon={faInfoCircle} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>How it Works</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>

                        {/* XP Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <FontAwesomeIcon icon={faTrophy} size={20} color="#FFD700" />
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Experience Points (XP)</Text>
                            </View>
                            <Text style={[styles.description, { color: theme.colors.text }]}>
                                Earn XP by completing tasks, attending classes, and participating in polls. Level up to unlock new items and show off your progress!
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        {/* Coins Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <FontAwesomeIcon icon={faCoins} size={20} color="#FFD700" />
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Coins</Text>
                            </View>
                            <Text style={[styles.description, { color: theme.colors.text }]}>
                                You earn <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>1 Coin for every 10 XP</Text> you gain. Spend coins in the Shop to customize your avatar and profile frame.
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        {/* Streak Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <FontAwesomeIcon icon={faFire} size={20} color="#FF9500" />
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Daily Streaks</Text>
                            </View>
                            <Text style={[styles.description, { color: theme.colors.text }]}>
                                Keep your streak alive by logging in or doing an activity every day. Don't miss a day, or your streak will reset!
                            </Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        {/* Badges Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <FontAwesomeIcon icon={faMedal} size={20} color="#FFD700" />
                                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Badges</Text>
                            </View>
                            <Text style={[styles.description, { color: theme.colors.text }]}>
                                Unlock special badges as you reach XP milestones. Badges are unique to your role (Student, Teacher, or Parent) and show off your achievements!
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.closeButton, { backgroundColor: theme.colors.primary }]}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>Got it!</Text>
                        </TouchableOpacity>

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
        maxHeight: '80%',
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
        marginBottom: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginLeft: 30, // Indent to align with title text
    },
    divider: {
        height: 1,
        marginVertical: 15,
    },
    closeButton: {
        marginTop: 20,
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
