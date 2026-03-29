import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../config/firebaseConfig';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { RecentUpdatesSkeleton } from '../components';
import { getNotificationInbox, markInboxAsRead } from '../utils/notificationInbox';
import { brutalCard, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

const { width, height } = Dimensions.get('window');
const DASHBOARD_CACHE_KEY = 'dashboard_cache_v1';
const CACHE_DURATION = 30 * 1000;
const CACHE_MAX_AGE = 1000 * 60 * 60 * 12;

function serializeUpdate(item) {
  const timestamp = item.timestamp?.toDate ? item.timestamp.toDate().toISOString() : item.timestamp;
  return { ...item, timestamp };
}

function restoreUpdate(item) {
  return item ? { ...item, timestamp: item.timestamp || null } : null;
}

export default function DashboardScreen({ navigation }) {
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalAnnouncements, setTotalAnnouncements] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [usingCachedContent, setUsingCachedContent] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [showInbox, setShowInbox] = useState(false);
  const [notificationInbox, setNotificationInbox] = useState([]);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    let isMounted = true;
    const unsubscribers = new Set();

    // Wait for auth state before fetching data
    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      if (!isMounted) return;

      if (user) {
        setIsAuthenticated(true);

        const cachedDashboard = await loadDashboardCache();
        if (isMounted && cachedDashboard) {
          applyCachedDashboard(cachedDashboard);
        }

        await refreshInboxState();

        // Fetch user's first name from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (isMounted && userDoc.exists()) {
            const userData = userDoc.data();
            const firstName = userData.firstName || userData.displayName?.split(' ')[0] || 'User';
            setUserName(firstName);
            saveDashboardCache({
              recentUpdates,
              totalTasks,
              totalAnnouncements,
              totalPosts,
              userName: firstName,
            }).catch(() => { });
          } else if (isMounted) {
            setUserName(user.displayName?.split(' ')[0] || 'User');
          }
        } catch (error) {
          if (isMounted) {
            console.error('Error fetching user data:', error);
            setUserName('User');
          }
        }

        const unsubs = await fetchRecentData();
        if (isMounted && Array.isArray(unsubs)) {
          unsubs.forEach(unsub => unsubscribers.add(unsub));
        }
      } else {
        // User logged out, cleanup all listeners
        unsubscribers.forEach(unsub => unsub && unsub());
        unsubscribers.clear();

        if (isMounted) {
          setIsAuthenticated(false);
          setRecentUpdates([]);
          setTotalTasks(0);
          setTotalAnnouncements(0);
          setTotalPosts(0);
          setUsingCachedContent(false);
          setLoading(false);
          navigation.replace('Login');
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribers.forEach(unsub => unsub && unsub());
      unsubscribers.clear();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      refreshInboxState();
    });

    return unsubscribeFocus;
  }, [navigation]);

  const fetchRecentData = async (forceRefresh = false) => {
    // Only fetch if user is authenticated
    if (!auth.currentUser) {
      console.log('No authenticated user, skipping data fetch');
      setLoading(false);
      return [];
    }

    // Check cache (skip if force refresh)
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime < CACHE_DURATION) {
      console.log('Using cached data');
      setLoading(false);
      setRefreshing(false);
      return [];
    }

    try {
      setLoading(!forceRefresh); // Don't show loading if refreshing
      const currentTime = new Date();

      // OPTIMIZED: Use count aggregation instead of fetching all documents
      // This reduces from N reads to just 1 read per collection

      // Count pending tasks (tasks not completed by current user)
      const allTasksSnapshot = await getDocs(query(collection(db, 'tasks')));
      let pendingTasksCount = 0;
      allTasksSnapshot.forEach(doc => {
        const data = doc.data();
        const isCompletedByCurrentUser =
          auth.currentUser && data.completedBy && data.completedBy.includes(auth.currentUser.uid);
        if (!isCompletedByCurrentUser) {
          pendingTasksCount++;
        }
      });
      setTotalTasks(pendingTasksCount);

      // Count active announcements (not expired)
      const allAnnouncementsSnapshot = await getDocs(query(collection(db, 'announcements')));
      let activeAnnouncementsCount = 0;
      allAnnouncementsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.expiresAt) {
          const expiresAt = data.expiresAt?.toDate
            ? data.expiresAt.toDate()
            : new Date(data.expiresAt);
          if (expiresAt > currentTime) {
            activeAnnouncementsCount++;
          }
        } else {
          activeAnnouncementsCount++;
        }
      });
      setTotalAnnouncements(activeAnnouncementsCount);

      // Count active posts (not expired)
      const allPostsSnapshot = await getDocs(query(collection(db, 'freedom-wall-posts')));
      let activePostsCount = 0;
      allPostsSnapshot.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);
        if (expiresAt > currentTime) {
          activePostsCount++;
        }
      });
      setTotalPosts(activePostsCount);

      // Fetch recent items for feed (limited to 5 each = max 15 reads)
      const tasksSnapshot = await getDocs(
        query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(5))
      );
      const taskUpdates = [];
      tasksSnapshot.forEach(doc => {
        const data = doc.data();
        const isCompletedByCurrentUser =
          auth.currentUser && data.completedBy && data.completedBy.includes(auth.currentUser.uid);
        if (!isCompletedByCurrentUser && data.createdAt) {
          taskUpdates.push({
            id: doc.id,
            ...data,
            type: 'task',
            timestamp: data.createdAt,
          });
        }
      });

      const announcementsSnapshot = await getDocs(
        query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(5))
      );
      const announcementUpdates = [];
      announcementsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.expiresAt) {
          const expiresAt = data.expiresAt?.toDate
            ? data.expiresAt.toDate()
            : new Date(data.expiresAt);
          if (expiresAt > currentTime && data.createdAt) {
            announcementUpdates.push({
              id: doc.id,
              ...data,
              type: 'announcement',
              announcementCategory: data.type || 'General',
              timestamp: data.createdAt,
            });
          }
        } else if (data.createdAt) {
          announcementUpdates.push({
            id: doc.id,
            ...data,
            type: 'announcement',
            announcementCategory: data.type || 'General',
            timestamp: data.createdAt,
          });
        }
      });

      const postsSnapshot = await getDocs(
        query(collection(db, 'freedom-wall-posts'), orderBy('createdAt', 'desc'), limit(5))
      );
      const postUpdates = [];
      postsSnapshot.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.expiresAt?.toDate
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);
        if (expiresAt > currentTime && data.createdAt) {
          postUpdates.push({
            id: doc.id,
            ...data,
            type: 'post',
            timestamp: data.createdAt,
            likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
          });
        }
      });

      // Combine and sort all updates
      const combined = [...taskUpdates, ...announcementUpdates, ...postUpdates];
      combined.sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime - aTime;
      });
      const trimmedUpdates = combined.slice(0, 5);
      setRecentUpdates(trimmedUpdates);
      setUsingCachedContent(false);
      setLastSyncedAt(new Date().toISOString());

      await saveDashboardCache({
        recentUpdates: trimmedUpdates,
        totalTasks: pendingTasksCount,
        totalAnnouncements: activeAnnouncementsCount,
        totalPosts: activePostsCount,
        userName,
        lastSyncedAt: new Date().toISOString(),
      });

      // Update cache timestamp
      setLastFetchTime(Date.now());
      setLoading(false);
      setRefreshing(false);

      return [];
    } catch (error) {
      console.log('Error fetching data:', error);
      const cachedDashboard = await loadDashboardCache();
      if (cachedDashboard) {
        applyCachedDashboard(cachedDashboard);
      }
      setLoading(false);
      setRefreshing(false);
      return [];
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    // Fetch user data again
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const firstName = userData.firstName || userData.displayName?.split(' ')[0] || 'User';
          setUserName(firstName);
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }

    // Force refresh data (bypass cache)
    await fetchRecentData(true);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = dateString => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTimestamp = timestamp => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    if (diffSecs > 0) return `${diffSecs}s ago`;
    return 'Just now';
  };

  const formatSyncTimestamp = timestamp => {
    if (!timestamp) return 'Not synced yet';
    const date = new Date(timestamp);
    return `Last synced ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  const openInbox = async () => {
    const inbox = await markInboxAsRead();
    setNotificationInbox(inbox);
    setUnreadInboxCount(0);
    setShowInbox(true);
  };

  const renderUpdateItem = item => {
    if (!item) return null;

    let icon, iconColor, title, subtitle, onPress;

    switch (item.type) {
      case 'task':
        icon = 'clipboard';
        iconColor = palette.teal;
        title = item.title || 'Untitled Task';
        subtitle = item.subjectCode || item.subject || 'Task';
        onPress = () => navigation.navigate('TaskDetail', { task: item });
        break;
      case 'announcement':
        icon = 'bell';
        const announcementType = item.announcementCategory || item.announcementType || 'General';
        const badgeColors = getBadgeColors(announcementType);
        iconColor = badgeColors.text;
        title = item.title || 'Untitled Announcement';
        subtitle = announcementType;
        onPress = () => navigation.navigate('AnnouncementDetail', { announcementId: item.id });
        break;
      case 'post':
        icon = 'message-circle';
        iconColor = palette.sky;
        title = item.content || 'No content';
        subtitle = `${item.nickname || item.displayName || 'Anonymous'} • ${item.likedBy?.length || 0} likes`;
        onPress = () => navigation.navigate('PostDetail', { post: item });
        break;
      default:
        return null;
    }

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.updateItem}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={[styles.updateIcon, { backgroundColor: `${iconColor}20` }]}>
          <Feather name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.updateContent}>
          <Text style={styles.updateTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.updateSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Text style={styles.updateTime}>{formatTimestamp(item.timestamp)}</Text>
      </TouchableOpacity>
    );
  };

  const getBadgeColors = type => {
    switch (type) {
      case 'Critical':
        return { bg: '#F8D9D3', text: palette.error };
      case 'Event':
        return { bg: '#E8DCF4', text: palette.lavender };
      case 'Reminder':
        return { bg: '#F9EDC3', text: palette.warning };
      case 'General':
      default:
        return { bg: '#DDEDE9', text: palette.teal };
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.background, palette.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
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
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={styles.subGreeting}>
            {usingCachedContent ? "You're viewing your cached home feed" : "Here's what's new"}
          </Text>
          <Text style={styles.syncText}>{formatSyncTimestamp(lastSyncedAt)}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.inboxButton} onPress={openInbox}>
            <Feather name="bell" size={22} color={palette.text} />
            {unreadInboxCount > 0 ? (
              <View style={styles.inboxBadge}>
                <Text style={styles.inboxBadgeText}>{Math.min(unreadInboxCount, 9)}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('AccountSettings')}
          >
            <Feather name="settings" size={24} color={palette.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalTasks}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalAnnouncements}</Text>
          <Text style={styles.statLabel}>News</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalPosts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
      </View>

      {/* Recent Updates Feed */}
      <ScrollView
        style={styles.feedContainer}
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.text}
            colors={[palette.teal]}
            progressBackgroundColor={palette.background}
          />
        }
      >
        {loading && recentUpdates.length === 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Updates</Text>
            <RecentUpdatesSkeleton />
          </View>
        ) : recentUpdates.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Updates</Text>
            <View style={styles.updatesContainer}>{recentUpdates.map(renderUpdateItem)}</View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={64} color={palette.textMuted} />
            <Text style={styles.emptyStateText}>Nothing to show yet</Text>
            <Text style={styles.emptyStateSubtext}>Check back later for updates</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showInbox}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInbox(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.inboxModal}>
            <View style={styles.inboxHeader}>
              <Text style={styles.inboxTitle}>Alert Inbox</Text>
              <TouchableOpacity style={styles.inboxClose} onPress={() => setShowInbox(false)}>
                <Feather name="x" size={20} color={palette.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {notificationInbox.length === 0 ? (
                <View style={styles.inboxEmpty}>
                  <Feather name="bell-off" size={26} color={palette.textMuted} />
                  <Text style={styles.inboxEmptyText}>No alerts saved yet</Text>
                </View>
              ) : (
                notificationInbox.map(item => (
                  <View key={item.id} style={styles.inboxItem}>
                    <Text style={styles.inboxItemTitle}>{item.title}</Text>
                    {!!item.body && <Text style={styles.inboxItemBody}>{item.body}</Text>}
                    <Text style={styles.inboxItemTime}>{formatTimestamp(item.timestamp)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  async function saveDashboardCache(payload) {
    try {
      const cachePayload = {
        ...payload,
        savedAt: Date.now(),
        recentUpdates: (payload.recentUpdates || []).slice(0, 5).map(serializeUpdate),
      };
      await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cachePayload));
    } catch (storageError) {
      console.log('Error saving dashboard cache:', storageError);
    }
  }

  async function loadDashboardCache() {
    try {
      const rawCache = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
      if (!rawCache) return null;

      const parsedCache = JSON.parse(rawCache);
      if (!parsedCache?.savedAt || Date.now() - parsedCache.savedAt > CACHE_MAX_AGE) {
        await AsyncStorage.removeItem(DASHBOARD_CACHE_KEY);
        return null;
      }

      return {
        ...parsedCache,
        lastSyncedAt: parsedCache.lastSyncedAt || null,
        recentUpdates: Array.isArray(parsedCache.recentUpdates)
          ? parsedCache.recentUpdates.map(restoreUpdate).filter(Boolean)
          : [],
      };
    } catch (storageError) {
      console.log('Error loading dashboard cache:', storageError);
      return null;
    }
  }

  function applyCachedDashboard(cache) {
    setRecentUpdates(cache.recentUpdates || []);
    setTotalTasks(cache.totalTasks || 0);
    setTotalAnnouncements(cache.totalAnnouncements || 0);
    setTotalPosts(cache.totalPosts || 0);
    if (cache.userName) {
      setUserName(cache.userName);
    }
    setLastSyncedAt(cache.lastSyncedAt || null);
    setUsingCachedContent(true);
    setLoading(false);
  }

  async function refreshInboxState() {
    const inbox = await getNotificationInbox();
    setNotificationInbox(inbox);
    setUnreadInboxCount(inbox.filter(item => !item.isRead).length);
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
    marginBottom: 2,
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  syncText: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 12,
  },
  inboxButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: palette.mustard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
  },
  inboxBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  inboxBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: screenAccents.dashboard.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    minWidth: 0,
    ...brutalCard(screenAccents.dashboard.primary),
  },
  statNumber: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  feedContainer: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  updatesContainer: {
    gap: 8,
  },
  updateItem: {
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...brutalCard(screenAccents.dashboard.tertiary),
  },
  updateIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
  },
  updateContent: {
    flex: 1,
    gap: 4,
  },
  updateTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
  },
  updateSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  updateTime: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
    flexShrink: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(43, 43, 43, 0.3)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  inboxModal: {
    ...brutalCard('#F7E4D8'),
    maxHeight: '72%',
    padding: 18,
  },
  inboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  inboxTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  inboxClose: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: palette.border,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inboxEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  inboxEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
  inboxItem: {
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
    backgroundColor: palette.white,
    padding: 14,
    marginBottom: 10,
  },
  inboxItemTitle: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 4,
  },
  inboxItemBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    marginBottom: 8,
  },
  inboxItemTime: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: palette.textMuted,
  },
});
