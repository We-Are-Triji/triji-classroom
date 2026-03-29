import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { brutalButton, brutalCard, palette } from '../theme/neoBrutal';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.errorCard}>
              <View style={styles.iconContainer}>
                <Feather name="alert-triangle" size={64} color={palette.error} />
              </View>

              <Text style={styles.title}>Oops! Something went wrong</Text>
              <Text style={styles.message}>
                The app encountered an unexpected error. Don&apos;t worry, your data is safe.
              </Text>

              {__DEV__ && this.state.error && (
                <ScrollView style={styles.errorDetails}>
                  <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
                  <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                  {this.state.errorInfo && (
                    <Text style={styles.errorText}>{this.state.errorInfo.componentStack}</Text>
                  )}
                </ScrollView>
              )}

              <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                <Feather name="refresh-cw" size={20} color={palette.text} />
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <Text style={styles.helpText}>If the problem persists, please contact support</Text>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorCard: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    padding: 24,
    ...brutalCard('#F8D9D3'),
  },
  iconContainer: {
    marginBottom: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: palette.mustard,
    borderWidth: 3,
    borderColor: palette.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: palette.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  errorDetails: {
    maxHeight: 200,
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: palette.border,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.error,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: palette.text,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 16,
    ...brutalButton(palette.teal),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  helpText: {
    fontSize: 14,
    color: palette.textMuted,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
