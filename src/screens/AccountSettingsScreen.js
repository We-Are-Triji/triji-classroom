import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  Switch,
  Linking,
  ActivityIndicator,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../config/firebaseConfig';
import {
  signOut,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import SettingsRow from '../components/SettingsRow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import {
  registerForPushNotifications,
  setNotificationPreference,
  getNotificationPreference,
  checkNotificationPermissions,
} from '../utils/notifications';
import { stopAllListeners } from '../utils/firestoreListeners';
import { showErrorAlert, logError } from '../utils/errorHandler';
import { version as appVersion } from '../../package.json';
import { brutalButton, brutalCard, brutalInput, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

export default function AccountSettingsScreen({ navigation }) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [tasksNotifications, setTasksNotifications] = useState(true);
  const [announcementsNotifications, setAnnouncementsNotifications] = useState(true);
  const [freedomWallNotifications, setFreedomWallNotifications] = useState(true);
  const [checkingForUpdates, setCheckingForUpdates] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [otaMessage, setOtaMessage] = useState('Checking OTA status...');

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    fetchUserData();
    loadNotificationPreferences();
    requestNotificationPermissions();
    checkForOtaUpdate();
  }, []);

  const checkForOtaUpdate = async () => {
    if (__DEV__) {
      setOtaMessage('OTA checks work in production builds only.');
      setCheckingForUpdates(false);
      setUpdateAvailable(false);
      return;
    }

    try {
      setCheckingForUpdates(true);
      const result = await Updates.checkForUpdateAsync();
      setUpdateAvailable(result.isAvailable);
      setOtaMessage(
        result.isAvailable
          ? 'A live OTA update is ready for this build.'
          : 'This build is already on the latest OTA update.'
      );
    } catch (error) {
      logError(error, 'Fetch Latest Version');
      setUpdateAvailable(false);
      setOtaMessage('Could not verify OTA updates right now.');
    } finally {
      setCheckingForUpdates(false);
    }
  };

  const applyOtaUpdate = async () => {
    try {
      setCheckingForUpdates(true);
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      logError(error, 'Apply OTA Update');
      Alert.alert('Update Failed', 'The OTA update could not be applied right now.');
      setCheckingForUpdates(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      logError(error, 'Fetch User Data');
    }
  };

  const requestNotificationPermissions = async () => {
    await registerForPushNotifications();
  };

  const toggleNotificationSetting = async (type, value, setPreferenceState) => {
    if (value) {
      const alreadyGranted = await checkNotificationPermissions();
      if (!alreadyGranted) {
        const token = await registerForPushNotifications();
        const grantedNow = await checkNotificationPermissions();

        if (!grantedNow && !token) {
          Alert.alert(
            'Notifications Off',
            'Enable notification permission in your phone settings if you want alerts to arrive.'
          );
          setPreferenceState(false);
          await setNotificationPreference(type, false);
          return;
        }
      }
    }

    setPreferenceState(value);
    await setNotificationPreference(type, value);
    await syncNotificationPreferenceToProfile(type, value);
  };

  const syncNotificationPreferenceToProfile = async (type, value) => {
    try {
      if (!auth.currentUser) return;

      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        [`notificationPreferences.${type}`]: value,
      });
    } catch (error) {
      logError(error, 'Sync Notification Preference');
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const tasks = await getNotificationPreference('tasks');
      const announcements = await getNotificationPreference('announcements');
      const freedomWall = await getNotificationPreference('freedom_wall');

      setTasksNotifications(tasks);
      setAnnouncementsNotifications(announcements);
      setFreedomWallNotifications(freedomWall);
    } catch (error) {
      logError(error, 'Load Notification Preferences');
    }
  };

  const toggleTasksNotifications = async value => {
    await toggleNotificationSetting('tasks', value, setTasksNotifications);
  };

  const toggleAnnouncementsNotifications = async value => {
    await toggleNotificationSetting('announcements', value, setAnnouncementsNotifications);
  };

  const toggleFreedomWallNotifications = async value => {
    await toggleNotificationSetting('freedom_wall', value, setFreedomWallNotifications);
  };

  const handleLogout = async () => {
    try {
      setShowLogoutModal(true);

      // Give user visual feedback that logout is happening
      await new Promise(resolve => setTimeout(resolve, 600));

      // Stop all Firestore listeners before logging out
      stopAllListeners();

      // Sign out from Firebase (this clears the auth session automatically)
      await signOut(auth);

      // Additional delay to ensure logout is processed
      await new Promise(resolve => setTimeout(resolve, 400));

      setShowLogoutModal(false);

      // Navigate to login and reset navigation stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      logError(error, 'Logout');
      setShowLogoutModal(false);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'New password must be at least 8 characters long.');
      return;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      Alert.alert(
        'Weak Password',
        'Password must contain at least one uppercase letter, one lowercase letter, and one number for better security.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => proceedWithPasswordChange() },
        ]
      );
      return;
    }

    await proceedWithPasswordChange();
  };

  const proceedWithPasswordChange = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      Alert.alert('Success', 'Password updated successfully!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      showErrorAlert(error, 'Change Password', 'Update Failed');
    } finally {
      setLoading(false);
    }
  };

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
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.background, palette.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Card */}
        {userData && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Feather name="user" size={32} color={palette.text} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {userData.firstName} {userData.lastName}
              </Text>
              <Text style={styles.userEmail}>{auth.currentUser?.email}</Text>
            </View>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.stackGroup}>
            <SettingsRow
              icon="edit-3"
              title="Edit Name"
              subtitle="Update your display name"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <SettingsRow
              icon="lock"
              title="Change Password"
              subtitle="Update your password"
              onPress={() => setShowPasswordModal(true)}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.switchGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={styles.iconCircle}>
                  <Feather name="clipboard" size={20} color={palette.text} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Tasks</Text>
                  <Text style={styles.settingSubtitle}>Get notified about new tasks</Text>
                </View>
              </View>
              <Switch
                value={tasksNotifications}
                onValueChange={toggleTasksNotifications}
                trackColor={{ false: palette.textMuted, true: screenAccents.tasks.primary }}
                thumbColor={palette.white}
              />
            </View>

            <View style={[styles.settingRow, styles.borderTop]}>
              <View style={styles.settingLeft}>
                <View style={styles.iconCircle}>
                  <Feather name="megaphone" size={20} color={palette.text} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Announcements</Text>
                  <Text style={styles.settingSubtitle}>Get notified about new announcements</Text>
                </View>
              </View>
              <Switch
                value={announcementsNotifications}
                onValueChange={toggleAnnouncementsNotifications}
                trackColor={{ false: palette.textMuted, true: screenAccents.announcements.primary }}
                thumbColor={palette.white}
              />
            </View>

            <View style={[styles.settingRow, styles.borderTop]}>
              <View style={styles.settingLeft}>
                <View style={styles.iconCircle}>
                  <Feather name="message-circle" size={20} color={palette.text} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Freedom Wall</Text>
                  <Text style={styles.settingSubtitle}>Get notified about new posts</Text>
                </View>
              </View>
              <Switch
                value={freedomWallNotifications}
                onValueChange={toggleFreedomWallNotifications}
                trackColor={{ false: palette.textMuted, true: screenAccents.freedomWall.primary }}
                thumbColor={palette.white}
              />
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.stackGroup}>
            <SettingsRow
              icon="log-out"
              title="Log Out"
              subtitle="Sign out of your account"
              onPress={handleLogout}
              isDestructive={false}
              showArrow={false}
            />
          </View>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Current Version</Text>
            <Text style={styles.versionText}>v{appVersion}</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>OTA Status</Text>
            {checkingForUpdates ? (
              <ActivityIndicator size="small" color={palette.text} />
            ) : (
              <Text style={styles.versionText}>{updateAvailable ? 'Available' : 'Current'}</Text>
            )}
          </View>
          <Text style={styles.otaNote}>{otaMessage}</Text>
          {!checkingForUpdates && updateAvailable && (
            <TouchableOpacity
              style={styles.updateButton}
              onPress={applyOtaUpdate}
            >
              <Feather name="download" size={16} color={palette.text} />
              <Text style={styles.updateButtonText}>Apply OTA Update</Text>
            </TouchableOpacity>
          )}
          {!checkingForUpdates && !updateAvailable && (
            <View style={styles.upToDateBadge}>
              <Feather name="check-circle" size={16} color={palette.text} />
              <Text style={styles.upToDateText}>No OTA waiting</Text>
            </View>
          )}
          <TouchableOpacity style={styles.secondaryUpdateButton} onPress={checkForOtaUpdate}>
            <Text style={styles.secondaryUpdateButtonText}>Check Again</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.copyright}>© 2025 Triji. All rights reserved.</Text>
      </ScrollView>

      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.modalInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={palette.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Logout Loading Modal */}
      <Modal visible={showLogoutModal} transparent={true} animationType="fade">
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutSpinner}>
              <Feather name="log-out" size={32} color={palette.text} />
            </View>
            <Text style={styles.logoutModalTitle}>Logging out...</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: screenAccents.profile.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    flex: 1,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.text,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  content: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    ...brutalCard(screenAccents.profile.tertiary),
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: screenAccents.profile.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: palette.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 20,
  },
  stackGroup: {
    marginHorizontal: 20,
    gap: 12,
  },
  switchGroup: {
    marginHorizontal: 20,
    overflow: 'hidden',
    ...brutalCard(palette.surface),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: palette.surface,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: screenAccents.tasks.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 3,
    borderColor: palette.border,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  borderTop: {
    borderTopWidth: 3,
    borderTopColor: palette.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 43, 43, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '85%',
    maxWidth: 400,
    padding: 24,
    ...brutalCard(palette.background),
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    ...brutalInput(palette.white),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...brutalButton(palette.powder),
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  saveButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...brutalButton(screenAccents.profile.secondary),
  },
  saveButtonDisabled: {
    backgroundColor: '#D9D2C9',
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 43, 43, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalCard: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    ...brutalCard(palette.background),
  },
  logoutSpinner: {
    marginBottom: 12,
  },
  logoutModalTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  logoutModalSubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
    marginTop: 4,
  },
  versionContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    ...brutalCard(palette.powder),
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  otaNote: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
    ...brutalButton(screenAccents.profile.secondary),
  },
  updateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  secondaryUpdateButton: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  secondaryUpdateButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  upToDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DDEDE9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
    borderWidth: 3,
    borderColor: palette.border,
  },
  upToDateText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  copyright: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
});
