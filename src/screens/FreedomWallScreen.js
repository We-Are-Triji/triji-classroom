import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db } from '../config/firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  runTransaction,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import PostCard from '../components/PostCard';
import { useNetwork } from '../context/NetworkContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { logError, showErrorAlert } from '../utils/errorHandler';

export default function FreedomWallScreen({ navigation }) {
  const { isConnected, registerSyncCallback } = useNetwork();
  const [posts, setPosts] = useState([]);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [customNickname, setCustomNickname] = useState('');
  const [posting, setPosting] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FFFACD');
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState('Oldest to Newest');
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [cardWidth, setCardWidth] = useState(Dimensions.get('window').width * 0.92);
  const [numColumns, setNumColumns] = useState(3);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  const combinedPosts = useMemo(() => {
    return [...posts, ...pendingPosts];
  }, [posts, pendingPosts]);

  // Pagination
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPosts = combinedPosts.slice(startIndex, endIndex);
  const totalPages = Math.ceil(combinedPosts.length / ITEMS_PER_PAGE);

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    // Data will refresh automatically through onSnapshot listener
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const colorPalette = [
    '#FFFACD', // Pale yellow
    '#E6F3FF', // Light blue
    '#FFE6F0', // Soft pink
    '#E6FFE6', // Mint green
    '#F0E6FF', // Light purple
    '#FFE6CC', // Peach
  ];

  const getTextColor = backgroundColor => {
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#2C2C2C' : '#FFFFFF';
  };

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const fetchPosts = () => {
    // Only fetch if user is authenticated
    if (!auth.currentUser) {
      setLoading(false);
      setError('Please log in to view posts');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      let q;

      switch (sortBy) {
        case 'Newest to Oldest':
          q = query(collection(db, 'freedom-wall-posts'), orderBy('createdAt', 'desc'), limit(50));
          break;
        case 'Oldest to Newest':
          q = query(collection(db, 'freedom-wall-posts'), orderBy('createdAt', 'asc'), limit(50));
          break;
        case 'Most Hearts':
          q = query(collection(db, 'freedom-wall-posts'), orderBy('likeCount', 'desc'), limit(50));
          break;
        case 'Fewest Hearts':
          q = query(collection(db, 'freedom-wall-posts'), orderBy('likeCount', 'asc'), limit(50));
          break;
        default:
          q = query(collection(db, 'freedom-wall-posts'), orderBy('createdAt', 'asc'), limit(50));
      }

      const unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const postsList = [];
          const postsToDelete = [];
          const now = new Date();
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          querySnapshot.forEach(docSnapshot => {
            const data = docSnapshot.data();

            // Get timestamps
            const expiresAt = data.expiresAt?.toDate
              ? data.expiresAt.toDate()
              : new Date(data.expiresAt);
            const createdAt = data.createdAt?.toDate
              ? data.createdAt.toDate()
              : new Date(data.createdAt);

            // STRICT: Delete if either:
            // 1. expiresAt is in the past, OR
            // 2. createdAt is more than 24 hours ago (backup check)
            const isExpired = expiresAt <= now || createdAt < twentyFourHoursAgo;

            if (!isExpired) {
              postsList.push({
                id: docSnapshot.id,
                ...data,
                likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
                reportedBy: Array.isArray(data.reportedBy) ? data.reportedBy : [],
              });
            } else {
              // Collect expired posts for batch deletion
              postsToDelete.push(docSnapshot.id);
            }
          });

          setPosts(postsList);
          setLoading(false);
          setIsInitialLoading(false);

          // Batch delete expired posts after snapshot processing
          if (postsToDelete.length > 0) {
            Promise.all(
              postsToDelete.map(id => deleteDoc(doc(db, 'freedom-wall-posts', id)))
            ).catch(error => {
              logError(error, 'Batch Delete Expired Posts');
            });
          }
        },
        error => {
          logError(error, 'Fetch Posts');
          setError('Could not load the Freedom Wall');
          setLoading(false);
          setIsInitialLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      logError(error, 'Setup Posts Listener');
      setError('Could not load the Freedom Wall');
      setLoading(false);
      return null;
    }
  };

  useEffect(() => {
    let unsubscribePosts;

    // Wait for auth state before fetching
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (user) {
        setIsAuthenticated(true);
        unsubscribePosts = fetchPosts();
      } else {
        setIsAuthenticated(false);
        setLoading(false);
        setError('Please log in to view posts');
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribePosts) unsubscribePosts();
    };
  }, [sortBy]);

  // Listen for screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      // Recalculate layout when screen dimensions change
      setTimeout(() => {
        // Force a re-layout by updating a state that triggers handleCardLayout
        setCardWidth(prev => prev + 0.1);
      }, 100);
    });

    return () => subscription?.remove();
  }, []);

  const syncPendingPosts = async () => {
    if (pendingPosts.length === 0) return;

    for (const pendingPost of pendingPosts) {
      try {
        const { id, status, ...postData } = pendingPost;
        await addDoc(collection(db, 'freedom-wall-posts'), postData);

        // Remove from pending posts after successful sync
        setPendingPosts(prev => prev.filter(p => p.id !== pendingPost.id));
      } catch (error) {
        logError(error, 'Sync Pending Post');
      }
    }
  };

  useEffect(() => {
    registerSyncCallback(syncPendingPosts);
  }, [pendingPosts, registerSyncCallback]);

  useEffect(() => {
    checkCooldown();
  }, [showModal]);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => {
        setCooldownSeconds(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setIsOnCooldown(false);
            return 0;
          }
          return newValue;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownSeconds]);

  const checkCooldown = async () => {
    try {
      const lastPostTime = await AsyncStorage.getItem('lastPostTime');
      if (lastPostTime) {
        const timeDiff = Date.now() - parseInt(lastPostTime);
        const cooldownTime = 90000; // 90 seconds

        if (timeDiff < cooldownTime) {
          const remainingTime = Math.ceil((cooldownTime - timeDiff) / 1000);
          setIsOnCooldown(true);
          setCooldownSeconds(remainingTime);
        } else {
          setIsOnCooldown(false);
          setCooldownSeconds(0);
        }
      } else {
        setIsOnCooldown(false);
        setCooldownSeconds(0);
      }
    } catch (error) {
      logError(error, 'Check Cooldown');
    }
  };

  const formatCooldownTime = seconds => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = timestamp => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generatePersona = () => {
    const adjectives = [
      'Brave',
      'Wise',
      'Swift',
      'Bold',
      'Calm',
      'Bright',
      'Cool',
      'Wild',
      'Free',
      'Kind',
    ];
    const animals = ['Tiger', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Owl', 'Hawk', 'Deer', 'Cat'];
    const colors = [
      '#FF6B35',
      '#F7931E',
      '#FFD23F',
      '#06FFA5',
      '#118AB2',
      '#073B4C',
      '#AF52DE',
      '#FF3B30',
      '#34C759',
      '#007AFF',
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];

    return { name: `${adjective} ${animal}`, color };
  };

  const handlePost = async () => {
    if (isOnCooldown) {
      Alert.alert(
        'Cooldown Active',
        'Please wait for the cooldown to finish. This was implemented to avoid spam.'
      );
      return;
    }

    if (!postContent.trim()) {
      Alert.alert('Error', 'Please write something before posting.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert(
        'Authentication Required',
        'You must be logged in to post. Please sign in first.'
      );
      return;
    }

    setPosting(true);

    const persona = generatePersona();
    const finalPersona = customNickname.trim() || persona.name;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const postData = {
      content: postContent.trim(),
      createdAt: now,
      expiresAt: expiresAt,
      persona: finalPersona,
      personaColor: persona.color,
      noteColor: selectedColor,
      authorId: user.uid,
      likeCount: 0,
      likedBy: [],
    };

    if (!isConnected) {
      // Add to pending posts for offline
      const pendingPost = {
        ...postData,
        id: `pending_${Date.now()}`,
        status: 'pending',
      };
      setPendingPosts(prev => [...prev, pendingPost]);

      // Save timestamp for cooldown (offline posts)
      await AsyncStorage.setItem('lastPostTime', Date.now().toString());

      setPostContent('');
      setCustomNickname('');
      setSelectedColor('#FFFACD');
      setShowModal(false);
      setPosting(false);
      Alert.alert('Posted Offline', "Your post will be published when you're back online.");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'freedom-wall-posts'), postData);

      // Save timestamp for cooldown
      await AsyncStorage.setItem('lastPostTime', Date.now().toString());

      setPostContent('');
      setCustomNickname('');
      setSelectedColor('#FFFACD');
      setShowModal(false);
    } catch (error) {
      logError(error, 'Create Post');

      let errorMessage = 'Could not create post. Please try again.';
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Network error. Please check your connection.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async postId => {
    const user = auth.currentUser;
    if (!user) return;

    if (!isConnected) {
      Alert.alert('Offline', 'You need an internet connection to like posts.');
      return;
    }

    try {
      const postRef = doc(db, 'freedom-wall-posts', postId);

      await runTransaction(db, async transaction => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) return;

        const data = postDoc.data();
        const likedBy = data.likedBy || [];
        const currentLikeCount = data.likeCount || 0;
        const userHasLiked = likedBy.includes(user.uid);

        if (userHasLiked) {
          // Unlike
          transaction.update(postRef, {
            likeCount: Math.max(0, currentLikeCount - 1),
            likedBy: likedBy.filter(id => id !== user.uid),
          });
        } else {
          // Like
          transaction.update(postRef, {
            likeCount: currentLikeCount + 1,
            likedBy: [...likedBy, user.uid],
          });
        }
      });
    } catch (error) {
      showErrorAlert(error, 'Update Like', 'Like Failed');
    }
  };

  // Responsive columns based on card/container width
  const handleCardLayout = event => {
    const width = event.nativeEvent.layout.width;
    setCardWidth(width);

    // Calculate optimal number of columns based on available width
    const cardWidth = 100; // PostCard width
    const cardMargin = 4; // PostCard margin
    const totalCardWidth = cardWidth + cardMargin * 2;
    const availableWidth = width - 16; // Account for container padding

    // Calculate how many cards can fit
    const maxColumns = Math.floor(availableWidth / totalCardWidth);

    // Use 3 columns if possible, otherwise use the maximum that fits
    const optimalColumns = Math.max(2, Math.min(3, maxColumns));
    setNumColumns(optimalColumns);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1B2845', '#23243a', '#22305a', '#3a5a8c', '#23243a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="message-text" size={28} color="#22e584" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Freedom Wall</Text>
          <Text style={styles.headerSubtext}>Share your thoughts anonymously</Text>
        </View>
        <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
          <Feather name="filter" size={20} color="#22e584" />
        </TouchableOpacity>
      </View>

      {!isInitialLoading && combinedPosts.length > 0 && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Showing {startIndex + 1}-{Math.min(endIndex, combinedPosts.length)} of{' '}
            {combinedPosts.length} {combinedPosts.length === 1 ? 'post' : 'posts'}
          </Text>
        </View>
      )}

      <View style={styles.cardContent}>
        {/* Posts list or empty state */}
        {isInitialLoading ? (
          <View style={styles.loadingContainer}>
            <Feather name="message-circle" size={64} color="#8E8E93" />
            <Text style={styles.loadingText}>Loading Freedom Wall...</Text>
          </View>
        ) : combinedPosts.length === 0 ? (
          <View style={styles.emptyContainerModern}>
            <Feather name="message-circle" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitleModern}>
              There are no sticky notes for today yet.{'\n'}Be the first!
            </Text>
          </View>
        ) : (
          <FlatList
            data={paginatedPosts}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <PostCard
                post={item}
                timestamp={formatTimestamp(item.createdAt)}
                rotation={getRandomRotation(index)}
                onLike={() => handleLike(item.id)}
                isLiked={
                  Array.isArray(item.likedBy) &&
                  auth.currentUser?.uid &&
                  item.likedBy.includes(auth.currentUser.uid)
                }
                onPress={() => navigation.navigate('PostDetail', { post: item })}
              />
            )}
            numColumns={numColumns}
            contentContainerStyle={styles.postsGridContainer}
            showsVerticalScrollIndicator={false}
            key={numColumns}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFFFFF"
                colors={['#22e584', '#FFFFFF']}
                progressBackgroundColor="rgba(34, 229, 132, 0.3)"
                titleColor="#FFFFFF"
                title="Refreshing..."
              />
            }
          />
        )}
      </View>

      {/* Pagination Controls */}
      {totalPages > 1 && !isInitialLoading && (
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
            onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <Feather name="chevron-left" size={20} color={currentPage === 1 ? '#555' : '#22e584'} />
            <Text
              style={[styles.pageButtonText, currentPage === 1 && styles.pageButtonTextDisabled]}
            >
              Previous
            </Text>
          </TouchableOpacity>

          <Text style={styles.pageIndicator}>
            {currentPage} / {totalPages}
          </Text>

          <TouchableOpacity
            style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
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

      {/* Show FAB only when modal is not open */}
      {!showModal && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)}>
          <Feather name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      {/* Modal for creating a new post, glassmorphic style */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <BlurView intensity={110} tint="dark" style={styles.modalCard}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Modal Header with Close Button */}
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
                  <Feather name="x" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              {/* Preview Area */}
              <View style={styles.previewArea}>
                <Text style={styles.previewLabel}>Preview</Text>
                <View style={styles.previewContainer}>
                  <PostCard
                    post={{
                      content: postContent || "What's on your mind?",
                      persona: customNickname || 'Anonymous',
                      personaColor: '#34C759',
                      noteColor: selectedColor,
                      likeCount: 0,
                      likedBy: [],
                    }}
                    timestamp="Just now"
                    rotation="2deg"
                    onLike={() => { }}
                    isLiked={false}
                    textColor={getTextColor(selectedColor)}
                  />
                </View>
              </View>
              {/* Form Area */}
              <View style={styles.formArea}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nickname (optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={customNickname}
                    onChangeText={setCustomNickname}
                    placeholder="Enter your nickname"
                    placeholderTextColor="#8E8E93"
                    maxLength={15}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Message</Text>
                  <TextInput
                    style={styles.messageInput}
                    value={postContent}
                    onChangeText={setPostContent}
                    placeholder="What's on your mind?"
                    placeholderTextColor="#8E8E93"
                    multiline
                    textAlignVertical="top"
                    maxLength={100}
                  />
                  <Text style={styles.characterCounter}>{postContent.length}/100</Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Color</Text>
                  <View style={styles.colorPalette}>
                    {colorPalette.map(color => (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: color },
                          selectedColor === color && styles.selectedColorCircle,
                        ]}
                        onPress={() => setSelectedColor(color)}
                      />
                    ))}
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.postButton,
                    (posting || isOnCooldown || !postContent.trim()) && styles.postButtonDisabled,
                  ]}
                  onPress={handlePost}
                  disabled={posting || isOnCooldown || !postContent.trim()}
                >
                  <Text style={[styles.postButtonText, isOnCooldown && styles.cooldownText]}>
                    {posting
                      ? 'Posting...'
                      : isOnCooldown
                        ? formatCooldownTime(cooldownSeconds)
                        : 'Post It'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortDropdown}>
            {['Oldest to Newest', 'Newest to Oldest', 'Most Hearts', 'Fewest Hearts'].map(
              option => (
                <TouchableOpacity
                  key={option}
                  style={[styles.sortOption, sortBy === option && styles.sortOptionSelected]}
                  onPress={() => {
                    setSortBy(option);
                    setShowSortModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option && styles.sortOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                  {sortBy === option && <Feather name="check" size={16} color="#34C759" />}
                </TouchableOpacity>
              )
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getRandomRotation = index => {
  const rotations = ['-2deg', '-1deg', '0deg', '1deg', '2deg', '-1.5deg', '1.5deg'];
  return rotations[index % rotations.length];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  sortButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(34, 229, 132, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#D3D3D3',
    textAlign: 'center',
    marginBottom: 16,
  },
  postsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'flex-start',
  },
  row: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#D3D3D3',
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    marginTop: 20,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  retryButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  fab: {
    position: 'absolute',
    bottom: 36,
    right: 36,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 20,
  },

  characterCounter: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#B0B3B8',
    textAlign: 'right',
    marginTop: 4,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorCircle: {
    borderColor: '#333333',
    borderWidth: 3,
  },
  createNoteContainer: {
    flex: 1,
    backgroundColor: '#2A2A2A',
  },
  previewArea: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    marginBottom: 60,
    minHeight: 60,
    maxHeight: 100,
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#F5F5DC',
    marginBottom: 10,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 1 }],
  },
  formArea: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  formInput: {
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  messageInput: {
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    textAlignVertical: 'top',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#D3D3D3',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 110 : 95,
    paddingRight: 20,
  },
  sortDropdown: {
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    borderRadius: 12,
    minWidth: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sortOptionSelected: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  sortOptionText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#FFFFFF',
  },
  sortOptionTextSelected: {
    color: '#34C759',
    fontFamily: 'Inter_500Medium',
  },
  createNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  createNoteBackButton: {
    width: 50,
    alignItems: 'flex-start',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 245, 220, 0.1)',
  },
  createNoteTitle: {
    flex: 1,
    fontSize: 28,
    fontFamily: 'Inter_600SemiBold',
    color: '#F5F5DC',
    textAlign: 'center',
    marginRight: 50,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    color: '#D3D3D3',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  nicknameInput: {
    height: 40,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 4,
    outline: 'none',
  },
  postButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  postButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.7,
  },
  postButtonText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
  },
  postButtonTextDisabled: {
    color: '#666666',
  },
  cooldownText: {
    color: '#FF3B30',
  },
  // New styles for the modern Freedom Wall screen
  mainCardContainer: {
    marginTop: 104,
    marginBottom: 32,
    marginHorizontal: 12,
    backgroundColor: 'rgba(18, 22, 34, 0.92)',
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
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
    height: 750, // Extended height for better visual balance
  },
  headerTitleModernCard: {
    fontSize: 32,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtextCard: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#b6c2d1',
    textAlign: 'center',
    marginBottom: 20,
  },
  cardHeader: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  logoCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    marginTop: 0,
    width: '100%',
    zIndex: 3,
    position: 'relative',
  },
  logoCircleGlow: {
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
  logoCircleOutline: {
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
  logoIcon: {
    zIndex: 5,
  },
  floatingBackButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingShape: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  shape1: {
    top: -50,
    left: -50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  shape2: {
    bottom: -50,
    right: -50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  shape3: {
    top: 100,
    right: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    overflow: 'hidden',
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainerModern: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitleModern: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    color: '#b6c2d1',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 24,
  },
  postsGridContainer: {
    paddingHorizontal: 4, // Reduced padding for better space utilization
    paddingBottom: 20,
    justifyContent: 'flex-start',
    alignItems: 'center', // Center the grid content
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
    marginBottom: 0,
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
});
