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
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../config/firebaseConfig';
import { useNetwork } from '../context/NetworkContext';
import { showErrorAlert } from '../utils/errorHandler';
import { saveAnnouncement } from '../utils/backendActions';
import { brutalButton, brutalCard, brutalInput, brutalShadow, palette } from '../theme/neoBrutal';

const announcementTypes = ['General', 'Reminder', 'Event', 'Critical'];

const typeThemes = {
  Critical: {
    accent: palette.coral,
    cardBackground: '#F8DBD1',
    badgeBackground: '#F3BCA9',
    previewBackground: '#F7EBE4',
    icon: 'alert-octagon',
  },
  Event: {
    accent: palette.lavender,
    cardBackground: '#EBE0F7',
    badgeBackground: '#D7C3EF',
    previewBackground: '#F5EEFB',
    icon: 'calendar-star',
  },
  Reminder: {
    accent: palette.peach,
    cardBackground: '#F8E2CC',
    badgeBackground: '#F2C291',
    previewBackground: '#FBF0E3',
    icon: 'clock-time-four-outline',
  },
  General: {
    accent: palette.sky,
    cardBackground: '#DDEAF2',
    badgeBackground: '#B9D0E1',
    previewBackground: '#EEF5F8',
    icon: 'bullhorn-outline',
  },
};

function getTypeTheme(type) {
  return typeThemes[type] || typeThemes.General;
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CreateAnnouncementScreen({ navigation }) {
  const { isConnected } = useNetwork();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedType, setSelectedType] = useState('General');
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [noExpiry, setNoExpiry] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const theme = getTypeTheme(selectedType);

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
      await saveAnnouncement({
        title,
        content,
        type: selectedType,
        expiresAt: noExpiry ? null : expiresAt.toISOString(),
      });

      Alert.alert('Announcement Published', 'Your announcement is now on the board.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
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
          colors={[palette.background, '#EFE7DC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.centerState}>
          <Text style={styles.loadingText}>Loading composer...</Text>
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
      <View style={[styles.shape, styles.shapeBottom]} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={22} color={palette.text} />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Compose Announcement</Text>
          <Text style={styles.headerSubtext}>
            A brighter, clearer notice-board draft with a live preview.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.previewCard, { backgroundColor: theme.cardBackground }]}>
          <View style={[styles.previewAccent, { backgroundColor: theme.accent }]} />

          <View style={styles.previewBody}>
            <View style={styles.previewHeader}>
              <View style={[styles.typeBadge, { backgroundColor: theme.badgeBackground }]}>
                <MaterialCommunityIcons name={theme.icon} size={18} color={palette.text} />
                <Text style={styles.typeBadgeText}>{selectedType}</Text>
              </View>

              <View style={styles.previewPin}>
                <Feather name="edit-3" size={15} color={palette.text} />
              </View>
            </View>

            <Text style={styles.previewEyebrow}>Live preview</Text>
            <Text style={styles.previewTitle}>
              {title.trim() || 'Your title will appear here'}
            </Text>
            <Text style={styles.previewContent}>
              {content.trim() ||
                'Start writing to see how your announcement will look once it reaches the board.'}
            </Text>

            <View style={styles.previewFooter}>
              <View style={[styles.previewPill, { backgroundColor: theme.previewBackground }]}>
                <Feather name="calendar" size={14} color={palette.text} />
                <Text style={styles.previewPillText}>
                  {noExpiry ? 'No expiry date' : formatDateLabel(expiresAt)}
                </Text>
              </View>

              <View style={[styles.previewPill, styles.previewPillCompact]}>
                <Feather name="type" size={14} color={palette.text} />
                <Text style={styles.previewPillText}>{content.length}/500</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Headline</Text>
          <TextInput
            value={title}
            onChangeText={text => setTitle(text.slice(0, 100))}
            style={styles.titleInput}
            placeholder="What should everyone notice first?"
            placeholderTextColor={palette.textMuted}
          />

          <Text style={styles.sectionTitle}>Body</Text>
          <TextInput
            value={content}
            onChangeText={text => setContent(text.slice(0, 500))}
            style={styles.contentInput}
            placeholder="Write the full announcement here."
            placeholderTextColor={palette.textMuted}
            multiline
            textAlignVertical="top"
          />

          <View style={styles.helperRow}>
            <Text style={styles.helperText}>Keep it direct, warm, and easy to scan.</Text>
            <Text style={styles.helperCount}>{title.length}/100</Text>
          </View>

          <Text style={styles.sectionTitle}>Announcement type</Text>
          <View style={styles.typeGrid}>
            {announcementTypes.map(type => {
              const optionTheme = getTypeTheme(type);
              const isSelected = selectedType === type;

              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeOption,
                    { backgroundColor: isSelected ? optionTheme.badgeBackground : palette.white },
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <MaterialCommunityIcons
                    name={optionTheme.icon}
                    size={18}
                    color={palette.text}
                  />
                  <Text style={styles.typeOptionText}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.optionsCard}>
          <Text style={styles.sectionTitle}>Visibility</Text>
          <TouchableOpacity style={styles.toggleRow} onPress={() => setNoExpiry(prev => !prev)}>
            <View style={[styles.checkbox, noExpiry && styles.checkboxChecked]}>
              {noExpiry ? <Feather name="check" size={16} color={palette.text} /> : null}
            </View>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Keep this on the board longer</Text>
              <Text style={styles.toggleBody}>
                Switch this on if the announcement should stay without an end date.
              </Text>
            </View>
          </TouchableOpacity>

          {!noExpiry ? (
            Platform.OS === 'web' ? (
              <input
                type="date"
                value={expiresAt.toISOString().split('T')[0]}
                onChange={event => setExpiresAt(new Date(event.target.value))}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  height: '52px',
                  backgroundColor: '#FFFFFF',
                  border: `3px solid ${palette.border}`,
                  borderRadius: '18px',
                  padding: '0 16px',
                  fontSize: '15px',
                  color: palette.text,
                  fontFamily: 'Inter_400Regular',
                  width: '100%',
                  boxSizing: 'border-box',
                  marginTop: '14px',
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.dateButtonLeft}>
                    <Feather name="calendar" size={18} color={palette.text} />
                    <Text style={styles.dateButtonText}>{formatDateLabel(expiresAt)}</Text>
                  </View>
                  <Feather name="chevron-down" size={18} color={palette.textMuted} />
                </TouchableOpacity>

                {showDatePicker ? (
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
                ) : null}
              </>
            )
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          onPress={handleCreateAnnouncement}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={palette.text} size="small" />
          ) : (
            <>
              <Feather name="send" size={18} color={palette.text} />
              <Text style={styles.publishButtonText}>Publish Announcement</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 34,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    gap: 14,
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: palette.mustard,
    borderWidth: 3,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...brutalShadow(),
  },
  headerCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 42,
    gap: 16,
  },
  previewCard: {
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 30,
    overflow: 'hidden',
    ...brutalShadow(),
  },
  previewAccent: {
    height: 14,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  previewBody: {
    padding: 20,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: palette.border,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  previewPin: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: palette.white,
    borderWidth: 3,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEyebrow: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 10,
  },
  previewContent: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  previewFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: palette.white,
  },
  previewPillCompact: {
    backgroundColor: palette.surface,
  },
  previewPillText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
  },
  formCard: {
    ...brutalCard('#F7EFE7'),
    borderRadius: 30,
    padding: 20,
  },
  optionsCard: {
    ...brutalCard('#F6EEE6'),
    borderRadius: 30,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  titleInput: {
    ...brutalInput(palette.white),
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    marginBottom: 18,
  },
  contentInput: {
    ...brutalInput(palette.white),
    minHeight: 170,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  helperCount: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    minWidth: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  typeOptionText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    marginTop: 2,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 8,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: palette.mustard,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 4,
  },
  toggleBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  dateButton: {
    marginTop: 14,
    ...brutalInput(palette.white),
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
  },
  publishButton: {
    ...brutalButton(palette.coral),
    minHeight: 56,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  publishButtonDisabled: {
    opacity: 0.65,
  },
  publishButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
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
    width: 104,
    height: 104,
    borderRadius: 26,
    backgroundColor: '#F0C7B5',
    top: 118,
    right: -16,
    transform: [{ rotate: '12deg' }],
  },
  shapeBottom: {
    width: 120,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#D7C3EF',
    bottom: 110,
    left: -18,
    transform: [{ rotate: '-12deg' }],
  },
});
