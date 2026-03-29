import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Share,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../config/firebaseConfig';
import {
  doc,
  runTransaction,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from '../config/firebaseConfig';
import * as Clipboard from 'expo-clipboard';
import { useNetwork } from '../context/NetworkContext';
import { showErrorAlert, logError } from '../utils/errorHandler';
import { brutalButton, brutalCard, brutalInput, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params || {};
  const { isConnected } = useNetwork();

  // Safety check - if no post, go back
  useEffect(() => {
    if (!post) {
      Alert.alert('Error', 'Post not found');
      navigation.goBack();
    }
  }, [post, navigation]);

  const [countdown, setCountdown] = useState('');
  const [currentPost, setCurrentPost] = useState({
    ...post,
    likedBy: Array.isArray(post?.likedBy) ? post.likedBy : [],
    reportedBy: Array.isArray(post?.reportedBy) ? post.reportedBy : [],
  });
  const [showCopied, setShowCopied] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const animatedValue = new Animated.Value(0);

  const isLiked =
    Array.isArray(currentPost.likedBy) &&
    auth.currentUser?.uid &&
    currentPost.likedBy.includes(auth.currentUser.uid);

  const formatTimestamp = timestamp => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    // Countdown timer
    const calculateCountdown = () => {
      if (!post.expiresAt) return;

      const now = new Date();
      const expiresAt = post.expiresAt.toDate ? post.expiresAt.toDate() : new Date(post.expiresAt);
      const timeDiff = expiresAt.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setCountdown('This note has expired');
        return;
      }

      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setCountdown(`This note will disappear in ${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setCountdown(`This note will disappear in ${minutes} minutes`);
      } else {
        const seconds = Math.floor(timeDiff / 1000);
        setCountdown(`This note will disappear in ${seconds} seconds`);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    // Background animation
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 8000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    };

    animate();

    return () => clearInterval(interval);
  }, [post.expiresAt, post.id]);

  const handleLike = async () => {
    const user = auth.currentUser;
    if (!user) return;

    if (!isConnected) {
      Alert.alert('Offline', 'You need an internet connection to like posts.');
      return;
    }

    try {
      const postRef = doc(db, 'freedom-wall-posts', post.id);

      await runTransaction(db, async transaction => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) return;

        const data = postDoc.data();
        const likedBy = data.likedBy || [];
        const currentLikeCount = data.likeCount || 0;
        const userHasLiked = likedBy.includes(user.uid);

        let newLikedBy, newLikeCount;

        if (userHasLiked) {
          // Unlike
          newLikeCount = Math.max(0, currentLikeCount - 1);
          newLikedBy = likedBy.filter(id => id !== user.uid);
        } else {
          // Like
          newLikeCount = currentLikeCount + 1;
          newLikedBy = [...likedBy, user.uid];
        }

        transaction.update(postRef, {
          likeCount: newLikeCount,
          likedBy: newLikedBy,
        });

        // Update local state
        setCurrentPost(prev => ({
          ...prev,
          likeCount: newLikeCount,
          likedBy: newLikedBy,
        }));
      });
    } catch (error) {
      showErrorAlert(error, 'Update Like', 'Like Failed');
    }
  };

  const handleCopyText = async () => {
    try {
      await Clipboard.setStringAsync(post.content);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      logError(error, 'Copy Text');
      Alert.alert('Error', 'Failed to copy text.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: post.content,
        title: 'Shared from Freedom Wall',
      });
    } catch (error) {
      logError(error, 'Share Post');
      Alert.alert('Error', 'Failed to share text.');
    }
  };

  const handleSubmitReport = async () => {
    const user = auth.currentUser;
    if (!user || !selectedReason) return;

    if (!isConnected) {
      Alert.alert('Offline', 'You need an internet connection to submit reports.');
      return;
    }

    setSubmitting(true);
    try {
      // Add report to reports collection
      await addDoc(collection(db, 'reports'), {
        postId: post.id,
        postContent: post.content,
        reason: selectedReason,
        description: description.trim(),
        reporterId: user.uid,
        reportedAt: serverTimestamp(),
      });

      // Update post with reportedBy array
      const postRef = doc(db, 'freedom-wall-posts', post.id);
      const reportedBy = post.reportedBy || [];
      const updatedReportedBy = [...reportedBy, user.uid];

      await updateDoc(postRef, {
        reportedBy: updatedReportedBy,
      });

      // Update local state to reflect the change
      setCurrentPost(prev => ({
        ...prev,
        reportedBy: updatedReportedBy,
      }));

      setShowReportModal(false);
      setSelectedReason('');
      setDescription('');

      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. The post has been reported for review.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      showErrorAlert(error, 'Submit Report', 'Submission Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const getGradientColors = () => {
    const baseColor = post.noteColor || '#FFFACD';
    return [baseColor + '20', baseColor + '10', baseColor + '05'];
  };

  const animatedStyle = {
    transform: [
      {
        translateX: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-50, 50],
        }),
      },
      {
        translateY: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, 30],
        }),
      },
    ],
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.background, palette.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        />
        <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Note Details</Text>
        {(() => {
          const user = auth.currentUser;
          const reportedBy = currentPost.reportedBy || [];
          const hasReported = user && Array.isArray(reportedBy) && reportedBy.includes(user.uid);

          return (
            <TouchableOpacity
              style={[styles.moreButton, hasReported && styles.reportedButton]}
              onPress={() => {
                if (hasReported) {
                  Alert.alert('Already Reported', 'You have already reported this post.');
                } else {
                  setShowReportModal(true);
                }
              }}
              disabled={hasReported}
            >
              <Feather
                name={hasReported ? 'check' : 'alert-triangle'}
                size={20}
                color={palette.text}
              />
            </TouchableOpacity>
          );
        })()}
      </View>

      <View style={styles.content}>
        <View style={styles.postCardContainer}>
          {/* Author Header */}
          <View style={styles.authorHeader}>
            <View style={styles.authorAvatar}>
              <View
                style={[styles.personaDot, { backgroundColor: post.personaColor || '#34C759' }]}
              />
            </View>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{post.persona || 'Anonymous'}</Text>
              <Text style={styles.timestamp}>{formatTimestamp(post.createdAt)}</Text>
            </View>
          </View>

          {/* Post Content */}
          <View style={[styles.postCard, { backgroundColor: post.noteColor || '#FFFACD' }]}>
            <ScrollView
              style={styles.postTextContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.postTextContent}
            >
              <Text style={styles.postText}>{post.content}</Text>
            </ScrollView>
          </View>

          {/* Interactions */}
          <View style={styles.interactionsBar}>
            <TouchableOpacity style={styles.interactionButton} onPress={handleLike}>
              <Text style={[styles.heartIcon, isLiked && styles.heartLiked]}>♥</Text>
              <Text style={styles.interactionText}>{currentPost.likeCount || 0} Likes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.interactionButton} onPress={handleCopyText}>
              <Feather
                name={showCopied ? 'check' : 'copy'}
                size={18}
                color={showCopied ? palette.text : palette.text}
              />
              <Text style={styles.interactionText}>{showCopied ? 'Copied!' : 'Copy'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.interactionButton} onPress={handleShare}>
              <Feather name="share" size={18} color={palette.text} />
              <Text style={styles.interactionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Countdown Info */}
        {countdown && (
          <View style={styles.countdownCard}>
            <Feather name="clock" size={20} color={palette.text} />
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        )}
      </View>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportModalContainer}>
          <View style={styles.reportHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowReportModal(false)}>
              <Feather name="x" size={24} color={palette.text} />
            </TouchableOpacity>
            <Text style={styles.reportTitle}>Report Post</Text>
          </View>

          <ScrollView style={styles.reportContent}>
            <Text style={styles.sectionTitle}>Please select a reason:</Text>

            {[
              'Spam',
              'Harassment or Hate Speech',
              'Personal Information',
              'Inappropriate Content',
            ].map(reason => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  selectedReason === reason && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text
                  style={[
                    styles.reasonText,
                    selectedReason === reason && styles.reasonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
                {selectedReason === reason && <Feather name="check" size={16} color={palette.text} />}
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>Additional Description (Optional):</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Provide more details about this report..."
              placeholderTextColor={palette.textMuted}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedReason || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitReport}
              disabled={!selectedReason || submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: screenAccents.freedomWall.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
    textTransform: 'uppercase',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
  },
  reportedButton: {
    backgroundColor: palette.sage,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  postCardContainer: {
    ...brutalCard(screenAccents.freedomWall.tertiary),
    borderRadius: 24,
    overflow: 'hidden',
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: palette.textMuted,
  },
  postCard: {
    minHeight: 200,
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  postTextContainer: {
    flex: 1,
  },
  postTextContent: {
    flexGrow: 1,
  },
  postText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#2C2C2C',
    lineHeight: 24,
  },
  interactionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopWidth: 3,
    borderTopColor: palette.border,
  },
  interactionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  interactionText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
  },
  heartIcon: {
    fontSize: 22,
    color: palette.text,
  },
  heartLiked: {
    color: palette.coral,
  },
  countdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.mustard,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: palette.border,
    marginTop: 16,
    gap: 10,
  },
  noteContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  noteWrapper: {
    position: 'relative',
    width: '100%',
  },
  postCard: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  personaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  personaDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  personaText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    fontWeight: '600',
  },
  postTextContainer: {
    flex: 1,
    marginVertical: 20,
  },
  postTextContent: {
    flexGrow: 1,
  },
  postText: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
    color: '#2C2C2C',
    lineHeight: 30,
    letterSpacing: 0.4,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  heartIcon: {
    fontSize: 18,
    color: '#8E8E93',
    marginRight: 6,
  },
  heartLiked: {
    color: '#FF3B30',
  },
  likeCount: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
  },
  loadingText: {
    color: palette.text,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  countdownContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    marginLeft: 8,
  },
  countdownText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#FF6B35',
    marginLeft: 6,
    flexShrink: 1,
  },
  utilityButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  utilityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  utilityButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#FFFFFF',
  },
  copiedButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  copiedText: {
    color: palette.text,
  },
  reportModalContainer: {
    flex: 1,
    backgroundColor: palette.background,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: screenAccents.freedomWall.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: palette.border,
  },
  reportTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 56,
    textTransform: 'uppercase',
  },
  reportContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    marginBottom: 16,
    marginTop: 20,
    textTransform: 'uppercase',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: palette.surface,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: palette.border,
  },
  reasonOptionSelected: {
    backgroundColor: palette.coral,
    borderColor: palette.border,
  },
  reasonText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  reasonTextSelected: {
    color: palette.text,
    fontFamily: 'Inter_500Medium',
  },
  descriptionInput: {
    height: 100,
    ...brutalInput(palette.white),
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    marginBottom: 30,
  },
  submitButton: {
    ...brutalButton(palette.coral),
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: palette.textMuted,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
});
