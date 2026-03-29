import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebaseConfig';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { FeedbackModal } from '../components';
import { getUserMessage } from '../utils/errorHandler';
import { sanitizeEmailInput } from '../utils/sanitize';
import { brutalButton, brutalCard, brutalInput, palette, screenAccents } from '../theme/neoBrutal';

const { width, height } = Dimensions.get('window');

const CARD_RADIUS = 28;
const LOGIN_CARD_WIDTH = width * 0.9;
const LOGIN_CARD_HEIGHT = height * 0.75; // Increased height
const LOGIN_CARD_MARGIN_TOP = -CARD_RADIUS * 0.7;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [lastResetTime, setLastResetTime] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [feedback, setFeedback] = useState({ visible: false, title: '', message: '', tone: 'error' });

  // Load saved credentials on mount
  React.useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedRememberMe = await AsyncStorage.getItem('remember_me');
      if (savedRememberMe === 'true') {
        const savedEmail = await AsyncStorage.getItem('saved_email');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
        // Remove any old saved passwords from previous versions (security cleanup)
        AsyncStorage.removeItem('saved_password').catch(() => { });
        AsyncStorage.removeItem('last_user_email').catch(() => { });
      }
    } catch (error) {
      console.log('Error loading saved email:', error);
    }
  };

  const handleForgotPassword = async () => {
    // Validate email input
    if (!resetEmail || resetEmail.trim() === '') {
      setResetMessage('Please enter your email address.');
      setResetSuccess(false);
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setResetMessage('Please enter a valid email address.');
      setResetSuccess(false);
      return;
    }

    // Rate limiting - prevent requests within 60 seconds
    const now = Date.now();
    if (lastResetTime && now - lastResetTime < 60000) {
      const remainingSeconds = Math.ceil((60000 - (now - lastResetTime)) / 1000);
      setResetMessage(
        `Please wait ${remainingSeconds} seconds before requesting another reset email.`
      );
      setResetSuccess(false);
      return;
    }

    setResetLoading(true);
    setResetMessage('');
    setResetSuccess(false);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setLastResetTime(Date.now());
      setResetSuccess(true);
      setResetMessage(
        'Password reset email sent successfully! Please check your inbox (and spam folder).'
      );
      // Don't auto-close, let user close manually
    } catch (error) {
      console.log('Password reset error:', error.message);
      setResetSuccess(false);
      if (error.code === 'auth/invalid-email') {
        setResetMessage('Invalid email format.');
      } else if (error.code === 'auth/too-many-requests') {
        setResetMessage('Too many attempts. Please try again in a few minutes.');
      } else if (error.code === 'auth/user-not-found') {
        // For security, show generic message
        setResetMessage('If an account exists for that email, a reset link has been sent.');
      } else {
        setResetMessage('Unable to send reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleCloseResetModal = () => {
    setShowForgotModal(false);
    setResetEmail('');
    setResetMessage('');
    setResetSuccess(false);
  };

  const handleLogin = async () => {
    const trimmedEmail = sanitizeEmailInput(email);

    if (!trimmedEmail || !password.trim()) {
      setFeedback({
        visible: true,
        title: 'Missing details',
        message: 'Enter both your school email and password before signing in.',
        tone: 'error',
      });
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Perform Firebase authentication (fast, cached locally)
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;

      // Check email verification first (no network call)
      if (!user.emailVerified) {
        // Email not verified, send new verification and log out
        try {
          await sendEmailVerification(user);
        } catch (verificationError) {
          console.log('Error sending verification email:', verificationError);
        }
        await signOut(auth);
        const message =
          'Please verify your email before logging in. A fresh verification link was sent to your inbox.';
        setError(message);
        setFeedback({
          visible: true,
          title: 'Email not verified',
          message,
          tone: 'info',
        });
        setLoading(false);
        return;
      }

      // Save only email for "remember me" - never store passwords in plain text
      // Firebase Auth handles session persistence automatically via AsyncStorage
      if (rememberMe) {
        AsyncStorage.multiSet([
          ['saved_email', trimmedEmail],
          ['remember_me', 'true'],
        ]).catch(err => console.log('Error saving email:', err));
      } else {
        AsyncStorage.multiRemove(['saved_email', 'remember_me']).catch(err =>
          console.log('Error removing saved data:', err)
        );
      }

      // Verify user document exists in background (don't block navigation)
      getDoc(doc(db, 'users', user.uid))
        .then(userDoc => {
          if (!userDoc.exists()) {
            console.warn('User document not found for:', user.uid);
            // Could show a non-blocking warning or create the document
          }
        })
        .catch(err => console.log('Error checking user doc:', err));

      // Navigate immediately - don't wait for background tasks
      console.log('Login successful:', user.email);
      navigation.navigate('MainApp');
    } catch (error) {
      console.log('Login error:', error.code, error.message);

      let message = getUserMessage(error, 'Login failed. Please try again.');
      let title = 'Login failed';

      if (error.code === 'auth/wrong-password') {
        message = 'That password is incorrect. Double-check it and try again.';
      } else if (error.code === 'auth/invalid-credential') {
        message = 'Your email or password does not match this account.';
      } else if (error.code === 'auth/user-not-found') {
        message = 'No account was found for that email address.';
      } else if (error.code === 'auth/network-request-failed') {
        title = 'Connection issue';
        message = 'We could not reach the server. If you already have a saved session, cached content is still available offline.';
      }

      setError(message);
      setFeedback({
        visible: true,
        title,
        message,
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[palette.background, palette.background]}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
      >
        {/* Background Card with Header */}
        <View style={styles.bgCard}>
          <Text style={styles.title}>Welcome Back to</Text>
          <Text style={styles.appName}>TRIJI</Text>
          <Text style={styles.subtitle}>Your dashboard is waiting.</Text>
        </View>

        {/* Login Card Overlay */}
        <ScrollView
          style={styles.loginCard}
          contentContainerStyle={styles.loginCardContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.loginLabel}>LOGIN</Text>
          {/* Username Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="School email address"
              placeholderTextColor={palette.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <Feather name="user" size={20} color={palette.textMuted} style={styles.inputIcon} />
          </View>
          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Account password"
              placeholderTextColor={palette.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={palette.textMuted}
                style={styles.inputIcon}
              />
            </TouchableOpacity>
          </View>
          {/* Options Row */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe ? <View style={styles.checkboxInner} /> : null}
              </View>
              <Text style={styles.rememberMe}>Remember Me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowForgotModal(true)}>
              <Text style={styles.needHelp}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {/* Sign In Button */}
          <TouchableOpacity style={styles.signInButton} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={palette.text} />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          <View style={styles.divider} />
          {/* Footer inside card for spacing */}
          <View style={styles.footerCardSpacer} />
          {/* Footer inside login card */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <TouchableWithoutFeedback onPress={handleCloseResetModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Reset Password</Text>
                    <TouchableOpacity onPress={handleCloseResetModal}>
                      <Feather name="x" size={24} color={palette.text} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalDescription}>
                    Enter your email address and we'll send you a link to reset your password.
                  </Text>

                  <View style={styles.modalInputContainer}>
                    <Feather
                      name="mail"
                      size={20}
                      color={palette.textMuted}
                      style={styles.modalInputIcon}
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Your school email address"
                      placeholderTextColor={palette.textMuted}
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {resetMessage ? (
                    <Text
                      style={[
                        styles.resetMessage,
                        resetSuccess ? styles.successMessage : styles.errorMessage,
                      ]}
                    >
                      {resetMessage}
                    </Text>
                  ) : null}

                  {resetSuccess ? (
                    <TouchableOpacity
                      style={styles.modalButton}
                      onPress={handleCloseResetModal}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.modalButtonText}>Close</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        (resetLoading || !resetEmail) && styles.modalButtonDisabled,
                      ]}
                      onPress={handleForgotPassword}
                      disabled={resetLoading || !resetEmail}
                      activeOpacity={0.8}
                    >
                      {resetLoading ? (
                        <ActivityIndicator color={palette.text} />
                      ) : (
                        <Text style={styles.modalButtonText}>Send Reset Link</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <FeedbackModal
          visible={feedback.visible}
          title={feedback.title}
          message={feedback.message}
          tone={feedback.tone}
          onClose={() => setFeedback(prev => ({ ...prev, visible: false }))}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.background,
  },
  bgCard: {
    width: '100%',
    backgroundColor: screenAccents.auth.secondary,
    alignItems: 'flex-start',
    paddingTop: 56,
    paddingBottom: 120,
    paddingLeft: 28,
    paddingRight: 28,
    marginBottom: LOGIN_CARD_MARGIN_TOP,
    borderBottomWidth: 3,
    borderColor: palette.border,
  },
  title: {
    color: palette.text,
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 40,
    marginBottom: 4,
    letterSpacing: 0.2,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  appName: {
    color: palette.coral,
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    textAlign: 'left',
    alignSelf: 'flex-start',
  },
  loginCard: {
    height: LOGIN_CARD_HEIGHT,
    width: '100%',
    backgroundColor: screenAccents.auth.tertiary,
    marginTop: LOGIN_CARD_MARGIN_TOP - 20,
    zIndex: 2,
    ...brutalCard(screenAccents.auth.tertiary),
  },
  loginCardContent: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 28,
    paddingRight: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  loginLabel: {
    color: palette.text,
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    alignSelf: 'flex-start',
    marginBottom: 40,
    marginLeft: 2,
    letterSpacing: 1.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    ...brutalInput(palette.white),
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 2,
    width: '100%',
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 12,
    borderWidth: 0,
    borderColor: 'transparent',
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  inputIcon: {
    marginLeft: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginVertical: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.white,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: palette.border,
    backgroundColor: palette.mustard,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: palette.text,
  },
  rememberMe: {
    color: palette.textMuted,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  needHelp: {
    color: palette.text,
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
  },
  signInButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 24,
    ...brutalButton(screenAccents.auth.primary),
  },
  signInButtonText: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  divider: {
    width: '100%',
    height: 3,
    backgroundColor: palette.border,
    marginTop: 20,
    marginBottom: 20,
  },
  footerCardSpacer: {
    height: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  footerText: {
    color: palette.textMuted,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  footerLink: {
    color: palette.text,
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Inter_600SemiBold',
    marginLeft: 2,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: palette.error,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: -4,
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 43, 43, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    ...brutalCard(palette.background),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
    fontFamily: 'Inter_700Bold',
  },
  modalDescription: {
    fontSize: 15,
    color: palette.textMuted,
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    ...brutalInput(palette.white),
  },
  modalInputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    height: 52,
    color: palette.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  resetMessage: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  successMessage: {
    color: palette.success,
  },
  errorMessage: {
    color: palette.error,
  },
  modalButton: {
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...brutalButton(palette.teal),
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: palette.text,
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
