import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faCheckCircle, faGraduationCap, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { resendVerificationEmail } from '../../services/authService';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

const VerifyEmailScreen = ({ route, navigation }) => {
    const { email } = route.params || {};
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [resending, setResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    const handleResendEmail = useCallback(async () => {
        if (!email) return;
        setResending(true);
        setResendSuccess(false);

        try {
            await resendVerificationEmail(email);
            setResendSuccess(true);
            showToast('Verification email resent!', 'success');
            setTimeout(() => setResendSuccess(false), 5000);
        } catch (error) {
            showToast(error.message || 'Failed to resend email', 'error');
        } finally {
            setResending(false);
        }
    }, [email, showToast]);

    const handleBackToLogin = useCallback(() => {
        navigation.navigate('SignIn');
    }, [navigation]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
                colors={['#4f46e5', '#9333ea']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity onPress={handleBackToLogin} style={styles.backButton}>
                    <FontAwesomeIcon icon={faArrowLeft} size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.iconContainer}>
                    <FontAwesomeIcon icon={faGraduationCap} size={40} color="#fff" />
                </View>
                <Text style={styles.headerTitle}>ClassConnect</Text>
            </LinearGradient>

            <View style={styles.content}>
                <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <View style={styles.statusIconContainer}>
                        <LinearGradient
                            colors={resendSuccess ? ['#10b981', '#059669'] : ['#4f46e5', '#9333ea']}
                            style={styles.statusGradient}
                        >
                            <FontAwesomeIcon
                                icon={resendSuccess ? faCheckCircle : faEnvelope}
                                size={32}
                                color="#fff"
                            />
                        </LinearGradient>
                    </View>

                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {resendSuccess ? 'Email Resent!' : 'Verify Your Email'}
                    </Text>

                    <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                        We've sent a verification link to:
                    </Text>

                    <Text style={[styles.emailText, { color: theme.colors.primary }]}>
                        {email || 'your email address'}
                    </Text>

                    <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
                        Please check your inbox and click the link to activate your account. Once verified, return to the app and sign in.
                    </Text>

                    <TouchableOpacity
                        style={styles.resendButton}
                        onPress={handleResendEmail}
                        disabled={resending}
                    >
                        <LinearGradient
                            colors={['#4f46e5', '#9333ea']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.resendGradient}
                        >
                            {resending ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.resendText}>Resend Verification Email</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.loginLink}
                        onPress={handleBackToLogin}
                    >
                        <Text style={[styles.loginLinkText, { color: theme.colors.textSecondary }]}>
                            Already verified? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.colors.placeholder }]}>
                        Can't find the email? Check your spam folder or try resending.
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default React.memo(VerifyEmailScreen);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    backButton: {
        position: 'absolute',
        top: 50,
        left: 20,
        padding: 8,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        textTransform: 'uppercase',
    },
    content: {
        flex: 1,
        padding: 24,
        marginTop: -30,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        backgroundColor: 'transparent',
    },
    card: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    statusIconContainer: {
        width: 80,
        height: 80,
        marginBottom: 24,
    },
    statusGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        marginBottom: 4,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
    },
    instruction: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
    },
    resendButton: {
        width: '100%',
        marginBottom: 20,
    },
    resendGradient: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    resendText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    loginLink: {
        padding: 8,
    },
    loginLinkText: {
        fontSize: 14,
    },
    footer: {
        marginTop: 24,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});
