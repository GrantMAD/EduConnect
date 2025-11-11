import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const WelcomeScreen = ({ navigation }) => {
  const { theme } = useTheme(); // Use the theme hook

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Image
        source={require('../assets/splash.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, { color: theme.colors.text }]}>Welcome to ClassConnect!</Text>
      <Text style={[styles.subtitle, { color: theme.colors.text }]}>Your all-in-one platform for seamless school communication and management.</Text>
      <Text style={[styles.description, { color: theme.colors.text }]}>Get started by signing in or signing up.</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.buttonPrimary }]}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonPrimaryText }]}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.buttonSecondary }]}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={[styles.buttonText, { color: theme.colors.buttonSecondaryText }]}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  description: {
    fontSize: 14,
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;
