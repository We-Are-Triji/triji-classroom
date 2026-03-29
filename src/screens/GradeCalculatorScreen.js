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
import { brutalButton, brutalCard, brutalInput, brutalShadow, palette, screenAccents } from '../theme/neoBrutal';

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
        colors={[palette.background, palette.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Back Button - Fixed Position */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={palette.text} />
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
              <Feather name="trending-up" size={32} color={palette.text} />
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
                        placeholderTextColor={palette.textMuted}
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
                        placeholderTextColor={palette.textMuted}
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
                <Feather name="plus" size={20} color={palette.text} />
                <Text style={styles.addButtonText}>Add Subject</Text>
              </TouchableOpacity>

              {selectedSubjectIdx !== null && subjects.length > 1 && (
                <TouchableOpacity style={styles.deleteButton} onPress={deleteSubject}>
                  <Feather name="trash-2" size={20} color={palette.text} />
                  <Text style={styles.deleteButtonText}>Remove Selected</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.calculateButton} onPress={calculateGWA}>
                <Feather name="check-circle" size={20} color={palette.text} />
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
    backgroundColor: palette.background,
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
    borderRadius: 14,
    backgroundColor: screenAccents.tasks.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: palette.border,
    ...brutalShadow(),
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
    padding: 20,
    ...brutalCard(screenAccents.tasks.tertiary),
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: screenAccents.tasks.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: palette.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: palette.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  resultContainer: {
    backgroundColor: '#DDEDE9',
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: palette.border,
    borderRadius: 18,
  },
  resultLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  resultValue: {
    color: palette.text,
    fontSize: 32,
    fontWeight: '700',
  },
  subjectsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  subjectCard: {
    padding: 16,
    ...brutalCard(palette.white),
  },
  selectedSubjectCard: {
    borderColor: palette.border,
    backgroundColor: '#F8D9D3',
  },
  subjectNumber: {
    color: palette.text,
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
    color: palette.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: palette.background,
    padding: 12,
    color: palette.text,
    fontSize: 16,
    textAlign: 'center',
    ...brutalInput(palette.background),
  },
  buttonContainer: {
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: screenAccents.tasks.primary,
    gap: 8,
    ...brutalButton(screenAccents.tasks.primary),
  },
  addButtonText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#F8D9D3',
    gap: 8,
    ...brutalButton('#F8D9D3'),
  },
  deleteButtonText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: '600',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    ...brutalButton(screenAccents.tasks.secondary),
  },
  calculateButtonText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
