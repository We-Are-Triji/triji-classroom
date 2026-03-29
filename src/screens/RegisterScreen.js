import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { auth, db } from '../config/firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserMessage } from '../utils/errorHandler';
import { sanitizeEmailInput, sanitizeNameInput } from '../utils/sanitize';
import { brutalButton, brutalCard, brutalInput, palette, screenAccents } from '../theme/neoBrutal';

export default function RegisterScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agree, setAgree] = useState(false);

  const validateName = name => {
    return name.trim().length > 0 && !/\d/.test(name);
  };

  const validateEmail = email => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isFormValid = () => {
    return (
      validateName(firstName) &&
      validateName(lastName) &&
      validateEmail(email) &&
      password.trim().length > 0 &&
      password === confirmPassword &&
      agree
    );
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const sanitizedFirstName = sanitizeNameInput(firstName);
      const sanitizedLastName = sanitizeNameInput(lastName);
      const sanitizedEmail = sanitizeEmailInput(email);

      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      const user = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
        email: sanitizedEmail,
        createdAt: new Date().toISOString(),
      });

      // Send email verification
      await sendEmailVerification(user);

      // No need to manually store session - Firebase Auth with AsyncStorage persistence handles this
      console.log('Registration successful:', user.email);
      navigation.navigate('Verification');
    } catch (error) {
      console.error('Registration error:', error);
      const userMessage = getUserMessage(error, 'Registration failed. Please try again.');
      setError(userMessage);
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
    return (
      <View style={styles.container}>
        <View style={styles.backgroundGradient} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <LinearGradient
        colors={[palette.background, palette.background]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.glassCard}>
            <Text style={styles.greeting}>Welcome!,</Text>
            <Text style={styles.headline}>Let's Get You Started.</Text>
            <View style={styles.inputContainer}>
              <View style={styles.inputGroup}>
                <FontAwesome name="user-o" size={18} color={palette.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Given name"
                  placeholderTextColor={palette.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  selectionColor={palette.text}
                  underlineColorAndroid="transparent"
                />
              </View>
              <View style={styles.inputGroup}>
                <FontAwesome name="user-o" size={18} color={palette.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Family name"
                  placeholderTextColor={palette.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  selectionColor={palette.text}
                  underlineColorAndroid="transparent"
                />
              </View>
              <View style={styles.inputGroup}>
                <Feather name="mail" size={18} color={palette.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="School email address"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  selectionColor={palette.text}
                  underlineColorAndroid="transparent"
                />
              </View>
              <View style={styles.inputGroup}>
                <Feather name="lock" size={18} color={palette.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={palette.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  selectionColor={palette.text}
                  underlineColorAndroid="transparent"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={palette.textMuted} />
                </TouchableOpacity>
              </View>
              <View style={styles.inputGroup}>
                <Feather name="lock" size={18} color={palette.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor={palette.textMuted}
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                  selectionColor={palette.text}
                  underlineColorAndroid="transparent"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Feather
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={palette.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.termsRow}>
              <Checkbox
                value={agree}
                onValueChange={setAgree}
                color={agree ? palette.teal : undefined}
                style={styles.checkbox}
              />
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://yourapp.com/terms')}
                >
                  Conditions of Use
                </Text>{' '}
                and{' '}
                <Text
                  style={styles.link}
                  onPress={() => Linking.openURL('https://yourapp.com/privacy')}
                >
                  Privacy Notice
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.registerButton,
                (!isFormValid() || loading) && styles.registerButtonDisabled,
              ]}
              disabled={!isFormValid() || loading}
              onPress={handleRegister}
            >
              {loading ? (
                <ActivityIndicator color={palette.text} size="small" />
              ) : (
                <Text style={styles.registerButtonText}>Register</Text>
              )}
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.bottomSection}>
              <View style={styles.loginContainer}>
                <Text style={styles.linkText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.link}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glassCard: {
    width: '95%',
    maxWidth: 400,
    padding: 38,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
    ...brutalCard(screenAccents.auth.secondary),
  },
  greeting: {
    fontSize: 16,
    color: palette.textMuted,
    fontFamily: 'Inter_400Regular',
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  headline: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: palette.text,
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 18,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 10,
    ...brutalInput(palette.white),
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    color: palette.text,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  eyeIcon: {
    padding: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    width: '100%',
  },
  checkbox: {
    marginRight: 8,
    marginLeft: 2,
  },
  termsText: {
    color: palette.textMuted,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    flex: 1,
    flexWrap: 'wrap',
  },
  link: {
    color: palette.text,
    textDecorationLine: 'underline',
    fontFamily: 'Inter_500Medium',
  },
  brandTextT: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: '#007AFF', // blue
    marginBottom: 2,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  registerButton: {
    width: '100%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    marginTop: 2,
    ...brutalButton(screenAccents.auth.primary),
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    letterSpacing: 0.3,
  },
  registerButtonDisabled: {
    backgroundColor: '#E5CDBB',
    opacity: 0.6,
  },
  errorText: {
    color: palette.error,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: 4,
    backgroundColor: '#F8D9D3',
    padding: 10,
    borderRadius: 12,
    width: '100%',
    borderWidth: 3,
    borderColor: palette.border,
  },
  bottomSection: {
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  brandText: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: palette.text,
    marginBottom: 2,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    paddingVertical: 2,
  },
  linkText: {
    color: palette.textMuted,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.text,
    fontSize: 18,
  },
  logoBottom: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: palette.powder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: palette.border,
  },
  logoImageBottom: {
    width: '100%',
    height: '100%',
  },
});
