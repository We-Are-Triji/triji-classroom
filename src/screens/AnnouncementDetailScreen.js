import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../config/firebaseConfig';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { lightHaptic, mediumHaptic, warningHaptic, successHaptic } from '../utils/haptics';
import { brutalButton, brutalCard, brutalShadow, palette } from '../theme/neoBrutal';

const typeThemes = {
  Critical: {
    accent: palette.coral,
    cardBackground: '#F8DBD1',
    badgeBackground: '#F3BCA9',
    bodyBackground: '#F7EBE4',
    icon: 'alert-octagon',
  },
  Event: {
    accent: palette.lavender,
    cardBackground: '#EBE0F7',
    badgeBackground: '#D7C3EF',
    bodyBackground: '#F5EEFB',
    icon: 'calendar-star',
  },
  Reminder: {
    accent: palette.peach,
    cardBackground: '#F8E2CC',
    badgeBackground: '#F2C291',
    bodyBackground: '#FBF0E3',
    icon: 'clock-time-four-outline',
  },
  General: {
    accent: palette.sky,
    cardBackground: '#DDEAF2',
    badgeBackground: '#B9D0E1',
    bodyBackground: '#EEF5F8',
    icon: 'bullhorn-outline',
  },
};

function getTypeTheme(type) {
  return typeThemes[type] || typeThemes.General;
}

function normalizeDate(timestamp) {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
}

function formatDateLabel(timestamp) {
  const date = normalizeDate(timestamp);
  if (!date) return 'Unknown';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeLabel(timestamp) {
  const date = normalizeDate(timestamp);
  if (!date) return 'Unknown';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatExpiryLabel(timestamp) {
  const expiry = normalizeDate(timestamp);
  if (!expiry) return 'No expiry';

  const diffMs = expiry.getTime() - Date.now();

  if (diffMs <= 0) {
    return 'Expired';
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
  if (diffHours > 0) return `${diffHours} hour${diffHours === 1 ? '' : 's'} left`;
  return 'Ends soon';
}

function DetailSkeleton() {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [shimmerValue]);

  const animatedStyle = {
    opacity: shimmerValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.45, 0.9],
    }),
    transform: [
      {
        translateX: shimmerValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 4],
        }),
      },
    ],
  };

  return (
    <View style={styles.skeletonWrap}>
      <View style={styles.skeletonHero}>
        <Animated.View style={[styles.skeletonBadge, animatedStyle]} />
        <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
        <Animated.View style={[styles.skeletonTitleShort, animatedStyle]} />

        <View style={styles.skeletonMetaRow}>
          <Animated.View style={[styles.skeletonMetaCard, animatedStyle]} />
          <Animated.View style={[styles.skeletonMetaCard, animatedStyle]} />
        </View>
      </View>

      <View style={styles.skeletonBody}>
        <Animated.View style={[styles.skeletonSectionLabel, animatedStyle]} />
        <Animated.View style={[styles.skeletonLine, animatedStyle]} />
        <Animated.View style={[styles.skeletonLine, animatedStyle]} />
        <Animated.View style={[styles.skeletonLineShort, animatedStyle]} />
      </View>
    </View>
  );
}

export default function AnnouncementDetailScreen({ route, navigation }) {
  const { announcementId } = route.params || {};
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState(null);
  const [canDelete, setCanDelete] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (!announcementId) {
      setError('Announcement not found.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setCanDelete(false);

      try {
        const [announcementSnap, userSnap] = await Promise.all([
          getDoc(doc(db, 'announcements', announcementId)),
          auth.currentUser ? getDoc(doc(db, 'users', auth.currentUser.uid)) : Promise.resolve(null),
        ]);

        if (!announcementSnap.exists()) {
          setAnnouncement(null);
          setError('Announcement not found.');
          setLoading(false);
          return;
        }

        const announcementData = {
          id: announcementSnap.id,
          ...announcementSnap.data(),
        };

        const isAdmin = userSnap?.exists() && userSnap.data()?.role === 'admin';

        setAnnouncement(announcementData);
        setCanDelete(
          !!auth.currentUser &&
            (announcementData.authorId === auth.currentUser.uid || isAdmin)
        );
      } catch (fetchError) {
        setAnnouncement(null);
        setError('Could not load announcement. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [announcementId, reloadKey]);

  const handleDelete = () => {
    warningHaptic();
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    mediumHaptic();
    setShowDeleteModal(false);

    try {
      await deleteDoc(doc(db, 'announcements', announcementId));
      successHaptic();
      navigation.navigate('Announcements');
    } catch (deleteError) {
      setError('Could not delete this announcement right now.');
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
          <Text style={styles.loadingText}>Loading announcement...</Text>
        </View>
      </View>
    );
  }

  const theme = getTypeTheme(announcement?.type);
  const authorName = announcement?.authorName || announcement?.author || 'Campus team';

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
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            lightHaptic();
            navigation.goBack();
          }}
        >
          <Feather name="arrow-left" size={22} color={palette.text} />
        </TouchableOpacity>

        {canDelete ? (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Feather name="trash-2" size={20} color={palette.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {loading ? (
        <DetailSkeleton />
      ) : error || !announcement ? (
        <View style={styles.messageCard}>
          <Feather name="alert-circle" size={28} color={palette.text} />
          <Text style={styles.messageTitle}>Announcement unavailable</Text>
          <Text style={styles.messageBody}>{error || 'This announcement could not be found.'}</Text>
          <View style={styles.messageActions}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setReloadKey(prev => prev + 1)}>
              <Text style={styles.primaryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryMessageButton} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryMessageButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.postCard, { backgroundColor: theme.cardBackground }]}>
            <View style={[styles.postAccent, { backgroundColor: theme.accent }]} />

            <View style={styles.postBody}>
              <View style={styles.postHeaderRow}>
                <View style={[styles.typeBadge, { backgroundColor: theme.badgeBackground }]}>
                  <MaterialCommunityIcons name={theme.icon} size={16} color={palette.text} />
                  <Text style={styles.typeBadgeText}>{announcement.type || 'General'}</Text>
                </View>

                <Text style={styles.headerTimestamp}>{formatTimeLabel(announcement.createdAt)}</Text>
              </View>

              <Text style={styles.title}>{announcement.title}</Text>

              <View style={styles.authorRow}>
                <View style={styles.authorPill}>
                  <Feather name="user" size={13} color={palette.text} />
                  <Text style={styles.authorText}>{authorName}</Text>
                </View>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.inlineMeta}>{formatDateLabel(announcement.createdAt)}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.inlineMeta}>{formatExpiryLabel(announcement.expiresAt)}</Text>
              </View>

              <Text style={styles.content}>{announcement.content}</Text>

              <View style={styles.metaStrip}>
                <View style={[styles.metaChip, { backgroundColor: theme.bodyBackground }]}>
                  <Text style={styles.metaChipLabel}>Published</Text>
                  <Text style={styles.metaChipValue}>{formatTimeLabel(announcement.createdAt)}</Text>
                </View>

                <View style={[styles.metaChip, { backgroundColor: theme.bodyBackground }]}>
                  <Text style={styles.metaChipLabel}>Status</Text>
                  <Text style={styles.metaChipValue}>{formatExpiryLabel(announcement.expiresAt)}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Announcement</Text>
            <Text style={styles.modalBody}>
              This will remove the announcement from the board for everyone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={confirmDelete}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 34,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
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
  deleteButton: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: palette.coral,
    borderWidth: 3,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...brutalShadow(),
  },
  headerSpacer: {
    width: 50,
    height: 50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 42,
  },
  postCard: {
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 24,
    overflow: 'hidden',
    ...brutalShadow(),
  },
  postAccent: {
    height: 10,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  postBody: {
    padding: 16,
  },
  postHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  typeBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTimestamp: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
    marginTop: 8,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  authorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  authorText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
  },
  metaDot: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.textMuted,
  },
  inlineMeta: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
  metaStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  metaChip: {
    flex: 1,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
    padding: 10,
  },
  metaChipLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: palette.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metaChipValue: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  content: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  messageCard: {
    ...brutalCard('#F7E4D8'),
    marginHorizontal: 18,
    marginTop: 10,
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
  },
  messageTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textAlign: 'center',
  },
  messageBody: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
    textAlign: 'center',
  },
  primaryButton: {
    ...brutalButton(palette.mustard),
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  messageActions: {
    width: '100%',
    gap: 12,
    marginTop: 18,
  },
  secondaryMessageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
  },
  secondaryMessageButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 43, 43, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    ...brutalCard('#F7E4D8'),
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 22,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: palette.border,
  },
  modalButtonSecondary: {
    backgroundColor: palette.surface,
  },
  modalButtonDanger: {
    backgroundColor: palette.coral,
  },
  modalButtonText: {
    fontSize: 14,
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
  skeletonWrap: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 18,
  },
  skeletonHero: {
    ...brutalCard('#EBE0F7'),
    borderRadius: 24,
    padding: 16,
  },
  skeletonBody: {
    ...brutalCard('#F7EFE7'),
    borderRadius: 24,
    padding: 16,
  },
  skeletonBadge: {
    width: 116,
    height: 32,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: '#D7C3EF',
    marginBottom: 14,
  },
  skeletonTitle: {
    width: '80%',
    height: 22,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
    marginBottom: 10,
  },
  skeletonTitleShort: {
    width: '56%',
    height: 22,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: '#F7EFE7',
    marginBottom: 14,
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skeletonMetaCard: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: '#F5EEFB',
  },
  skeletonSectionLabel: {
    width: 122,
    height: 16,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.mustard,
    marginBottom: 14,
  },
  skeletonLine: {
    width: '100%',
    height: 16,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
    marginBottom: 10,
  },
  skeletonLineShort: {
    width: '72%',
    height: 16,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: '#F6EEE6',
  },
  shape: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: palette.border,
    zIndex: -1,
  },
  shapeTop: {
    width: 92,
    height: 92,
    borderRadius: 24,
    backgroundColor: '#D7C3EF',
    top: 116,
    right: -14,
    transform: [{ rotate: '16deg' }],
  },
  shapeBottom: {
    width: 118,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F0C7B5',
    bottom: 110,
    left: -18,
    transform: [{ rotate: '-10deg' }],
  },
});
