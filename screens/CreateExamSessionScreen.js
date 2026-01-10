import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { createExamSession } from '../services/examService';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faCalendarAlt, faGraduationCap, faSignature, faAlignLeft, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';

export default function CreateExamSessionScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { theme } = useTheme();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [targetGrade, setTargetGrade] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Only disable loading initially after render
  React.useEffect(() => {
    setLoading(false);
  }, []);

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
        description,
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
                  colors={['#0f766e', '#14b8a6']} 
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
            >        <View style={styles.heroContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <FontAwesomeIcon icon={faArrowLeft} size={20} color="#fff" />
            </TouchableOpacity>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={styles.heroTitle}>New Session</Text>
                                <Text style={styles.heroSubtitle}>Create a new exam schedule</Text>
                                <Text style={styles.heroDescription}>Set up dates and details for upcoming exams.</Text>
                            </View>
                        </View>
                    </View>
                  </LinearGradient>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <FontAwesomeIcon icon={faSignature} size={12} color={theme.primary} style={{ marginRight: 6 }} />
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

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <View style={styles.labelContainer}>
                <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.primary} style={{ marginRight: 6 }} />
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
                <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.primary} style={{ marginRight: 6 }} />
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

          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <FontAwesomeIcon icon={faGraduationCap} size={12} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.label, { color: theme.textSecondary }]}>TARGET GRADE (Optional)</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
              placeholder="e.g. Grade 12"
              placeholderTextColor={theme.textSecondary}
              value={targetGrade}
              onChangeText={setTargetGrade}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <FontAwesomeIcon icon={faAlignLeft} size={12} color={theme.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.label, { color: theme.textSecondary }]}>DESCRIPTION</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border, height: 80, textAlignVertical: 'top' }]}
              placeholder="Additional details..."
              placeholderTextColor={theme.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={[styles.switchRow, { borderTopColor: theme.border, borderTopWidth: 1, paddingTop: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesomeIcon icon={faCheckCircle} size={16} color={isActive ? theme.primary : theme.textSecondary} style={{ marginRight: 10 }} />
              <Text style={[styles.switchLabel, { color: theme.text }]}>Make Active Immediately</Text>
            </View>
            <Switch
              trackColor={{ false: "#767577", true: theme.primary }}
              thumbColor={isActive ? "#f4f3f4" : "#f4f3f4"}
              onValueChange={setIsActive}
              value={isActive}
            />
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
    },  backButton: {
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600'
  },
  footer: {
    marginTop: 24,
    marginBottom: 40
  }
});
