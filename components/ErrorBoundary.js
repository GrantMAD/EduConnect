import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle, faRedo } from '@fortawesome/free-solid-svg-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error("Uncaught Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <FontAwesomeIcon icon={faExclamationTriangle} size={64} color="#FF3B30" style={styles.icon} />
            
            <Text style={styles.title}>Oops! Something went wrong.</Text>
            
            <Text style={styles.subtitle}>
              We're sorry, but an unexpected error occurred. Please try again.
            </Text>

            {this.state.error && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Error Details:</Text>
                <Text style={styles.debugText}>{this.state.error.toString()}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.button} 
              onPress={this.resetError}
              activeOpacity={0.8}
            >
              <FontAwesomeIcon icon={faRedo} size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  debugContainer: {
    width: '100%',
    backgroundColor: '#F0F0F0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#444',
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#555',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
