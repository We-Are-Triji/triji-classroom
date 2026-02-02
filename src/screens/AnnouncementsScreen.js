import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
  TextInput,
  RefreshControl,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebaseConfig';
import { collection, query, orderBy, where, onSnapshot, doc, getDoc, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import AnnouncementCardSkeleton from '../components/AnnouncementCardSkeleton';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function AnnouncementsScreen({ navigation }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const windowWidth = Dimensions.get('window').width;
  const isSmallScreen = windowWidth < 400;

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const fetchData = async () => {
    // Only fetch if user is authenticated
    if (!auth.currentUser) {
      console.log('No authenticated user, skipping announcements fetch');
      setLoading(false);
      setError('Please log in to view announcements');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Set up announcements listener
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(30));

      const unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const announcementsList = [];
          const now = new Date();

          console.log('Firebase query snapshot received, docs count:', querySnapshot.size);

          querySnapshot.forEach(doc => {
            const data = doc.data();
            console.log('Processing announcement:', doc.id, data);

            // Only filter out expired announcements if expiresAt exists
            if (data.expiresAt) {
              const expiresAt = data.expiresAt?.toDate
                ? data.expiresAt.toDate()
                : new Date(data.expiresAt);
              if (expiresAt <= now) {
                console.log('Skipping expired announcement:', doc.id);
                return; // Skip expired announcements
              }
            }

            announcementsList.push({
              id: doc.id,
              ...data,
            });
          });

          console.log('Final announcements list:', announcementsList.length, announcementsList);
          setAnnouncements(announcementsList);
          setLoading(false);
          setInitialLoad(false);
        },
        error => {
          console.error('Firebase error fetching announcements:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);

          let errorMessage = 'Could not load announcements.';
          if (error.code === 'permission-denied') {
            errorMessage = 'Access denied. Please check your authentication status.';
          } else if (error.code === 'unavailable') {
            errorMessage = 'Service temporarily unavailable. Please try again later.';
          } else {
            errorMessage = 'Could not load announcements. Please check your internet connection.';
          }

          setError(errorMessage);
          setLoading(false);
          setInitialLoad(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.log('Error setting up data fetch:', error);
      setError('Could not load announcements. Please check your internet connection.');
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe;

    // Wait for auth state before fetching
    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      if (user) {
        setIsAuthenticated(true);
        try {
          const unsub = await fetchData();
          unsubscribe = unsub;
        } catch (error) {
          console.log('Error in auth state change handler:', error);
          setError('Failed to load announcements');
          setLoading(false);
        }
      } else {
        setIsAuthenticated(false);
        setLoading(false);
        setError('Please log in to view announcements');
        setAnnouncements([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const getTypeColor = type => {
    switch (type) {
      case 'Critical':
        return '#FF3B30';
      case 'Event':
        return '#AF52DE';
      case 'Reminder':
        return '#FF9500';
      default:
        return '#007AFF';
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

  const getTimeRemaining = expiresAt => {
    if (!expiresAt) return '';
    const now = new Date();
    const expiry = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const diffMs = expiry - now;

    if (diffMs <= 0) return 'Expired';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays}d remaining`;
    if (diffHours > 0) return `${diffHours}h remaining`;
    return 'Expires soon';
  };

  // Filter announcements based on search query
  const filteredAnnouncements = announcements.filter(
    announcement =>
      announcement.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAnnouncements = filteredAnnouncements.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);

    // Force a re-fetch by restarting the listener
    try {
      const newUnsubscribe = await fetchData();
      if (newUnsubscribe && typeof newUnsubscribe === 'function') {
        // The listener will automatically update the data
        console.log('Refresh triggered, new listener created');
      }
    } catch (error) {
      console.log('Error during refresh:', error);
    }

    // Give some time for the data to load
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const renderAnnouncement = ({ item }) => {
    const typeColor = getTypeColor(item.type);
    const authorName = item.authorName || item.author || 'Admin';
    // Dynamically adjust font size based on author name length
    const authorFontSize = authorName.length > 20 ? 11 : authorName.length > 15 ? 12 : 13;

    return (
      <TouchableOpacity
        style={[styles.announcementCardCompact, { borderLeftColor: typeColor }]}
        activeOpacity={0.92}
        onPress={() => navigation.navigate('AnnouncementDetail', { announcementId: item.id })}
      >
        <View style={styles.cardContentCompact}>
          <View style={styles.cardHeaderCompact}>
            <View style={styles.authorSection}>
              <Text style={styles.authorLabel}>By:</Text>
              <Text
                style={[styles.authorNameCompact, { fontSize: authorFontSize }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {authorName}
              </Text>
            </View>
            <Text style={styles.timestampCompact}>{formatTimestamp(item.createdAt)}</Text>
          </View>
          <Text style={styles.titleCompact} numberOfLines={2} ellipsizeMode="tail">
            {item.title}
          </Text>
          <View style={styles.cardMetaCompact}>
            <View
              style={[styles.typeChipCompact, { backgroundColor: getTypeColor(item.type) + '22' }]}
            >
              <Text style={[styles.typeChipTextCompact, { color: getTypeColor(item.type) }]}>
                {item.type || 'General'}
              </Text>
            </View>
            {item.expiresAt && (
              <Text style={styles.expiryTextCompact}>{getTimeRemaining(item.expiresAt)}</Text>
            )}
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
      {/* Shining gradient background */}
      <LinearGradient
        colors={['#1B2845', '#23243a', '#22305a', '#3a5a8c', '#23243a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.shiningGradient}
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="bell-ring" size={28} color="#22e584" />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Announcements</Text>
            <Text style={styles.headerSubtext}>All important announcements in one place</Text>
          </View>
        </View>

        {/* Search Bar and New Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Feather
              name="search"
              size={18}
              color="rgba(255,255,255,0.5)"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for news..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Feather name="x" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => navigation.navigate('CreateAnnouncement')}
          >
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.announcementsContent}>
        {initialLoad ? (
          <View style={styles.listContainerModern}>
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
          </View>
        ) : filteredAnnouncements.length === 0 ? (
          <View style={styles.emptyContainerModern}>
            <Feather name="bell" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitleModern}>
              {searchQuery ? 'No matching announcements' : 'No announcements yet'}
            </Text>
            <Text style={styles.emptyMessageModern}>
              {searchQuery ? 'Try a different search term' : 'Check back soon!'}
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={paginatedAnnouncements}
              renderItem={renderAnnouncement}
              keyExtractor={item => item.id}
              style={styles.announcementsScroll}
              contentContainerStyle={styles.listContainerModern}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#22e584"
                  colors={['#22e584', '#FFFFFF']}
                  progressBackgroundColor="rgba(34, 229, 132, 0.1)"
                  titleColor="#FFFFFF"
                  title="Pull to refresh..."
                />
              }
              ListEmptyComponent={() => (
                <View style={styles.emptyContainerModern}>
                  <Feather name="bell" size={64} color="#8E8E93" />
                  <Text style={styles.emptyTitleModern}>
                    {searchQuery ? 'No matching announcements' : 'No announcements yet'}
                  </Text>
                  <Text style={styles.emptyMessageModern}>
                    {searchQuery ? 'Try a different search term' : 'Check back soon!'}
                  </Text>
                </View>
              )}
            />

            {totalPages > 1 && (
              <View style={styles.paginationControls}>
                <TouchableOpacity
                  style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
                  onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <Feather
                    name="chevron-left"
                    size={20}
                    color={currentPage === 1 ? '#555' : '#22e584'}
                  />
                  <Text
                    style={[
                      styles.pageButtonText,
                      currentPage === 1 && styles.pageButtonTextDisabled,
                    ]}
                  >
                    Previous
                  </Text>
                </TouchableOpacity>

                <Text style={styles.pageIndicator}>
                  {currentPage} / {totalPages}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.pageButton,
                    currentPage === totalPages && styles.pageButtonDisabled,
                  ]}
                  onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text
                    style={[
                      styles.pageButtonText,
                      currentPage === totalPages && styles.pageButtonTextDisabled,
                    ]}
                  >
                    Next
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={20}
                    color={currentPage === totalPages ? '#555' : '#22e584'}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  shiningGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34, 229, 132, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 0,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  newButton: {
    backgroundColor: 'rgba(34, 229, 132, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 20,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
  },
  newButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#22e584',
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
    opacity: 0.05,
  },
  archiveButtonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0,0,0,0.08)',
    gap: 8,
  },
  archiveButtonTextGhost: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#007AFF',
    fontWeight: '600',
  },
  addButtonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0,0,0,0.08)',
    gap: 8,
  },
  addButtonTextGhost: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#007AFF',
    fontWeight: '600',
  },
  listContainerModern: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    alignItems: 'stretch',
    gap: 8,
  },
  announcementCardModern: {
    backgroundColor: 'rgba(30, 32, 40, 0.55)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderLeftWidth: 3,
    marginBottom: 0,
    elevation: 3,
    maxHeight: Dimensions.get('window').width / 2,
  },
  cardMainModern: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  cardLeftModern: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 60,
    flexShrink: 0,
  },
  authorPictureModern: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  authorInitialModern: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    zIndex: 1,
  },
  authorNameModern: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
    marginTop: 2,
    marginBottom: 2,
    textAlign: 'center',
    opacity: 0.85,
    flexWrap: 'wrap',
    maxWidth: 90,
  },
  cardRightModern: {
    flex: 1,
    minWidth: 0,
    // Allow content to wrap and expand
    flexShrink: 1,
  },
  titleModern: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginBottom: 10,
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    flexWrap: 'wrap',
  },
  cardMetaModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  typeChipModern: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 2,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: Platform.OS === 'web' ? '0px 2px 6px rgba(0,0,0,0.18)' : undefined,
  },
  typeChipTextModern: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timestampModern: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    opacity: 0.8,
    marginLeft: 2,
  },
  expiryTextModern: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#FF9500',
    opacity: 0.9,
    marginLeft: 2,
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
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  headerModern: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 18,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 2,
    minHeight: 80,
  },
  backButtonModern: {
    position: 'absolute',
    left: 18,
    top: 32,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30,32,40,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.13)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleModern: {
    fontSize: 32, // Larger for prominence
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    textAlign: 'center',
    flex: 1,
    letterSpacing: 0.2,
    marginLeft: 0,
    marginRight: 0,
  },
  actionBarModern: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginBottom: 18,
    marginTop: 0,
    zIndex: 1,
  },
  actionButtonFilled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22e584', // neon green like GWA Calculator
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginHorizontal: 4,
    shadowColor: '#22e584',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonTextFilled: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    letterSpacing: 0.2,
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
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessageModern: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  announcementCardModernPolished: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(30, 32, 40, 0.65)',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.13)',
    borderLeftWidth: 7,
    marginBottom: 0,
    marginTop: 0,
    elevation: 10,
    width: '100%',
    maxWidth: 700,
    maxHeight: Dimensions.get('window').width / 2,
    alignSelf: 'center',
    minWidth: 0,
    backdropFilter: 'blur(18px)', // web only
    shadowColor: '#22e584',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  cardMainModernPolished: {
    flexDirection: 'row',
    alignItems: 'stretch',
    flex: 1,
  },
  cardAccentBar: {
    width: 7,
    backgroundColor: 'transparent', // color set by borderLeftColor
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
  },
  cardContentModernPolished: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  cardHeaderModernPolished: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  authorPictureModernPolished: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
    elevation: 1,
  },
  authorInitialModernPolished: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  authorNameModernPolished: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: '#fff',
    opacity: 0.85,
    flexWrap: 'wrap',
    maxWidth: 120,
  },
  titleModernPolished: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 24,
    flexWrap: 'wrap',
  },
  cardMetaModernPolished: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  typeChipModernPolished: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2,
    marginBottom: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
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
    color: '#8E8E93',
    opacity: 0.8,
    marginLeft: 2,
  },
  expiryTextModernPolished: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#FF9500',
    opacity: 0.9,
    marginLeft: 2,
  },
  fixedActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 18,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  shiningGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glowCircle: {
    position: 'absolute',
    top: 60,
    left: '50%',
    marginLeft: -90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#22e58433',
    opacity: 0.45,
    zIndex: 1,
    shadowColor: '#22e584',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
    elevation: 10,
  },
  bellContainer: {
    position: 'absolute',
    top: -36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 3,
  },
  bellIcon: {
    zIndex: 4,
    textShadowColor: '#22e58499',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  bellGlow: {
    position: 'absolute',
    top: 2,
    left: '50%',
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22e58444',
    opacity: 0.7,
    zIndex: 2,
    shadowColor: '#22e584',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 8,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 24,
    left: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30,32,40,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.13)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 10,
  },
  mainCardContainer: {
    marginTop: 104,
    marginBottom: 32, // Card floats above bottom
    marginHorizontal: 12,
    backgroundColor: 'rgba(18, 22, 34, 0.92)',
    borderRadius: 28, // Fully rounded corners
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20, // Extra space for buttons
    paddingHorizontal: 0,
    shadowColor: '#22e584',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 32,
    elevation: 12,
    maxWidth: 420,
    alignSelf: 'center',
    width: '92%',
    position: 'relative',
    zIndex: 2,
    flexDirection: 'column',
    display: 'flex',
    flex: 1,
  },
  announcementsContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  announcementsScroll: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 100 : 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22e584',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fixedActionBarCard: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(18, 18, 18, 0.85)',
    borderRadius: 18,
    marginTop: 8,
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  bellContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
    position: 'relative',
    zIndex: 3,
  },
  headerTitleModernCard: {
    fontSize: 26, // Reduced from 32
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    textAlign: 'center',
    width: '100%',
    marginBottom: 2,
    marginTop: 0,
    letterSpacing: 0.2,
    zIndex: 3,
  },
  headerSubtextCard: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#b6c2d1',
    textAlign: 'center',
    width: '100%',
    marginBottom: 12,
    marginTop: 0,
    opacity: 0.85,
    zIndex: 3,
  },
  actionBarCardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderRadius: 0,
    marginTop: 'auto', // Push buttons to bottom
    width: '90%',
    alignSelf: 'center',
    zIndex: 10,
  },
  actionButtonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#22e584',
    marginHorizontal: 4,
    shadowColor: 'transparent',
  },
  actionButtonTextGhost: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#22e584',
    letterSpacing: 0.2,
  },
  actionButtonGlow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22e584',
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginHorizontal: 4,
    shadowColor: '#22e584',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 4,
  },
  actionButtonTextGlow: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
    letterSpacing: 0.2,
    textShadowColor: '#22e58499',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
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
  bellCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#101c1c',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    borderWidth: 2,
    borderColor: '#22e584',
    shadowColor: '#22e584',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  bellCircleGlow: {
    position: 'absolute',
    top: 2,
    left: '50%',
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#22e58444',
    opacity: 0.7,
    zIndex: 2,
    shadowColor: '#22e584',
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
    borderWidth: 2.5,
    borderColor: '#22e584',
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
  },
  paginationInfo: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(34, 229, 132, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  paginationText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(34, 229, 132, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
  },
  pageButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pageButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#22e584',
  },
  pageButtonTextDisabled: {
    color: '#555',
  },
  pageIndicator: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  // Compact card styles (matching dashboard)
  announcementCardCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderLeftWidth: 4,
    marginBottom: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContentCompact: {
    flex: 1,
    gap: 6,
  },
  cardHeaderCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  authorLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255, 255, 255, 0.6)',
    marginRight: 4,
  },
  authorNameCompact: {
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    flex: 1,
  },
  timestampCompact: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255, 255, 255, 0.5)',
    flexShrink: 0,
  },
  titleCompact: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 4,
  },
  cardMetaCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeChipCompact: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeChipTextCompact: {
    fontSize: 10,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  expiryTextCompact: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: '#FF9500',
    opacity: 0.8,
  },
});
