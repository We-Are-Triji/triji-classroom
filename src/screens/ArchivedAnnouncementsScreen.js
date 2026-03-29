import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../config/firebaseConfig';
import { collection, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import AnnouncementCardSkeleton from '../components/AnnouncementCardSkeleton';
import { logError } from '../utils/errorHandler';
import { brutalButton, brutalCard, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

export default function ArchivedAnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'announcements'),
        where('expiresAt', '<=', new Date()),
        orderBy('expiresAt', 'desc')
      );
      const unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const announcementsList = [];
          querySnapshot.forEach(doc => {
            announcementsList.push({
              id: doc.id,
              ...doc.data(),
            });
          });
          setAnnouncements(announcementsList);
          setLoading(false);
        },
        error => {
          logError(error, 'Fetch Archived Announcements');
          setError('Could not load archived announcements. Please check your internet connection.');
          setLoading(false);
        }
      );
      return unsubscribe;
    } catch (error) {
      logError(error, 'Setup Archived Announcements Listener');
      setError('Could not load archived announcements. Please check your internet connection.');
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe;
    fetchData().then(unsub => {
      unsubscribe = unsub;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

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

  const formatTimestamp = timestamp => {
    if (!timestamp) return '';
    const now = new Date();
    const postTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - postTime;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  const renderAnnouncement = ({ item }) => {
    const typeColor = getTypeColor(item.type);
    const boxShadow = Platform.OS === 'web' ? `0px 8px 32px 0px ${typeColor}22` : undefined;
    return (
      <TouchableOpacity
        style={[styles.announcementCardModernPolished, { borderLeftColor: typeColor, boxShadow }]}
        activeOpacity={0.92}
        onPress={() => navigation.navigate('AnnouncementDetail', { announcementId: item.id })}
      >
        <View style={styles.cardMainModernPolished}>
          <View style={styles.cardAccentBar} />
          <View style={styles.cardContentModernPolished}>
            <View style={styles.cardHeaderModernPolished}>
              <View style={styles.authorPictureModernPolished}>
                <Text style={styles.authorInitialModernPolished}>
                  {item.authorName ? item.authorName.charAt(0).toUpperCase() : 'A'}
                </Text>
              </View>
              <Text style={styles.authorNameModernPolished}>{item.authorName || 'Anonymous'}</Text>
            </View>
            <Text style={styles.titleModernPolished}>{item.title}</Text>
            <View style={styles.cardMetaModernPolished}>
              <View
                style={[
                  styles.typeChipModernPolished,
                  { backgroundColor: getTypeColor(item.type) + '22' },
                ]}
              >
                <Text
                  style={[styles.typeChipTextModernPolished, { color: getTypeColor(item.type) }]}
                >
                  {item.type || 'General'}
                </Text>
              </View>
              <Text style={styles.timestampModernPolished}>{formatTimestamp(item.createdAt)}</Text>
              <Text style={styles.expiryTextModernPolished}>Expired</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundGradient} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.backgroundGradient} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
        style={styles.shiningGradient}
      />
      <TouchableOpacity style={styles.floatingBackButton} onPress={() => navigation.goBack()}>
        <Feather name="arrow-left" size={26} color={palette.text} />
      </TouchableOpacity>
      <View style={styles.mainCardContainer}>
        <View style={styles.bellCircleWrapper}>
          <View style={styles.bellCircleGlow} />
          <View style={styles.bellCircleOutline}>
            {/* Use archive icon for archived announcements */}
            <Feather name="archive" size={32} color={palette.text} style={styles.bellIcon} />
          </View>
        </View>
        <Text style={styles.headerTitleModernCard}>Archived Announcements</Text>
        <Text style={styles.headerSubtextCard}>
          Expired announcements are kept here for your reference.
        </Text>
        <View style={styles.announcementsContent}>
          {loading ? (
            <View style={styles.listContainerModern}>
              <AnnouncementCardSkeleton />
              <AnnouncementCardSkeleton />
              <AnnouncementCardSkeleton />
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.emptyContainerModern}>
              <Feather name="archive" size={64} color={palette.textMuted} />
              <Text style={styles.emptyTitleModern}>No archived announcements</Text>
              <Text style={styles.emptyMessageModern}>Expired announcements will appear here.</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.announcementsScroll}
              contentContainerStyle={styles.listContainerModern}
              showsVerticalScrollIndicator={false}
            >
              {announcements.map(item => renderAnnouncement({ item }))}
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}

// Modern polished styles reused from AnnouncementsScreen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.background,
    opacity: 0.05,
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
    zIndex: 10,
  },
  mainCardContainer: {
    marginTop: Platform.OS === 'ios' ? 100 : 90,
    marginBottom: 20,
    marginHorizontal: 16,
    ...brutalCard(screenAccents.announcements.tertiary),
    borderRadius: 28,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 16,
    maxWidth: 600,
    alignSelf: 'center',
    width: '92%',
    minHeight: 400,
  },
  bellCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 0,
    width: '100%',
    zIndex: 3,
    position: 'relative',
  },
  bellCircleGlow: {
    position: 'absolute',
    top: 2,
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: screenAccents.announcements.primary,
    opacity: 0.7,
    zIndex: 2,
    shadowColor: palette.border,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  bellCircleOutline: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: screenAccents.announcements.secondary,
  },
  bellIcon: {
    zIndex: 4,
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  headerTitleModernCard: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textAlign: 'center',
    width: '100%',
    marginBottom: 4,
    marginTop: 0,
    letterSpacing: 0.2,
  },
  headerSubtextCard: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
    textAlign: 'center',
    width: '100%',
    marginBottom: 16,
    marginTop: 0,
    opacity: 0.85,
    paddingHorizontal: 8,
  },
  announcementsContent: {
    width: '100%',
    flex: 1,
    minHeight: 300,
  },
  announcementsScroll: {
    width: '100%',
    flex: 1,
  },
  listContainerModern: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'stretch',
    gap: 16,
  },
  emptyContainerModern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitleModern: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessageModern: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
    textAlign: 'center',
  },
  announcementCardModernPolished: {
    flexDirection: 'row',
    alignItems: 'stretch',
    ...brutalCard(palette.surface),
    borderRadius: 24,
    borderLeftWidth: 7,
    marginBottom: 0,
    marginTop: 0,
    elevation: 10,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  cardMainModernPolished: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
  },
  cardAccentBar: {
    width: 7,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  cardContentModernPolished: {
    flex: 1,
    padding: 16,
  },
  cardHeaderModernPolished: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  authorPictureModernPolished: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: screenAccents.announcements.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 3,
    borderColor: palette.border,
  },
  authorInitialModernPolished: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  authorNameModernPolished: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    opacity: 0.85,
    flexWrap: 'wrap',
    maxWidth: 120,
  },
  titleModernPolished: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 8,
    lineHeight: 28,
    flexWrap: 'wrap',
  },
  cardMetaModernPolished: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  typeChipModernPolished: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 2,
    marginBottom: 2,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 2,
    borderColor: palette.border,
  },
  typeChipTextModernPolished: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timestampModernPolished: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
    opacity: 0.8,
    marginLeft: 2,
  },
  expiryTextModernPolished: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: palette.coral,
    opacity: 0.9,
    marginLeft: 2,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    ...brutalButton(screenAccents.announcements.primary),
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
  },
  shiningGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
