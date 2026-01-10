import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { createExamSession } from '../services/examService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faCalendarAlt, faGraduationCap, faSignature, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';

export default function CreateExamSessionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [targetGrade, setTargetGrade] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSave = async () => {
    if (!name || !startDate || !endDate) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await createExamSession({
        school_id: profile.school_id,
        name,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        target_grade: targetGrade,
        is_active: isActive
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate) setEndDate(selectedDate);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#0d9488', '#14b8a6']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
              <FontAwesomeIcon icon={faArrowLeft} size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.backText}>Back to Exam Hub</Text>
            </TouchableOpacity>
            <Text style={styles.heroTitle}>New Session</Text>
            <Text style={styles.heroDescription}>Set up dates and details for upcoming exams.</Text>
          </View>
          <View style={styles.roleBadge}>
            <FontAwesomeIcon icon={faCalendarAlt} size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.roleText}>CREATE</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.glowWrapper}>
          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            {/* SESSION NAME */}
            <View style={styles.formGroup}>
              <View style={styles.labelContainer}>
                <FontAwesomeIcon icon={faSignature} size={12} color="#0d9488" style={{ marginRight: 6 }} />
                <Text style={[styles.label, { color: theme.textSecondary }]}>SESSION NAME *</Text>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Mid-Year 2026"
                placeholderTextColor={theme.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* TARGET GRADE */}
            <View style={styles.formGroup}>
              <View style={styles.labelContainer}>
                <FontAwesomeIcon icon={faGraduationCap} size={12} color="#0d9488" style={{ marginRight: 6 }} />
                <Text style={[styles.label, { color: theme.textSecondary }]}>TARGET GRADE (Optional)</Text>
              </View>
              <View style={[styles.pickerContainer, { backgroundColor: theme.colors.background, borderColor: theme.border }]}>
                <Picker
                  selectedValue={targetGrade}
                  onValueChange={(itemValue) => {
                    setTargetGrade(itemValue);
                  }}
                  style={{ color: theme.text }}
                  dropdownIconColor={theme.text}
                >
                  <Picker.Item label="General / All Grades" value="" />
                  {['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => (
                    <Picker.Item key={g} label={g} value={g} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* DATE ROW */}
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <View style={styles.labelContainer}>
                  <FontAwesomeIcon icon={faCalendarAlt} size={12} color="#0d9488" style={{ marginRight: 6 }} />
                  <Text style={[styles.label, { color: theme.textSecondary }]}>START DATE *</Text>
                </View>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.colors.background, borderColor: theme.border }]}
                  onPress={() => setShowStartPicker(true)}
                >
                  <Text style={{ color: theme.text }}>{startDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <View style={styles.labelContainer}>
                  <FontAwesomeIcon icon={faCalendarAlt} size={12} color="#0d9488" style={{ marginRight: 6 }} />
                  <Text style={[styles.label, { color: theme.textSecondary }]}>END DATE *</Text>
                </View>
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.colors.background, borderColor: theme.border }]}
                  onPress={() => setShowEndPicker(true)}
                >
                  <Text style={{ color: theme.text }}>{endDate.toLocaleDateString()}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker value={startDate} mode="date" display="default" onChange={onStartDateChange} />
            )}
            {showEndPicker && (
              <DateTimePicker value={endDate} mode="date" display="default" onChange={onEndDateChange} />
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Button title="Create Session" onPress={handleSave} loading={loading} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    padding: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
    letterSpacing: -1,
  },
  heroDescription: {
    color: '#e0f2f1',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  backText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
  },
  backButton: { marginRight: 12 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  roleText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    marginTop: 2,
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 18,
    padding: 20,
  },
  glowWrapper: {
    marginBottom: 16,
    // iOS glow
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    // Android glow
    elevation: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center'
  },
  footer: {
    marginTop: 24,
    marginBottom: 40
  }
});