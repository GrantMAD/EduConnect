import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Image, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext'; // Import useTheme

const logo = require('../../assets/splash.png');

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { theme } = useTheme(); // Use the theme hook

  const handleSignUp = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    setLoading(false);

    if (error) {
      showToast(error.message, 'error');
    } else if (data && data.user) {
      showToast('Successfully signed up', 'success');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Image source={logo} style={styles.logo} />
      <Text style={[styles.title, { color: theme.colors.text }]}>Create an Account</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
        placeholder="Full Name"
        placeholderTextColor={theme.colors.placeholder}
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
        placeholder="Email"
        placeholderTextColor={theme.colors.placeholder}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.inputBorder, color: theme.colors.text }]}
          placeholder="Password"
          placeholderTextColor={theme.colors.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} size={20} color={theme.colors.placeholder} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.buttonPrimary }]} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>Sign Up</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
        <Text style={[styles.link, { color: theme.colors.primary }]}>Already have an account? <Text style={{ fontWeight: 'bold', color: theme.colors.primary }}>Sign In</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  logo: {
    width: 250,
    height: 250,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    padding: 15,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  eyeIcon: {
    position: 'absolute',
    right: 15,
    top: 15,
  },
  button: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    fontSize: 14,
  },
});