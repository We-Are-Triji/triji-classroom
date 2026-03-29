import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../config/firebaseConfig';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNetwork } from '../context/NetworkContext';
import { showErrorAlert, logError } from '../utils/errorHandler';
import { brutalButton, brutalCard, brutalInput, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

export default function CreateAnnouncementScreen({ navigation }) {
  const { isConnected } = useNetwork();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState('General');
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default 7 days
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [step, setStep] = useState(1);
  const [noExpiry, setNoExpiry] = useState(false);

  const announcementTypes = ['General', 'Reminder', 'Event', 'Critical'];

  const getTypeColor = type => {
    switch (type) {
      case 'Critical':
        return palette.coral;
      case 'Event':
        return palette.lavender;
      case 'Reminder':
        return palette.peach;
      default:
        return palette.sky;
    }
  };

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const handleCreateAnnouncement = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please provide a title for the announcement.');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Missing Content', 'Please provide content for the announcement.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Authentication Required', 'You must be logged in to create announcements.');
      return;
    }

    if (!isConnected) {
      Alert.alert('Offline', 'You need an internet connection to create announcements.');
      return;
    }

    setLoading(true);
    try {
      let authorName = 'Anonymous';

      // Fetch user's full name from profile
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
          if (fullName) {
            authorName = fullName;
          }
        }
      } catch (userError) {
        logError(userError, 'Fetch User Data');
        // Continue with 'Anonymous' as fallback
      }

      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        type: selectedType,
        authorName: authorName,
        authorId: user.uid,
        authorPhotoURL: '',
        createdAt: new Date(),
        expiresAt: noExpiry ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) : expiresAt, // 100 years if no expiry
      };

      await addDoc(collection(db, 'announcements'), announcementData);

      navigation.goBack();
    } catch (error) {
      showErrorAlert(error, 'Create Announcement', 'Creation Failed');
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.background, palette.background]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.shiningGradient}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <LinearGradient
        colors={[palette.background, palette.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.shiningGradient}
      />
      <TouchableOpacity
        style={styles.floatingBackButton}
        onPress={() => (step === 1 ? navigation.goBack() : setStep(1))}
      >
        <Feather name="arrow-left" size={24} color={palette.text} />
      </TouchableOpacity>
      {step === 1 ? (
        <View style={styles.centerCardWrapper}>
          <View
            style={[
              styles.cardModernPolished,
              {
                borderLeftColor: getTypeColor(selectedType),
                boxShadow:
                  Platform.OS === 'web'
                    ? `0px 0px 32px 0px ${getTypeColor(selectedType)}55, 0px 8px 32px 0px ${getTypeColor(selectedType)}22`
                    : undefined,
                shadowColor: getTypeColor(selectedType),
              },
              styles.cardWithMargin,
            ]}
          >
            <View style={styles.iconTitleWrapperCard}>
              <View
                style={[
                  styles.glowIconContainer,
                  {
                    borderColor: getTypeColor(selectedType),
                    shadowColor: getTypeColor(selectedType),
                    boxShadow:
                      Platform.OS === 'web'
                        ? `0 0 32px 0 ${getTypeColor(selectedType)}99, 0 0 12px 0 ${getTypeColor(selectedType)}55`
                        : undefined,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="bell-ring"
                  size={32}
                  color={getTypeColor(selectedType)}
                  style={styles.bellIcon}
                />
                <Feather name="plus-circle" size={16} color="#fff" style={styles.plusIconOverlay} />
              </View>
              <Text style={styles.screenTitle}>New Announcement</Text>
            </View>
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What's this announcement about?"
                  placeholderTextColor={palette.textMuted}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeGrid}>
                  {announcementTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeCard,
                        {
                          backgroundColor:
                            selectedType === type
                              ? getTypeColor(type)
                              : 'rgba(255, 255, 255, 0.03)',
                          borderColor:
                            selectedType === type ? getTypeColor(type) : 'rgba(255, 255, 255, 0.1)',
                        },
                        selectedType === type && styles.typeCardSelected,
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <Text
                        style={[
                          styles.typeCardText,
                          selectedType === type && styles.typeCardTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Expires On</Text>
                <TouchableOpacity style={styles.checkboxRow} onPress={() => setNoExpiry(!noExpiry)}>
                  <View style={[styles.checkbox, noExpiry && styles.checkboxChecked]}>
                    {noExpiry && <Feather name="check" size={16} color={palette.text} />}
                  </View>
                  <Text style={styles.checkboxLabel}>No expiry date (indefinite)</Text>
                </TouchableOpacity>
                {!noExpiry &&
                  (Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={expiresAt.toISOString().split('T')[0]}
                      onChange={e => setExpiresAt(new Date(e.target.value))}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        height: '52px',
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '14px',
                        padding: '0 18px',
                        fontSize: '15px',
                        color: '#FFFFFF',
                        fontFamily: 'Inter_400Regular',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Feather name="calendar" size={20} color={palette.textMuted} />
                        <Text style={styles.dateButtonText}>{expiresAt.toLocaleDateString()}</Text>
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={expiresAt}
                          mode="date"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) {
                              setExpiresAt(selectedDate);
                            }
                          }}
                          minimumDate={new Date()}
                        />
                      )}
                    </>
                  ))}
              </View>
              <TouchableOpacity
                style={[styles.actionButtonGlow, !title.trim() && styles.actionButtonGlowDisabled]}
                onPress={() => setStep(2)}
                disabled={!title.trim()}
              >
                <Feather name="arrow-right" size={18} color={palette.text} style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonTextGlow}>Next</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      ) : (
        <View style={styles.centerCardWrapper}>
          <View
            style={[
              styles.cardModernPolished,
              styles.cardFinalizeStep,
              {
                borderLeftColor: getTypeColor(selectedType),
                boxShadow:
                  Platform.OS === 'web'
                    ? `0px 0px 32px 0px ${getTypeColor(selectedType)}55, 0px 8px 32px 0px ${getTypeColor(selectedType)}22`
                    : undefined,
                shadowColor: getTypeColor(selectedType),
              },
              styles.cardWithMargin,
            ]}
          >
            <View style={styles.iconTitleWrapperCard}>
              <View
                style={[
                  styles.glowIconContainer,
                  {
                    borderColor: getTypeColor(selectedType),
                    shadowColor: getTypeColor(selectedType),
                    boxShadow:
                      Platform.OS === 'web'
                        ? `0 0 32px 0 ${getTypeColor(selectedType)}99, 0 0 12px 0 ${getTypeColor(selectedType)}55`
                        : undefined,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="bell-ring"
                  size={32}
                  color={getTypeColor(selectedType)}
                  style={styles.bellIcon}
                />
                <Feather name="plus-circle" size={16} color={palette.text} style={styles.plusIconOverlay} />
              </View>
              <Text style={styles.screenTitle}>New Announcement</Text>
            </View>
            <View style={styles.twitterHeader}>
              <Text style={styles.twitterTitle}>{title}</Text>
              <View style={styles.twitterMeta}>
                <View
                  style={[
                    styles.twitterTypeChip,
                    { backgroundColor: getTypeColor(selectedType) + '22' },
                  ]}
                >
                  <Text style={[styles.twitterTypeText, { color: getTypeColor(selectedType) }]}>
                    {selectedType}
                  </Text>
                </View>
                <Text style={styles.twitterExpiry}>
                  {noExpiry ? 'No expiry' : `Expires ${expiresAt.toLocaleDateString()}`}
                </Text>
              </View>
            </View>
            <TextInput
              style={styles.twitterTextArea}
              value={content}
              onChangeText={setContent}
              placeholder="What do you want to announce?"
              placeholderTextColor={palette.textMuted}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.actionButtonGlow,
                (!content.trim() || loading) && styles.actionButtonGlowDisabled,
              ]}
              onPress={handleCreateAnnouncement}
              disabled={!content.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color={palette.text} style={{ marginRight: 8 }} />
                  <Text style={styles.actionButtonTextGlow}>Publish</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerCardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shiningGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  iconTitleWrapper: {
    alignItems: 'center',
    marginTop: 38,
    marginBottom: 8,
    zIndex: 2,
  },
  bellPlusWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glowIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: screenAccents.announcements.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
    marginBottom: 8,
    marginTop: 2,
    ...brutalShadow(),
    position: 'relative',
  },
  bellPlusIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  bellIcon: {
    zIndex: 3,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  plusIconOverlay: {
    position: 'absolute',
    bottom: -6,
    right: -8,
    backgroundColor: palette.mustard,
    borderRadius: 12,
    padding: 1,
    borderWidth: 2,
    borderColor: palette.border,
    zIndex: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 0.2,
    textAlign: 'center',
    zIndex: 2,
  },
  floatingBackButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 32,
    left: 18,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: screenAccents.announcements.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
    zIndex: 100,
  },
  cardModernPolished: {
    ...brutalCard(screenAccents.announcements.tertiary),
    borderRadius: 28,
    borderLeftWidth: 7,
    marginBottom: 16,
    marginTop: 4,
    elevation: 10,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    overflow: 'hidden',
    padding: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 0,
    paddingTop: 36,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: 'transparent',
    marginTop: 18, // move header down for visual appeal
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginHorizontal: 0,
    paddingVertical: 0,
    paddingLeft: 16, // add left padding for back button
    paddingRight: 0,
    shadowColor: 'transparent',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 10,
    backgroundColor: '#232429',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    marginLeft: 0, // ensure not flush to border
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 0,
    letterSpacing: 0.2,
    textShadowColor: 'transparent',
    textAlignVertical: 'center',
  },
  headerBottom: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginHorizontal: 0,
    marginTop: 24, // move publish button down for visual appeal
    paddingTop: 0,
    paddingBottom: 0,
    paddingRight: 0,
    shadowColor: 'transparent',
  },
  publishButton: {
    paddingHorizontal: 22,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0,0,0,0.08)',
    shadowColor: 'transparent',
    alignSelf: 'flex-end',
  },
  publishButtonDisabled: {
    borderColor: '#4A4A4A',
    backgroundColor: 'transparent',
    opacity: 0.6,
  },
  publishButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#007AFF',
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    marginTop: 18,
  },
  scrollContent: {
    marginTop: 40,
    paddingHorizontal: 8,
    paddingBottom: 5,
  },
  card: {
    backgroundColor: 'rgba(30, 32, 40, 0.55)',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    marginHorizontal: 0,
    marginTop: 32, // move input fields down for visual appeal
    shadowColor: 'transparent',
    maxWidth: 400, // limit width for web/large screens
    alignSelf: 'center', // center horizontally
    width: '90%', // responsive for mobile
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    marginBottom: 8,
    letterSpacing: 0.1,
    opacity: 0.92,
  },
  input: {
    height: 50,
    ...brutalInput(palette.white),
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    marginBottom: 2,
  },
  textArea: {
    minHeight: 120,
    maxHeight: 200,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(30, 32, 40, 0.55)',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
    textAlignVertical: 'top',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    backgroundColor: 'transparent', // ghost style
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    shadowColor: 'transparent',
  },
  nextButtonDisabled: {
    backgroundColor: 'transparent',
    borderColor: '#4A4A4A',
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#007AFF',
  },
  twitterContainer: {
    flex: 1,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
    marginTop: 32, // add space below header/publish button
  },
  twitterHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
    marginBottom: 24, // increase space below preview card
    borderRadius: 24,
    borderWidth: 0,
    width: '92%',
    minWidth: 0,
    overflow: 'hidden',
    backgroundColor: palette.surface,
    marginHorizontal: '4%',
    borderWidth: 3,
    borderColor: palette.border,
  },
  twitterTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 8,
    flexWrap: 'wrap',
    width: '100%',
    minWidth: 0,
    lineHeight: 28,
    flexShrink: 1,
    wordBreak: 'break-word',
    marginLeft: 8, // ensure not covered by back button
  },
  twitterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
    marginLeft: 8,
  },
  twitterTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 2,
    borderColor: palette.border,
  },
  twitterTypeText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  twitterExpiry: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  twitterTextArea: {
    flex: 1,
    fontSize: 18,
    lineHeight: 28,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    textAlignVertical: 'top',
    padding: 22,
    borderRadius: 18,
    borderWidth: 3,
    marginTop: 0, // remove extra top margin
    marginBottom: 12,
    minHeight: 260,
    maxHeight: 400,
    backgroundColor: palette.white,
    borderColor: palette.border,
    marginHorizontal: 0,
    transition: 'all 0.2s',
    width: '100%',
    boxSizing: 'border-box',
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeCardSelected: {
    borderWidth: 2,
  },
  typeCardText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
  typeCardTextSelected: {
    color: palette.text,
  },
  dateButton: {
    height: 50,
    ...brutalInput(palette.white),
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: screenAccents.announcements.primary,
    borderColor: palette.border,
  },
  checkboxLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
  },
  cardWithMargin: {
    marginHorizontal: 18,
    marginTop: 0,
    marginBottom: 0,
    width: '95%',
    maxWidth: 420,
  },
  iconTitleWrapperCard: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16,
    zIndex: 2,
  },
  actionButtonGlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...brutalButton(screenAccents.announcements.primary),
    paddingHorizontal: 0,
    paddingVertical: 13,
    marginHorizontal: 4,
    marginTop: 12,
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
  },
  actionButtonGlowDisabled: {
    backgroundColor: palette.textMuted,
    borderColor: palette.border,
    opacity: 0.6,
  },
  actionButtonTextGlow: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  cardFinalizeStep: {
    minHeight: 700,
    marginTop: 32,
  },
});
