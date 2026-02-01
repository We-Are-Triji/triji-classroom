import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const initialSubject = { name: '', units: '', grade: '' };

export default function GradeCalculatorScreen({ navigation }) {
  const [subjects, setSubjects] = useState([{ units: '', grade: '' }]);
  const [gwa, setGwa] = useState(null);
  const [selectedSubjectIdx, setSelectedSubjectIdx] = useState(null);

  const handleInputChange = (index, field, value) => {
    const updatedSubjects = [...subjects];
    updatedSubjects[index][field] = value;
    setSubjects(updatedSubjects);
  };

  const addSubject = () => {
    setSubjects(prev => [...prev, { units: '', grade: '' }]);
  };

  const deleteSubject = () => {
    if (selectedSubjectIdx === null || subjects.length === 1) return;
    setSubjects(prev => prev.filter((_, idx) => idx !== selectedSubjectIdx));
    setSelectedSubjectIdx(null);
  };

  const calculateGWA = () => {
    try {
      // Validate all inputs first
      let hasValidInput = false;
      let hasInvalidInput = false;

      for (const subj of subjects) {
        const units = parseFloat(subj.units);
        const grade = parseFloat(subj.grade);

        // Check if both fields have values
        if (subj.units.trim() !== '' || subj.grade.trim() !== '') {
          // Validate numeric input
          if (isNaN(units) || isNaN(grade)) {
            hasInvalidInput = true;
            break;
          }
          // Validate grade range (typical 1.0-5.0 scale)
          if (grade < 1.0 || grade > 5.0) {
            Alert.alert('Invalid Grade', 'Grades must be between 1.0 and 5.0');
            return;
          }
          // Validate units are positive
          if (units <= 0) {
            Alert.alert('Invalid Units', 'Units must be greater than 0');
            return;
          }
          hasValidInput = true;
        }
      }

      if (!hasValidInput) {
        Alert.alert('No Data', 'Please enter at least one subject with units and grade.');
        return;
      }

      if (hasInvalidInput) {
        Alert.alert('Invalid Input', 'Please enter valid numbers for units and grades.');
        return;
      }

      // Calculate GWA
      let totalUnits = 0;
      let weightedSum = 0;

      for (const subj of subjects) {
        const units = parseFloat(subj.units);
        const grade = parseFloat(subj.grade);
        if (!isNaN(units) && !isNaN(grade) && units > 0) {
          totalUnits += units;
          weightedSum += units * grade;
        }
      }

      if (totalUnits === 0) {
        setGwa('N/A');
      } else {
        const calculatedGwa = (weightedSum / totalUnits).toFixed(2);
        setGwa(calculatedGwa);
        Alert.alert('Success', `Your GWA is ${calculatedGwa}`);
      }
    } catch (error) {
      console.error('Error calculating GWA:', error);
      Alert.alert(
        'Calculation Error',
        'An error occurred while calculating your GWA. Please check your inputs.'
      );
    }
  };

  return (
    <View style={styles.mainContainer}>
      {/* Base dark gradient */}
      <LinearGradient
        colors={['#1B2845', '#23243a', '#22305a', '#3a5a8c', '#23243a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Back Button - Fixed Position */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.cardContainer}>
          <View style={styles.mainCard}>
            <View style={styles.iconContainer}>
              <Feather name="trending-up" size={32} color="#22e584" />
            </View>

            <Text style={styles.headerTitle}>GWA Calculator</Text>
            <Text style={styles.subtitle}>Calculate your General Weighted Average</Text>

            {/* Result Field Container */}
            {gwa !== null && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultLabel}>Your GWA</Text>
                <Text style={styles.resultValue}>{gwa}</Text>
              </View>
            )}

            {/* Subjects List */}
            <View style={styles.subjectsContainer}>
              {subjects.map((subject, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.subjectCard,
                    selectedSubjectIdx === idx && styles.selectedSubjectCard,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedSubjectIdx(idx)}
                >
                  <Text style={styles.subjectNumber}>Subject {idx + 1}</Text>
                  <View style={styles.inputsContainer}>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputLabel}>Units</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="numeric"
                        value={subject.units}
                        onChangeText={text => handleInputChange(idx, 'units', text)}
                      />
                    </View>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputLabel}>Grade</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.0"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        keyboardType="decimal-pad"
                        value={subject.grade}
                        onChangeText={text => handleInputChange(idx, 'grade', text)}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.addButton} onPress={addSubject}>
                <Feather name="plus" size={20} color="#22e584" />
                <Text style={styles.addButtonText}>Add Subject</Text>
              </TouchableOpacity>

              {selectedSubjectIdx !== null && subjects.length > 1 && (
                <TouchableOpacity style={styles.deleteButton} onPress={deleteSubject}>
                  <Feather name="trash-2" size={20} color="#FF3B30" />
                  <Text style={styles.deleteButtonText}>Remove Selected</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.calculateButton} onPress={calculateGWA}>
                <Feather name="check-circle" size={20} color="#fff" />
                <Text style={styles.calculateButtonText}>Calculate GWA</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardContainer: {
    marginTop: 10,
  },
  mainCard: {
    backgroundColor: 'rgba(30, 32, 40, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(34, 229, 132, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginBottom: 20,
  },
  resultContainer: {
    backgroundColor: 'rgba(34, 229, 132, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34, 229, 132, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  resultLabel: {
    color: '#22e584',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  subjectsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  subjectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedSubjectCard: {
    borderColor: '#FF3B30',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  subjectNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#22e584',
    gap: 8,
  },
  addButtonText: {
    color: '#22e584',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
    gap: 8,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 15,
    fontWeight: '600',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22e584',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
