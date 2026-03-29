import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { auth } from '../config/firebaseConfig';
import { sendEmailVerification } from 'firebase/auth';
import { brutalButton, brutalCard, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

const { width, height } = Dimensions.get('window');

export default function VerificationScreen({ navigation }) {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const handleResend = async () => {
    setResendLoading(true);
    setResendMessage('');

    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);

        setResendMessage('Fresh verification email sent. Check inbox, spam, and promotions.');
        Alert.alert(
          'Email Sent',
          'Verification email sent successfully. Please check your inbox and spam folder.'
        );

        setResendDisabled(true);
        setTimeout(() => setResendDisabled(false), 30000);
      } else {
        setResendMessage('No user is currently logged in.');
        Alert.alert(
          'Authentication Error',
          'No user is currently logged in. Please log in again.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    } catch (error) {
      const errorMessage =
        error.code === 'auth/too-many-requests'
          ? 'Too many requests. Please wait before asking for another email.'
          : 'Failed to resend verification email. Please try again.';

      setResendMessage(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.background, '#EFE7DC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerState}>
          <Text style={styles.loadingText}>Loading verification screen...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.background, '#EFE7DC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.shape, styles.shapeTop]} />
      <View style={[styles.shape, styles.shapeMiddle]} />
      <View style={[styles.shape, styles.shapeBottom]} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBadge}>
          <Feather name="mail" size={16} color={palette.text} />
          <Text style={styles.heroBadgeText}>Almost there</Text>
        </View>

        <View style={styles.mainCard}>
          <View style={styles.iconTile}>
            <MaterialCommunityIcons name="email-check-outline" size={48} color={palette.text} />
          </View>

          <Text style={styles.title}>Verify your email</Text>
          <Text style={styles.body}>
            We already sent a verification link to your inbox. Open it, confirm your address, then
            come back and log in.
          </Text>

          <View style={styles.tipCard}>
            <View style={styles.tipRow}>
              <Feather name="inbox" size={16} color={palette.text} />
              <Text style={styles.tipText}>Check inbox, spam, and promotions folders.</Text>
            </View>
            <View style={styles.tipRow}>
              <Feather name="refresh-cw" size={16} color={palette.text} />
              <Text style={styles.tipText}>Need another link? You can resend it below.</Text>
            </View>
            <View style={styles.tipRow}>
              <Feather name="shield" size={16} color={palette.text} />
              <Text style={styles.tipText}>Verified accounts help keep the classroom secure.</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Login')}>
            <Feather name="arrow-left" size={18} color={palette.text} />
            <Text style={styles.primaryButtonText}>Back to Login</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, resendDisabled && styles.secondaryButtonDisabled]}
            onPress={handleResend}
            disabled={resendLoading || resendDisabled}
          >
            <Feather name="send" size={18} color={palette.text} />
            <Text style={styles.secondaryButtonText}>
              {resendLoading ? 'Sending...' : resendDisabled ? 'Wait 30 seconds' : 'Resend email'}
            </Text>
          </TouchableOpacity>

          {resendMessage ? (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackText}>{resendMessage}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 40,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.mustard,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    ...brutalShadow(),
  },
  heroBadgeText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mainCard: {
    width: '100%',
    maxWidth: 470,
    ...brutalCard('#F7E4D8'),
    borderRadius: 32,
    padding: 26,
    alignItems: 'center',
  },
  iconTile: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: screenAccents.auth.secondary,
    borderWidth: 3,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  body: {
    fontSize: 16,
    lineHeight: 25,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 18,
  },
  tipCard: {
    width: '100%',
    backgroundColor: palette.surface,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 24,
    padding: 18,
    gap: 12,
    marginBottom: 22,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  primaryButton: {
    width: '100%',
    minHeight: 54,
    ...brutalButton(screenAccents.auth.primary),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 52,
    backgroundColor: palette.white,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  feedbackCard: {
    width: '100%',
    marginTop: 14,
    backgroundColor: '#EEF5F8',
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 20,
    padding: 14,
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    textAlign: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
  },
  shape: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: palette.border,
    zIndex: -1,
  },
  shapeTop: {
    width: 130,
    height: 130,
    borderRadius: 30,
    backgroundColor: screenAccents.auth.secondary,
    top: height * 0.1,
    right: -24,
    transform: [{ rotate: '14deg' }],
  },
  shapeMiddle: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: screenAccents.auth.primary,
    left: -14,
    top: height * 0.43,
    transform: [{ rotate: '-10deg' }],
  },
  shapeBottom: {
    width: 124,
    height: 56,
    borderRadius: 22,
    backgroundColor: '#D7C3EF',
    bottom: height * 0.09,
    right: width * 0.08,
    transform: [{ rotate: '-8deg' }],
  },
});
