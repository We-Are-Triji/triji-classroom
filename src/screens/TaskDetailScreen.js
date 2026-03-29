import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../config/firebaseConfig';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { showErrorAlert } from '../utils/errorHandler';
import { successHaptic, mediumHaptic, lightHaptic } from '../utils/haptics';
import { brutalButton, brutalCard, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

export default function TaskDetailScreen({ route, navigation }) {
  const { task } = route.params || {};

  const [countdown, setCountdown] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isTogglingCompletion, setIsTogglingCompletion] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    // Check if current user has completed this task
    if (task && auth.currentUser) {
      const completedBy = task.completedBy || [];
      const completed = completedBy.includes(auth.currentUser.uid);
      setIsCompleted(completed);

      // Initialize checkmark animation
      checkmarkScale.setValue(completed ? 1 : 0);
    }
  }, [task]);

  useEffect(() => {
    // Calculate countdown to deadline
    const calculateCountdown = () => {
      if (!task?.deadline) return;

      const now = new Date();
      const deadline = new Date(task.deadline);
      const timeDiff = deadline.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setCountdown('This task is overdue');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (days > 0) {
        setCountdown(
          `Due in ${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`
        );
      } else {
        setCountdown(`Due in ${hours} hour${hours !== 1 ? 's' : ''}`);
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [task]);

  const formatDate = deadline => {
    if (!deadline) return 'No deadline';

    let date;
    // Handle Firestore Timestamp object
    if (deadline.toDate && typeof deadline.toDate === 'function') {
      date = deadline.toDate();
    }
    // Handle timestamp in seconds
    else if (deadline.seconds) {
      date = new Date(deadline.seconds * 1000);
    }
    // Handle regular date string
    else {
      date = new Date(deadline);
    }

    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSubjectFontSize = text => {
    if (!text) return 16;
    const length = text.length;
    if (length <= 6) return 16; // Short acronyms like "CS101"
    if (length <= 12) return 14; // Medium length
    if (length <= 20) return 12; // Longer names
    return 11; // Very long subject names
  };

  const isOverdue = deadline => {
    if (!deadline) return false;

    let date;
    // Handle Firestore Timestamp object
    if (deadline.toDate && typeof deadline.toDate === 'function') {
      date = deadline.toDate();
    }
    // Handle timestamp in seconds
    else if (deadline.seconds) {
      date = new Date(deadline.seconds * 1000);
    }
    // Handle regular date string
    else {
      date = new Date(deadline);
    }

    const today = new Date();
    return date < today;
  };

  const toggleTaskCompletion = async () => {
    if (!auth.currentUser || !task?.id) return;

    // Haptic feedback on press
    mediumHaptic();

    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsTogglingCompletion(true);
    try {
      const taskRef = doc(db, 'tasks', task.id);

      if (isCompleted) {
        // Remove user from completedBy array
        await updateDoc(taskRef, {
          completedBy: arrayRemove(auth.currentUser.uid),
        });
        setIsCompleted(false);

        // Animate checkmark out
        Animated.spring(checkmarkScale, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();

        lightHaptic();
      } else {
        // Add user to completedBy array
        await updateDoc(taskRef, {
          completedBy: arrayUnion(auth.currentUser.uid),
        });
        setIsCompleted(true);

        // Animate checkmark in with bounce
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }).start();

        // Success haptic feedback
        successHaptic();
      }
    } catch (error) {
      showErrorAlert(error, 'Toggle Task Completion', 'Update Failed');
    } finally {
      setIsTogglingCompletion(false);
    }
  };

  if (!fontsLoaded || !task) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[palette.background, palette.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundGradient}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const overdue = isOverdue(task.deadline);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.background, palette.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          lightHaptic();
          navigation.goBack();
        }}
      >
        <Feather name="arrow-left" size={24} color={palette.text} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Facebook-style Task Card */}
        <View style={styles.taskCardContainer}>
          {/* Task Header Info */}
          <View style={styles.taskHeader}>
            <View style={styles.taskAvatar}>
              <Feather name="clipboard" size={24} color={palette.text} />
            </View>
            <View style={styles.taskInfo}>
              <View style={styles.subjectRow}>
                <Text
                  style={[
                    styles.taskSubject,
                    { fontSize: getSubjectFontSize(task.subjectCode || task.subject) },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {task.subjectCode || task.subject || 'Subject'}
                </Text>
                <View
                  style={[
                    styles.statusBadgeDisplay,
                    isCompleted ? styles.statusBadgeCompleted : styles.statusBadgePending,
                  ]}
                >
                  <Feather
                    name={isCompleted ? 'check-circle' : 'circle'}
                    size={14}
                    color={isCompleted ? palette.text : palette.text}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isCompleted ? styles.statusBadgeTextCompleted : styles.statusBadgeTextPending,
                    ]}
                  >
                    {isCompleted ? 'Done' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.taskDeadline}>{formatDate(task.deadline)}</Text>
            </View>
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Task Title */}
          <View style={styles.taskTitleContainer}>
            <Text style={styles.taskTitle}>{task.title || 'Untitled Task'}</Text>
          </View>

          {/* Task Description */}
          {(task.description || task.details) && (task.description || task.details).trim() ? (
            <View style={styles.taskDescriptionContainer}>
              <Text style={styles.taskDescription}>{task.description || task.details}</Text>
            </View>
          ) : (
            <View style={styles.emptyDescriptionContainer}>
              <Feather name="file-text" size={32} color={palette.textMuted} />
              <Text style={styles.emptyDescriptionText}>No description provided</Text>
            </View>
          )}

          {/* Mark as Done Button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.markDoneButton,
                isCompleted && styles.markDoneButtonCompleted,
                isTogglingCompletion && styles.markDoneButtonDisabled,
              ]}
              onPress={toggleTaskCompletion}
              disabled={isTogglingCompletion}
              activeOpacity={0.7}
            >
              <Animated.View
                style={{
                  transform: [{ scale: checkmarkScale }],
                  opacity: checkmarkScale,
                }}
              >
                <Feather
                  name={isCompleted ? 'check-circle' : 'circle'}
                  size={20}
                  color={palette.text}
                />
              </Animated.View>
              <Text
                style={[
                  styles.markDoneButtonText,
                  isCompleted && styles.markDoneButtonTextCompleted,
                ]}
              >
                {task.archived && isCompleted
                  ? 'Unmark as Done'
                  : isCompleted
                    ? 'Tap to Unmark'
                    : 'Mark as Done'}
              </Text>
              {isCompleted && <Text style={styles.markDoneButtonHint}>✓ Completed</Text>}
            </TouchableOpacity>
          </Animated.View>
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
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: screenAccents.tasks.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
  },
  scrollView: {
    flex: 1,
    marginTop: 50,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: palette.text,
  },
  taskCardContainer: {
    ...brutalCard(screenAccents.tasks.tertiary),
    borderRadius: 28,
    overflow: 'hidden',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: palette.powder,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  separator: {
    height: 3,
    backgroundColor: palette.border,
    marginHorizontal: 16,
  },
  taskAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: screenAccents.tasks.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
  },
  taskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  taskSubject: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: palette.text,
    flex: 1,
    flexShrink: 1,
  },
  statusBadgeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    flexShrink: 0,
    borderWidth: 3,
    borderColor: palette.border,
  },
  statusBadgeCompleted: {
    backgroundColor: palette.sage,
  },
  statusBadgePending: {
    backgroundColor: palette.mustard,
  },
  statusBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  statusBadgeTextCompleted: {
    color: palette.text,
  },
  statusBadgeTextPending: {
    color: palette.text,
  },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: screenAccents.tasks.secondary,
    borderWidth: 3,
    borderColor: palette.border,
  },
  subjectBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: palette.text,
    textAlign: 'center',
  },
  taskDeadline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: palette.textMuted,
  },
  taskTitleContainer: {
    padding: 16,
    paddingBottom: 12,
  },
  taskTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 22,
    color: palette.text,
    lineHeight: 30,
  },
  taskDescriptionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  taskDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: palette.textMuted,
    lineHeight: 22,
  },
  emptyDescriptionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDescriptionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: palette.textMuted,
    marginTop: 12,
  },
  markDoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...brutalButton(screenAccents.tasks.secondary),
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  markDoneButtonCompleted: {
    backgroundColor: screenAccents.tasks.primary,
  },
  markDoneButtonDisabled: {
    opacity: 0.5,
  },
  markDoneButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: palette.text,
    marginLeft: 10,
    textTransform: 'uppercase',
  },
  markDoneButtonTextCompleted: {
    color: palette.text,
  },
  markDoneButtonHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: palette.textMuted,
    marginLeft: 8,
  },
});
