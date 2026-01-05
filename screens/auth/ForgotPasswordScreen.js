import React, { useState, useCallback } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faGraduationCap, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { resetPassword } from '../../services/authService';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const { showToast } = useToast();
    const { theme } = useTheme();

    const handleResetPassword = useCallback(async () => {
        setLoading(true);
        setMessage(null);

        try {
            await resetPassword(email, 'classconnect://update-password');

            setMessage('Check your email for the password reset link.');
            showToast('Reset link sent!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [email, showToast]);

    const navigateToSignIn = useCallback(() => navigation.navigate('SignIn'), [navigation]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <FontAwesomeIcon icon={faGraduationCap} size={32} color="#fff" />
                    </View>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Forgot Password?</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>
                        Enter your email and we'll send you a link to reset your password.
                    </Text>
                </View>

                {message ? (
                    <View style={[styles.messageBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Text style={[styles.messageTitle, { color: theme.colors.text }]}>Check your email</Text>
                        <Text style={[styles.messageText, { color: theme.colors.placeholder }]}>{message}</Text>
                        <TouchableOpacity onPress={navigateToSignIn}>
                            <Text style={[styles.returnLink, { color: theme.colors.primary }]}>Return to Sign In</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Email Address</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                                <FontAwesomeIcon icon={faEnvelope} size={18} color={theme.colors.placeholder} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.colors.text }]}
                                    placeholder="you@example.com"
                                    placeholderTextColor={theme.colors.placeholder}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.buttonContainer} 
                            onPress={handleResetPassword} 
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#4f46e5', '#9333ea']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.button}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Send Reset Link</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={navigateToSignIn} style={styles.backLink}>
                            <FontAwesomeIcon icon={faArrowLeft} size={14} color={theme.colors.placeholder} style={{ marginRight: 8 }} />
                            <Text style={{ color: theme.colors.placeholder, fontWeight: '600' }}>Back to Sign In</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}

export default React.memo(ForgotPasswordScreen);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    content: {
        width: '100%',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#4f46e5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 8,
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    buttonContainer: {
        marginBottom: 24,
    },
    button: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    messageBox: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    messageTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    messageText: {
        textAlign: 'center',
        marginBottom: 20,
    },
    returnLink: {
        fontWeight: 'bold',
        fontSize: 16,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    }
});