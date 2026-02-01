import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCheck, faTimes, faGraduationCap, faRocket } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const WelcomeModal = ({ visible, onClose }) => {
    const { theme, isDarkTheme } = useTheme();
    const [dontShowAgain, setDontShowAgain] = useState(false);

    const handleClose = () => {
        onClose(dontShowAgain);
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={styles.centeredView}>
                <View style={[styles.modalView, { backgroundColor: theme.colors.surface }]}>

                    {/* Decorative Header */}
                    <LinearGradient
                        colors={['#4f46e5', '#818cf8']} // Primary/Info blend
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.headerGradient}
                    >
                        <View style={styles.iconContainer}>
                            <FontAwesomeIcon icon={faRocket} size={32} color="white" />
                        </View>
                    </LinearGradient>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleClose}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <FontAwesomeIcon icon={faTimes} size={20} color={isDarkTheme ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'} />
                    </TouchableOpacity>

                    <View style={styles.contentContainer}>
                        <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                            Welcome to ClassConnect!
                        </Text>

                        <Text style={[styles.modalText, { color: theme.colors.subtext }]}>
                            We're excited to have you on board!
                            {'\n\n'}
                            This mobile app helps you stay connected on the go. For a <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>full run-down</Text> of all features and settings, please verify the <Text style={{ fontWeight: 'bold' }}>Feature Hub</Text> on our web application.
                        </Text>

                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setDontShowAgain(!dontShowAgain)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.customCheckbox,
                                {
                                    borderColor: theme.colors.text + '40', // Semi-transparent text color for border
                                    backgroundColor: 'white'
                                },
                                dontShowAgain && { borderColor: theme.colors.primary }
                            ]}>
                                {dontShowAgain && <FontAwesomeIcon icon={faCheck} size={14} color={theme.colors.primary} />}
                            </View>

                            <Text style={[styles.checkboxLabel, { color: theme.colors.text }]}>
                                Don't show this again
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, { backgroundColor: theme.colors.primary }]}
                            onPress={handleClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.textStyle}>Let's Go!</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', // Slightly darker overlay
        padding: 20
    },
    modalView: {
        width: Math.min(width * 0.85, 360),
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        position: 'relative',
        overflow: 'hidden', // Clip the gradient
    },
    headerGradient: {
        width: '100%',
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    contentContainer: {
        padding: 24,
        width: '100%',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        right: 15,
        top: 15,
        zIndex: 10,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 12,
        padding: 4,
    },
    modalTitle: {
        marginTop: 4,
        marginBottom: 12,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '800', // Extra bold title
        letterSpacing: -0.5,
    },
    modalText: {
        marginBottom: 24,
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 22,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        padding: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(128,128,128,0.05)', // Subtle background for checkbox area
        width: '100%',
        justifyContent: 'center',
    },
    checkboxLabel: {
        marginLeft: 10,
        fontSize: 14,
        fontWeight: '600',
    },
    customCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    button: {
        borderRadius: 16,
        paddingHorizontal: 40,
        paddingVertical: 14,
        elevation: 4,
        width: '100%',
        alignItems: 'center',
        shadowColor: 'rgba(79, 70, 229, 0.4)', // Shadow matching primary color
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    textStyle: {
        color: 'white',
        fontWeight: '700',
        textAlign: 'center',
        fontSize: 16,
        letterSpacing: 0.5,
    },
});

export default WelcomeModal;
