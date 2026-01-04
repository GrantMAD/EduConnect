import React, { useState, useCallback } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Image, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash, faEnvelope, faLock, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const SignInScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { theme } = useTheme();

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      showToast(error.message, 'error');
    } else if (data.session) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.session.user.id)
        .single();
      
      if (profile?.role !== 'server_admin') {
        showToast('Signed in successfully!', 'success');
      }
    }
  }, [email, password, showToast]);

  const toggleShowPassword = useCallback(() => setShowPassword(prev => !prev), []);
  const navigateToForgotPassword = useCallback(() => navigation.navigate('ForgotPassword'), [navigation]);
  const navigateToSignUp = useCallback(() => navigation.navigate('SignUp'), [navigation]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ flexGrow: 1 }}>
      <LinearGradient
        colors={['#4f46e5', '#9333ea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.brandingSection}
      >
        <View style={styles.brandingContent}>
            <View style={styles.iconContainer}>
                <FontAwesomeIcon icon={faGraduationCap} size={40} color="#fff" />
            </View>
            <Text style={styles.brandingTitle}>ClassConnect</Text>
            <Text style={styles.brandingSubtitle}>Empowering Education Through Technology</Text>
        </View>
      </LinearGradient>

      <View style={[styles.formSection, { backgroundColor: theme.colors.background }]}>
        <View style={styles.formHeader}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Sign in to continue your learning journey</Text>
        </View>

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

        <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
                <Text style={[styles.label, { color: theme.colors.text }]}>Password</Text>
                <TouchableOpacity onPress={navigateToForgotPassword}>
                    <Text style={[styles.forgotPassword, { color: theme.colors.primary }]}>Forgot Password?</Text>
                </TouchableOpacity>
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
                <FontAwesomeIcon icon={faLock} size={18} color={theme.colors.placeholder} style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={theme.colors.placeholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={toggleShowPassword} style={styles.eyeIcon}>
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} size={18} color={theme.colors.placeholder} />
                </TouchableOpacity>
            </View>
        </View>

        <TouchableOpacity 
            style={styles.signInButtonContainer} 
            onPress={handleSignIn} 
            disabled={loading}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#4f46e5', '#9333ea']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInButton}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.signInButtonText}>Sign In</Text>
                )}
            </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={navigateToSignUp} style={styles.signUpLink}>
            <Text style={[styles.linkText, { color: theme.colors.placeholder }]}>
                Don't have an account? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Create one now</Text>
            </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default React.memo(SignInScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandingSection: {
    height: SCREEN_HEIGHT * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  brandingContent: {
      alignItems: 'center',
  },
  iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
  },
  brandingTitle: {
      fontSize: 32,
      fontWeight: '900',
      color: '#fff',
      textTransform: 'uppercase',
      letterSpacing: -1,
  },
  brandingSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '500',
      textAlign: 'center',
      marginTop: 4,
  },
  formSection: {
      flex: 1,
      marginTop: -30,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      padding: 24,
  },
  formHeader: {
      marginBottom: 32,
      alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
      marginBottom: 20,
  },
  labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
  },
  label: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
  },
  forgotPassword: {
      fontSize: 12,
      fontWeight: '600',
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
  eyeIcon: {
    padding: 4,
  },
  signInButtonContainer: {
      marginTop: 12,
      marginBottom: 20,
  },
  signInButton: {
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
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpLink: {
      alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
});
