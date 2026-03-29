import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db, auth } from '../config/firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { showErrorAlert, logError } from '../utils/errorHandler';
import { brutalButton, brutalCard, brutalInput, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

export default function CreateTaskScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [details, setDetails] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(null);

  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    checkAccessAndFetchSubjects();
  }, []);

  const checkAccessAndFetchSubjects = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const hasAdminAccess = userDoc.exists() && userDoc.data()?.role === 'admin';

      setIsAdmin(hasAdminAccess);

      if (!hasAdminAccess) {
        setLoading(false);
        return;
      }

      fetchSubjects();
    } catch (error) {
      logError(error, 'Check Task Create Access');
      Alert.alert('Error', 'Failed to verify your permissions. Please try again.');
      setLoading(false);
    }
  };

  const fetchSubjects = () => {
    try {
      const q = query(collection(db, 'subjects'), orderBy('subjectCode', 'asc'));

      const unsubscribe = onSnapshot(q, querySnapshot => {
        const subjectsList = [];
        querySnapshot.forEach(doc => {
          subjectsList.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setSubjects(subjectsList);
        if (subjectsList.length > 0 && !selectedSubject) {
          setSelectedSubject(subjectsList[0].id);
        }
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      logError(error, 'Fetch Subjects');
      Alert.alert('Error', 'Failed to load subjects. Please try again.');
      setLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || deadline;
    setShowDatePicker(Platform.OS === 'ios');
    setDeadline(currentDate);
  };

  const formatDate = date => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSaveTask = async () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Only administrators can create tasks.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title.');
      return;
    }

    if (!selectedSubject) {
      Alert.alert('Error', 'Please select a subject.');
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

      await addDoc(collection(db, 'tasks'), {
        title: title.trim(),
        details: details.trim(),
        deadline: deadline.toISOString(),
        subjectId: selectedSubject,
        subjectName: selectedSubjectData?.subjectName || '',
        subjectCode: selectedSubjectData?.subjectCode || '',
        status: 'To Do',
        userId: user.uid,
        completedBy: [],
        createdAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Task created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      showErrorAlert(error, 'Create Task', 'Creation Failed');
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.teal} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (isAdmin === false) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Task</Text>
        </View>

        <View style={styles.loadingContainer}>
          <Feather name="lock" size={40} color={palette.textMuted} />
          <Text style={styles.loadingText}>Only administrators can create tasks.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Task</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter task title"
              placeholderTextColor={palette.textMuted}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <TouchableOpacity
              style={styles.subjectButton}
              onPress={() => setShowSubjectPicker(true)}
            >
              <Text style={styles.subjectButtonText}>
                {selectedSubject
                  ? subjects.find(s => s.id === selectedSubject)?.subjectCode +
                    ' - ' +
                    subjects.find(s => s.id === selectedSubject)?.subjectName
                  : 'Select a subject'}
              </Text>
              <Feather name="chevron-down" size={20} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={details}
              onChangeText={setDetails}
              placeholder="Enter task details (optional)"
              placeholderTextColor={palette.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Deadline</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>{formatDate(deadline)}</Text>
              <Feather name="calendar" size={20} color={palette.textMuted} />
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={deadline}
              mode="date"
              is24Hour={true}
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSaveTask}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={palette.text} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Task</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showSubjectPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.subjectModal}>
            <Text style={styles.modalTitle}>Select Subject</Text>
            <ScrollView style={styles.subjectList}>
              {subjects.map(subject => (
                <TouchableOpacity
                  key={subject.id}
                  style={styles.subjectOption}
                  onPress={() => {
                    setSelectedSubject(subject.id);
                    setShowSubjectPicker(false);
                  }}
                >
                  <Text style={styles.subjectOptionText}>
                    {subject.subjectCode} - {subject.subjectName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSubjectPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: screenAccents.tasks.secondary,
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
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    ...brutalInput(palette.white),
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  subjectButton: {
    ...brutalInput(palette.white),
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(43, 43, 43, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectModal: {
    ...brutalCard(screenAccents.tasks.tertiary),
    borderRadius: 24,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    marginBottom: 16,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subjectList: {
    maxHeight: 200,
  },
  subjectOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 3,
    borderBottomColor: palette.border,
  },
  subjectOptionText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  modalCloseButton: {
    ...brutalButton(palette.coral),
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: palette.text,
  },
  dateButton: {
    ...brutalInput(palette.white),
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: palette.text,
  },
  saveButton: {
    ...brutalButton(screenAccents.tasks.primary),
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: palette.textMuted,
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: palette.text,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: palette.text,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    marginTop: 12,
  },
});
