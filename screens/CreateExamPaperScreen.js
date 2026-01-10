import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { createExamPaper } from '../services/examService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faBook, faBarcode, faCalendarAlt, faClock, faHourglassHalf } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';

export default function CreateExamPaperScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  
  const [subjectName, setSubjectName] = useState('');
  const [paperCode, setPaperCode] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSave = async () => {
    if (!subjectName || !paperCode || !date || !startTime || !duration) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await createExamPaper({
        session_id: sessionId,
        subject_name: subjectName,
        paper_code: paperCode,
        date: date.toISOString().split('T')[0],
        start_time: startTime.toLocaleTimeString('en-US', { hour12: false }), // HH:MM:SS
        duration_minutes: parseInt(duration),
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) setStartTime(selectedDate);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
            colors={['#0f766e', '#14b8a6']} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <FontAwesomeIcon icon={faArrowLeft} size={20} color="#fff" />
                </TouchableOpacity>
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.heroTitle}>New Exam Paper</Text>
                    <Text style={styles.heroSubtitle}>Add a subject to the schedule</Text>
                    <Text style={styles.heroDescription}>Define the paper details, time, and duration.</Text>
                </View>
            </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                    <FontAwesomeIcon icon={faBook} size={12} color={theme.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.label, { color: theme.textSecondary }]}>SUBJECT NAME *</Text>
                </View>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. Mathematics P1"
                    placeholderTextColor={theme.textSecondary}
                    value={subjectName}
                    onChangeText={setSubjectName}
                />
            </View>

            <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                    <FontAwesomeIcon icon={faBarcode} size={12} color={theme.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.label, { color: theme.textSecondary }]}>PAPER CODE *</Text>
                </View>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. MAT101"
                    placeholderTextColor={theme.textSecondary}
                    value={paperCode}
                    onChangeText={setPaperCode}
                />
            </View>

            <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <View style={styles.labelContainer}>
                        <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.label, { color: theme.textSecondary }]}>DATE *</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.dateButton, { backgroundColor: theme.colors.background, borderColor: theme.border }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={{ color: theme.text }}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <View style={styles.labelContainer}>
                        <FontAwesomeIcon icon={faClock} size={12} color={theme.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.label, { color: theme.textSecondary }]}>START TIME *</Text>
                    </View>
                    <TouchableOpacity 
                        style={[styles.dateButton, { backgroundColor: theme.colors.background, borderColor: theme.border }]}
                        onPress={() => setShowTimePicker(true)}
                    >
                        <Text style={{ color: theme.text }}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker value={date} mode="date" display="default" onChange={onDateChange} />
            )}
            {showTimePicker && (
                <DateTimePicker value={startTime} mode="time" display="default" onChange={onTimeChange} />
            )}

            <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                    <FontAwesomeIcon icon={faHourglassHalf} size={12} color={theme.primary} style={{ marginRight: 6 }} />
                    <Text style={[styles.label, { color: theme.textSecondary }]}>DURATION (MINUTES) *</Text>
                </View>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                    placeholder="e.g. 120"
                    placeholderTextColor={theme.textSecondary}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                />
            </View>
        </View>

        <View style={styles.footer}>
            <Button title="Add Paper" onPress={handleSave} loading={loading} />
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 8,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  heroSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      marginTop: 2,
  },
  heroDescription: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 12,
      marginTop: 4,
  },
  backButton: {
      padding: 4,
  },
  content: {
    padding: 16,
  },
  card: {
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
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
