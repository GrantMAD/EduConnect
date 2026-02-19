import React, { useState, useCallback } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Image, ActivityIndicator, ScrollView, Dimensions } from 'react-native';
import { signUp } from '../../services/authService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash, faUser, faEnvelope, faLock, faGraduationCap } from '@fortawesome/free-solid-svg-icons';
import { useToastActions } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const SignUpScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToastActions();
  const { theme } = useTheme();

  const handleSignUp = useCallback(async () => {
    setLoading(true);
    try {
      const data = await signUp(email.trim(), password, {
        data: {
          full_name: fullName.trim(),
        }
      });

      if (data && data.user) {
        if (data.session) {
          showToast('Successfully signed up', 'success');
        } else {
          navigation.navigate('VerifyEmail', { email: email.trim() });
        }
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [email, password, fullName, showToast]);

  const toggleShowPassword = useCallback(() => setShowPassword(prev => !prev), []);
  const navigateToSignIn = useCallback(() => navigation.navigate('SignIn'), [navigation]);

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
          <Text style={styles.brandingSubtitle}>Join Thousands of Learners Worldwide</Text>
        </View>
      </LinearGradient>

      <View style={[styles.formSection, { backgroundColor: theme.colors.background }]}>
        <View style={styles.formHeader}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Start your learning adventure today</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Full Name</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
            <FontAwesomeIcon icon={faUser} size={18} color={theme.colors.placeholder} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="John Doe"
              placeholderTextColor={theme.colors.placeholder}
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
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
          <Text style={[styles.label, { color: theme.colors.text }]}>Password</Text>
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
          style={styles.signUpButtonContainer}
          onPress={handleSignUp}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4f46e5', '#9333ea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.signUpButton}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signUpButtonText}>Create Account</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={navigateToSignIn} style={styles.signInLink}>
          <Text style={[styles.linkText, { color: theme.colors.placeholder }]}>
            Already have an account? <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Sign in here</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

export default React.memo(SignUpScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandingSection: {
    height: SCREEN_HEIGHT * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  brandingContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandingTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: -1,
  },
  brandingSubtitle: {
    fontSize: 13,
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
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 54,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    fontWeight: '600',
  },
  eyeIcon: {
    padding: 4,
  },
  signUpButtonContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  signUpButton: {
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
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signInLink: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
  },
});
