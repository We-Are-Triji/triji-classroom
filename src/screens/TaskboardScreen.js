import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { db, auth } from '../config/firebaseConfig';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import TaskCardSkeleton from '../components/TaskCardSkeleton';

export default function TaskboardScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'
  const ITEMS_PER_PAGE = 10;

  const windowWidth = Dimensions.get('window').width;

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const fetchTasks = () => {
    // Only fetch if user is authenticated
    if (!auth.currentUser) {
      console.log('No authenticated user, skipping tasks fetch');
      setLoading(false);
      setError('Please log in to view tasks');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, 'tasks'), orderBy('deadline', sortOrder), limit(50));

      const unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const tasksList = [];
          querySnapshot.forEach(doc => {
            const data = doc.data();
            // Only show tasks that current user has NOT completed
            const isCompletedByCurrentUser =
              auth.currentUser &&
              data.completedBy &&
              data.completedBy.includes(auth.currentUser.uid);

            if (!isCompletedByCurrentUser) {
              tasksList.push({
                id: doc.id,
                ...data,
              });
            }
          });

          setTasks(tasksList);
          setLoading(false);
          setInitialLoad(false);
        },
        error => {
          console.error('Error fetching tasks:', error);
          setError('Could not load tasks. Please check your connection.');
          setLoading(false);
          setInitialLoad(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.log('Error setting up listener:', error);
      setError('Could not load tasks. Please check your connection.');
      setLoading(false);
      setInitialLoad(false);
      return null;
    }
  };

  useEffect(() => {
    let unsubscribeTasks = null;

    // Wait for auth state before fetching
    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (user) {
        setIsAuthenticated(true);
        unsubscribeTasks = fetchTasks();
      } else {
        // User logged out, cleanup listener
        if (unsubscribeTasks) {
          unsubscribeTasks();
          unsubscribeTasks = null;
        }
        setIsAuthenticated(false);
        setTasks([]);
        setLoading(false);
        setError('Please log in to view tasks');
      }
    });

    return () => {
      if (unsubscribeTasks) {
        unsubscribeTasks();
      }
      unsubscribeAuth();
    };
  }, [sortOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    // Data will refresh automatically through onSnapshot listener
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const formatDate = deadline => {
    if (!deadline) return 'No deadline';

    let date;
    // Handle Firestore Timestamp object
    if (deadline.toDate && typeof deadline.toDate === 'function') {
      date = deadline.toDate();
    }
    // Handle timestamp in seconds (Firestore format)
    else if (deadline.seconds) {
      date = new Date(deadline.seconds * 1000);
    }
    // Handle regular date string or ISO string
    else {
      date = new Date(deadline);
    }

    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Paginated tasks
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTasks = tasks.slice(startIndex, endIndex);
  const totalPages = Math.ceil(tasks.length / ITEMS_PER_PAGE);

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
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const renderTaskCard = task => {
    const overdue = isOverdue(task.deadline);
    const isCompleted = auth.currentUser && task.completedBy?.includes(auth.currentUser.uid);

    return (
      <TouchableOpacity
        key={task.id}
        style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}
        onPress={() => navigation.navigate('TaskDetail', { task })}
        activeOpacity={0.7}
      >
        <View style={styles.taskCardHeader}>
          <View style={styles.subjectBadge}>
            <Text style={styles.subjectBadgeText} numberOfLines={1} ellipsizeMode="tail">
              {task.subjectCode || task.subject || 'N/A'}
            </Text>
          </View>
          <View style={styles.taskCardBadges}>
            {isCompleted ? (
              <View style={styles.completedBadge}>
                <Feather name="check-circle" size={13} color="#22e584" />
                <Text style={styles.completedText}>Done</Text>
              </View>
            ) : (
              <View style={styles.pendingBadge}>
                <Feather name="circle" size={13} color="#FFB800" />
                <Text style={styles.pendingText}>Pending</Text>
              </View>
            )}
            {overdue && !isCompleted && (
              <View style={styles.overdueTag}>
                <Feather name="alert-circle" size={12} color="#FF3B30" />
                <Text style={styles.overdueText}>Overdue</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.taskTitle}>{task.title || 'Untitled Task'}</Text>

        {(task.description || task.details) && (
          <Text style={styles.taskDescription} numberOfLines={2}>
            {task.description || task.details}
          </Text>
        )}

        <View style={styles.taskFooter}>
          <View style={styles.dateContainer}>
            <Feather name="calendar" size={14} color="#8E8E93" />
            <Text style={styles.taskDate}>{formatDate(task.deadline)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f1c2e', '#162447', '#121212']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.backgroundGradient}
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
        colors={['#1B2845', '#23243a', '#22305a', '#3a5a8c', '#23243a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="clipboard-list-outline" size={28} color="#22e584" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Task Board</Text>
          <Text style={styles.headerSubtext}>View all tasks and upcoming deadlines</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            activeOpacity={0.7}
          >
            <Feather
              name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={18}
              color="#22e584"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.archiveButton}
            onPress={() => navigation.navigate('ArchivedTasks')}
            activeOpacity={0.7}
          >
            <Feather name="archive" size={18} color="#22e584" />
          </TouchableOpacity>
        </View>
      </View>

      {!initialLoad && tasks.length > 0 && (
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Showing {startIndex + 1}-{Math.min(endIndex, tasks.length)} of {tasks.length}{' '}
            {tasks.length === 1 ? 'task' : 'tasks'}
          </Text>
        </View>
      )}

      <View style={styles.tasksContent}>
        {initialLoad ? (
          <View style={styles.listContainer}>
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Feather name="wifi-off" size={64} color="#FF3B30" />
            <Text style={styles.emptyTitle}>Connection Error</Text>
            <Text style={styles.emptyMessage}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchTasks()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="clipboard" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyMessage}>
              Tasks will appear here once added by administrators
            </Text>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.tasksScroll}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
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
            >
              {paginatedTasks.map(task => renderTaskCard(task))}
            </ScrollView>

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
    backgroundColor: '#0f1c2e',
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 229, 132, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
  },
  archiveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 229, 132, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
  },
  iconCircle: {
    width: 35,
    height: 35,
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
  tasksContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  tasksScroll: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskCardCompleted: {
    backgroundColor: 'rgba(34, 229, 132, 0.08)',
    borderColor: 'rgba(34, 229, 132, 0.2)',
    opacity: 0.85,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  taskCardBadges: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 229, 132, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
  },
  completedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#22e584',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
  },
  pendingText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#FFB800',
  },
  subjectBadge: {
    backgroundColor: 'rgba(34, 229, 132, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
    flexShrink: 1,
    maxWidth: '65%',
  },
  subjectBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: '#22e584',
  },
  overdueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  overdueText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: '#FF3B30',
  },
  taskTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    marginBottom: 6,
    lineHeight: 22,
  },
  taskDescription: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.65)',
    lineHeight: 18,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskDate: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#22e584',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: '#0f1c2e',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
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
});
