import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { showErrorAlert, logError } from '../utils/errorHandler';
import { brutalButton, brutalCard, brutalInput, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

export default function EditProfileScreen({ navigation }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setFirstName(userData.firstName || '');
            setLastName(userData.lastName || '');
          }
        }
      } catch (error) {
        logError(error, 'Fetch User Data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const user = auth.currentUser;

      // Trim inputs
      const trimmedFirst = firstName.trim();
      const trimmedLast = lastName.trim();

      // Validate inputs
      if (!trimmedFirst || !trimmedLast) {
        Alert.alert('Error', 'Please fill in all required fields.');
        setSaving(false);
        return;
      }

      // Validate name contains only letters, spaces, hyphens, and apostrophes
      const nameRegex = /^[a-zA-Z\s'-]+$/;
      if (!nameRegex.test(trimmedFirst)) {
        Alert.alert(
          'Invalid Name',
          'First name can only contain letters, spaces, hyphens, and apostrophes.'
        );
        setSaving(false);
        return;
      }

      if (!nameRegex.test(trimmedLast)) {
        Alert.alert(
          'Invalid Name',
          'Last name can only contain letters, spaces, hyphens, and apostrophes.'
        );
        setSaving(false);
        return;
      }

      // Validate name length
      if (trimmedFirst.length < 2 || trimmedFirst.length > 50) {
        Alert.alert('Invalid Length', 'First name must be between 2 and 50 characters.');
        setSaving(false);
        return;
      }

      if (trimmedLast.length < 2 || trimmedLast.length > 50) {
        Alert.alert('Invalid Length', 'Last name must be between 2 and 50 characters.');
        setSaving(false);
        return;
      }

      if (user) {
        const updatedData = {
          firstName: trimmedFirst,
          lastName: trimmedLast,
        };

        await updateDoc(doc(db, 'users', user.uid), updatedData);
        Alert.alert('Success', 'Name updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      showErrorAlert(error, 'Update Profile', 'Update Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.background, palette.background]}
          style={styles.gradient}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.text} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.background, palette.background]}
        style={styles.gradient}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Name</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="words"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={palette.text} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
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
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    borderRadius: 14,
    backgroundColor: screenAccents.profile.primary,
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: palette.text,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  card: {
    padding: 20,
    ...brutalCard(screenAccents.profile.tertiary),
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: palette.text,
    marginBottom: 8,
    opacity: 0.9,
    textTransform: 'uppercase',
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
    color: palette.text,
    ...brutalInput(palette.background),
  },
  saveButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    ...brutalButton(screenAccents.profile.secondary),
  },
  saveButtonDisabled: {
    backgroundColor: '#D9D2C9',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.text,
    fontSize: 16,
    marginTop: 12,
    opacity: 0.8,
  },
});
