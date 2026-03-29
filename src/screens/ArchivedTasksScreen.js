import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, auth } from '../config/firebaseConfig';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import { logError } from '../utils/errorHandler';
import { brutalButton, brutalCard, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

export default function ArchivedTasksScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    let unsubscribeTasks = null;

    const unsubscribeAuth = onAuthStateChanged(auth, user => {
      if (user) {
        const q = query(collection(db, 'tasks'), orderBy('deadline', 'desc'));

        unsubscribeTasks = onSnapshot(
          q,
          querySnapshot => {
            const tasksList = [];
            querySnapshot.forEach(doc => {
              const data = doc.data();
              // Only show tasks that current user has completed
              if (data.completedBy && data.completedBy.includes(user.uid)) {
                tasksList.push({
                  id: doc.id,
                  ...data,
                });
              }
            });
            setTasks(tasksList);
            setLoading(false);
          },
          error => {
            logError(error, 'Fetch Archived Tasks');
            setLoading(false);
          }
        );
      } else {
        // User logged out, cleanup listener
        if (unsubscribeTasks) {
          unsubscribeTasks();
          unsubscribeTasks = null;
        }
        setTasks([]);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeTasks) {
        unsubscribeTasks();
      }
      unsubscribeAuth();
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
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
    });
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.background, palette.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Completed Tasks</Text>
          <Text style={styles.headerSubtext}>
            {tasks.length} completed task{tasks.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.teal}
            colors={[palette.teal, palette.mustard]}
          />
        }
      >
        {loading ? (
          <View style={styles.listContainer}>
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="check-circle" size={64} color={palette.textMuted} />
            <Text style={styles.emptyTitle}>No completed tasks</Text>
            <Text style={styles.emptyMessage}>Tasks you mark as done will appear here</Text>
          </View>
        ) : (
          tasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={styles.taskCard}
              onPress={() => navigation.navigate('TaskDetail', { task })}
              activeOpacity={0.7}
            >
              <View style={styles.taskCardHeader}>
                <View style={styles.subjectBadge}>
                  <Text style={styles.subjectBadgeText} numberOfLines={1} ellipsizeMode="tail">
                    {task.subjectCode || task.subject || 'N/A'}
                  </Text>
                </View>
                <View style={styles.completedBadge}>
                  <Feather name="check-circle" size={13} color={palette.text} />
                  <Text style={styles.completedText}>Done</Text>
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
                  <Feather name="calendar" size={14} color={palette.textMuted} />
                  <Text style={styles.taskDate}>{formatDate(task.deadline)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: screenAccents.tasks.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    color: palette.text,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: palette.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    color: palette.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: palette.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  listContainer: {
    paddingBottom: 20,
  },
  taskCard: {
    ...brutalCard(screenAccents.tasks.tertiary),
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: screenAccents.tasks.secondary,
    flexShrink: 1,
    maxWidth: '65%',
    borderWidth: 3,
    borderColor: palette.border,
  },
  subjectBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: palette.text,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.sage,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    borderWidth: 3,
    borderColor: palette.border,
  },
  completedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: palette.text,
    textTransform: 'uppercase',
  },
  taskTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: palette.text,
    marginBottom: 8,
  },
  taskDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: palette.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskDate: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: palette.textMuted,
    marginLeft: 6,
  },
});
