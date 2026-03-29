import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TextInput,
  RefreshControl,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { auth, db } from '../config/firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import AnnouncementCardSkeleton from '../components/AnnouncementCardSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { brutalButton, brutalCard, brutalInput, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

const ITEMS_PER_PAGE = 10;

const typeThemes = {
  Critical: {
    accent: palette.coral,
    cardBackground: '#F8DBD1',
    badgeBackground: '#F3BCA9',
    pillBackground: '#F7EBE4',
    icon: 'alert-octagon',
  },
  Event: {
    accent: palette.lavender,
    cardBackground: '#EBE0F7',
    badgeBackground: '#D7C3EF',
    pillBackground: '#F5EEFB',
    icon: 'calendar-star',
  },
  Reminder: {
    accent: palette.peach,
    cardBackground: '#F8E2CC',
    badgeBackground: '#F2C291',
    pillBackground: '#F8EFE6',
    icon: 'clock-time-four-outline',
  },
  General: {
    accent: palette.sky,
    cardBackground: '#DDEAF2',
    badgeBackground: '#B9D0E1',
    pillBackground: '#EEF5F8',
    icon: 'bell-ring-outline',
  },
};

function getTypeTheme(type) {
  return typeThemes[type] || typeThemes.General;
}

function normalizeDate(timestamp) {
  if (!timestamp) return null;
  return timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
}

function formatRelativeTime(timestamp) {
  const date = normalizeDate(timestamp);
  if (!date) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return 'Just now';
}

function formatExpiryLabel(expiresAt) {
  const expiry = normalizeDate(expiresAt);
  if (!expiry) return null;

  const diffMs = expiry.getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) return `${diffDays}d left`;
  if (diffHours > 0) return `${diffHours}h left`;
  return 'Ends soon';
}

export default function AnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [pinnedAnnouncementIds, setPinnedAnnouncementIds] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    let unsubscribeAnnouncements = null;
    let unsubscribeUser = null;

    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (!user) {
        setAnnouncements([]);
        setPinnedAnnouncementIds([]);
        setLastSyncedAt(null);
        setError('Please log in to view announcements.');
        setInitialLoad(false);
        return;
      }

      setError(null);
      setInitialLoad(true);
      unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), snapshot => {
        const userData = snapshot.data() || {};
        setPinnedAnnouncementIds(
          Array.isArray(userData.pinnedAnnouncementIds) ? userData.pinnedAnnouncementIds : []
        );
      });

      const announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(30)
      );

      unsubscribeAnnouncements = onSnapshot(
        announcementsQuery,
        querySnapshot => {
          const now = new Date();
          const nextAnnouncements = [];

          querySnapshot.forEach(snapshot => {
            const data = snapshot.data();
            const expiry = normalizeDate(data.expiresAt);

            if (expiry && expiry <= now) {
              return;
            }

            nextAnnouncements.push({
              id: snapshot.id,
              ...data,
            });
          });

          setAnnouncements(nextAnnouncements);
          setLastSyncedAt(new Date().toISOString());
          setError(null);
          setInitialLoad(false);
          setRefreshing(false);
        },
        snapshotError => {
          let message = 'Could not load announcements.';

          if (snapshotError.code === 'permission-denied') {
            message = 'Access denied. Please check your account permissions.';
          } else if (snapshotError.code === 'unavailable') {
            message = 'The service is temporarily unavailable. Please try again.';
          }

          setAnnouncements([]);
          setError(message);
          setInitialLoad(false);
          setRefreshing(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) {
        unsubscribeUser();
      }
      if (unsubscribeAnnouncements) {
        unsubscribeAnnouncements();
      }
    };
  }, [reloadKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredAnnouncements = announcements.filter(announcement => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return true;

    return (
      announcement.title?.toLowerCase().includes(search) ||
      announcement.content?.toLowerCase().includes(search) ||
      announcement.authorName?.toLowerCase().includes(search) ||
      announcement.type?.toLowerCase().includes(search)
    );
  });

  const orderedAnnouncements = useMemo(() => {
    return [...filteredAnnouncements].sort((a, b) => {
      const aPinned = pinnedAnnouncementIds.includes(a.id);
      const bPinned = pinnedAnnouncementIds.includes(b.id);

      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }

      const aDate = normalizeDate(a.createdAt) || new Date(0);
      const bDate = normalizeDate(b.createdAt) || new Date(0);
      return bDate - aDate;
    });
  }, [filteredAnnouncements, pinnedAnnouncementIds]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAnnouncements = orderedAnnouncements.slice(startIndex, endIndex);
  const totalPages = Math.max(1, Math.ceil(orderedAnnouncements.length / ITEMS_PER_PAGE));

  const formatSyncLabel = timestamp => {
    if (!timestamp) return 'Sync pending';
    const date = new Date(timestamp);
    return `Last synced ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const togglePinAnnouncement = async announcementId => {
    if (!auth.currentUser) return;

    const userRef = doc(db, 'users', auth.currentUser.uid);
    const isPinned = pinnedAnnouncementIds.includes(announcementId);

    try {
      await updateDoc(userRef, {
        pinnedAnnouncementIds: isPinned
          ? arrayRemove(announcementId)
          : arrayUnion(announcementId),
      });
    } catch (pinError) {
      console.error('Error pinning announcement:', pinError);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    setReloadKey(prev => prev + 1);
  };

  const renderAnnouncement = ({ item }) => {
    const theme = getTypeTheme(item.type);
    const authorName = item.authorName || item.author || 'Campus team';
    const expiryLabel = formatExpiryLabel(item.expiresAt);
    const isPinned = pinnedAnnouncementIds.includes(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.announcementCard, { backgroundColor: theme.cardBackground }]}
        onPress={() => navigation.navigate('AnnouncementDetail', { announcementId: item.id })}
      >
        <View style={[styles.accentRail, { backgroundColor: theme.accent }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={[styles.typeBadge, { backgroundColor: theme.badgeBackground }]}>
              <MaterialCommunityIcons name={theme.icon} size={16} color={palette.text} />
              <Text style={styles.typeBadgeText}>{item.type || 'General'}</Text>
            </View>
            <View style={styles.cardHeaderRight}>
              <Text style={styles.cardTimestamp}>{formatRelativeTime(item.createdAt)}</Text>
              <TouchableOpacity
                style={[styles.pinButton, isPinned && styles.pinButtonActive]}
                onPress={event => {
                  event.stopPropagation();
                  togglePinAnnouncement(item.id);
                }}
              >
                <MaterialCommunityIcons
                  name={isPinned ? 'star' : 'star-outline'}
                  size={16}
                  color={palette.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.cardPreview} numberOfLines={3}>
            {item.content}
          </Text>

          <View style={styles.cardFooter}>
            <View style={[styles.metaPill, { backgroundColor: theme.pillBackground }]}>
              <Feather name="user" size={14} color={palette.text} />
              <Text style={styles.metaPillText} numberOfLines={1}>
                {authorName}
              </Text>
            </View>

            {expiryLabel ? (
              <View style={[styles.metaPill, styles.expiryPill]}>
                <Feather name="clock" size={14} color={palette.text} />
                <Text style={styles.metaPillText}>{expiryLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
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
          <Text style={styles.loadingText}>Loading announcements...</Text>
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

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="bullhorn-outline" size={28} color={palette.text} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.headerTitle}>Announcements</Text>
            <Text style={styles.headerSubtext}>Fresh reminders, events, and urgent updates</Text>
            <Text style={styles.syncLabel}>{formatSyncLabel(lastSyncedAt)}</Text>
          </View>
          <View style={styles.heroCount}>
            <Text style={styles.heroCountNumber}>{orderedAnnouncements.length}</Text>
            <Text style={styles.heroCountLabel}>Live</Text>
          </View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color={palette.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              placeholder="Search titles, types, or authors"
              placeholderTextColor={palette.textMuted}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={palette.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.composeButton}
            onPress={() => navigation.navigate('CreateAnnouncement')}
          >
            <Feather name="plus" size={18} color={palette.text} />
            <Text style={styles.composeButtonText}>Compose</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!initialLoad && orderedAnnouncements.length > 0 ? (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationInfoText}>
            Showing {startIndex + 1}-{Math.min(endIndex, orderedAnnouncements.length)} of {orderedAnnouncements.length}
          </Text>
        </View>
      ) : null}

      <View style={styles.contentArea}>
        {error ? (
          <View style={styles.messageCard}>
            <Feather name="wifi-off" size={28} color={palette.text} />
            <Text style={styles.messageTitle}>Announcements unavailable</Text>
            <Text style={styles.messageBody}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : initialLoad ? (
          <View style={styles.listContainer}>
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
          </View>
        ) : orderedAnnouncements.length === 0 ? (
          <View style={styles.messageCard}>
            <Feather name="inbox" size={28} color={palette.text} />
            <Text style={styles.messageTitle}>
              {searchQuery ? 'No matching announcements' : 'No announcements yet'}
            </Text>
            <Text style={styles.messageBody}>
              {searchQuery
                ? 'Try a different keyword or clear the search bar.'
                : 'Fresh updates will land here as soon as they are published.'}
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={paginatedAnnouncements}
              keyExtractor={item => item.id}
              renderItem={renderAnnouncement}
              style={styles.list}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={palette.teal}
                  colors={[palette.teal, palette.mustard]}
                  progressBackgroundColor={palette.surface}
                  titleColor={palette.text}
                  title="Refreshing..."
                />
              }
            />

            {totalPages > 1 ? (
              <View style={styles.paginationBar}>
                <TouchableOpacity
                  style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  <Feather name="chevron-left" size={18} color={palette.text} />
                  <Text style={styles.pageButtonText}>Prev</Text>
                </TouchableOpacity>

                <Text style={styles.pageIndicator}>
                  Page {currentPage} of {totalPages}
                </Text>

                <TouchableOpacity
                  style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  <Text style={styles.pageButtonText}>Next</Text>
                  <Feather name="chevron-right" size={18} color={palette.text} />
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 38,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  contentArea: {
    flex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: screenAccents.announcements.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
  },
  heroText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerSubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  syncLabel: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
  heroCount: {
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.mustard,
    ...brutalShadow(3, 3),
  },
  heroCountNumber: {
    fontSize: 22,
    lineHeight: 24,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  heroCountLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  toolbar: {
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...brutalInput(palette.white),
    paddingHorizontal: 14,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    paddingVertical: 0,
  },
  composeButton: {
    ...brutalButton(screenAccents.announcements.primary),
    width: '100%',
    height: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  composeButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
  },
  paginationInfo: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  paginationInfoText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
  announcementCard: {
    flexDirection: 'row',
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    ...brutalShadow(),
  },
  accentRail: {
    width: 14,
    borderRightWidth: 3,
    borderRightColor: palette.border,
  },
  cardBody: {
    flex: 1,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
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
  cardTimestamp: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
    marginTop: 4,
  },
  pinButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinButtonActive: {
    backgroundColor: palette.mustard,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 10,
  },
  cardPreview: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 16,
  },
  metaPill: {
    maxWidth: '100%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F7EFE7',
  },
  expiryPill: {
    maxWidth: '100%',
    backgroundColor: palette.surface,
  },
  metaPillText: {
    flexShrink: 1,
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
  },
  messageCard: {
    ...brutalCard('#F7E4D8'),
    marginHorizontal: 18,
    marginTop: 8,
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
  retryButton: {
    ...brutalButton(screenAccents.announcements.primary),
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryButtonText: {
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
  paginationBar: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    ...brutalCard('#F6EEE6'),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 22,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.mustard,
  },
  pageButtonDisabled: {
    opacity: 0.45,
  },
  pageButtonText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  pageIndicator: {
    fontSize: 13,
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
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: '#F0C7B5',
    top: 110,
    right: -18,
    transform: [{ rotate: '14deg' }],
  },
  shapeMiddle: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#D9C8F1',
    top: 330,
    left: -16,
    transform: [{ rotate: '-10deg' }],
  },
  shapeBottom: {
    width: 130,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#D7E6EF',
    bottom: 120,
    right: -26,
    transform: [{ rotate: '-8deg' }],
  },
});
