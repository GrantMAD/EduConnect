import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { fetchExamPaper, createExamPaper, fetchExamSession } from '../services/examService';
import { fetchAllClasses } from '../services/classService';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faBook, faBarcode, faCalendarAlt, faClock, faHourglassHalf, faChalkboardTeacher, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Button from '../components/Button';
import DateTimePicker from '@react-native-community/datetimepicker';
import LinearGradient from 'react-native-linear-gradient';

export default function CreateExamPaperScreen({ route, navigation }) {
  const { sessionId } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();
  
  const [subjectName, setSubjectName] = useState('');
  const [paperCode, setPaperCode] = useState('');
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [duration, setDuration] = useState('');
  const [totalMarks, setTotalMarks] = useState('100');
  const [loading, setLoading] = useState(false);

  // Class Selection State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [session, setSession] = useState(null);
  const [showAllClasses, setShowAllClasses] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sessionData, classesData] = await Promise.all([
        fetchExamSession(sessionId),
        fetchAllClasses(profile.school_id)
      ]);
      setSession(sessionData);
      setClasses(classesData || []);
    } catch (error) {
      console.error('Error loading paper creation data:', error);
    }
  }, [sessionId, profile.school_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredClasses = useMemo(() => {
    if (showAllClasses || !session?.target_grade) return classes;
    const target = session.target_grade.toLowerCase().trim();
    return classes.filter(c => {
      const classGrade = c.grade?.toString().toLowerCase().trim() || "";
      return classGrade === target;
    });
  }, [classes, session, showAllClasses]);

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
        class_id: selectedClassId,
        date: date.toISOString().split('T')[0],
        start_time: startTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), // HH:MM
        duration_minutes: parseInt(duration),
        total_marks: parseInt(totalMarks),
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
        colors={['#0d9488', '#14b8a6']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroContainer, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backRow}>
              <FontAwesomeIcon icon={faArrowLeft} size={12} color="rgba(255,255,255,0.8)" />
              <Text style={styles.backText}>Back to Session Details</Text>
            </TouchableOpacity>
            <Text style={styles.heroTitle}>New Exam Paper</Text>
            <Text style={styles.heroDescription}>Add a subject to the schedule</Text>
          </View>
          <View style={styles.roleBadge}>
            <FontAwesomeIcon icon={faBook} size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.roleText}>PAPER</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                    <FontAwesomeIcon icon={faChalkboardTeacher} size={12} color="#0d9488" style={{ marginRight: 6 }} />
                    <Text style={[styles.label, { color: theme.textSecondary }]}>LINK TO CLASS (OPTIONAL)</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                    onPress={() => setShowClassPicker(true)}
                >
                    <Text style={{ color: selectedClassId ? theme.text : theme.textSecondary }}>
                        {selectedClassId ? selectedClassName : 'Select an academic class'}
                    </Text>
                    <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.textSecondary} />
                </TouchableOpacity>
                {session?.target_grade && !showAllClasses && (
                    <Text style={{ fontSize: 10, color: '#0d9488', fontWeight: 'bold', marginTop: 4 }}>
                        Filtering for {session.target_grade} classes
                    </Text>
                )}
            </View>

            <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                    <FontAwesomeIcon icon={faBook} size={12} color="#0d9488" style={{ marginRight: 6 }} />
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

            <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <View style={styles.labelContainer}>
                        <FontAwesomeIcon icon={faBarcode} size={12} color="#0d9488" style={{ marginRight: 6 }} />
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
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <View style={styles.labelContainer}>
                        <FontAwesomeIcon icon={faHourglassHalf} size={12} color="#0d9488" style={{ marginRight: 6 }} />
                        <Text style={[styles.label, { color: theme.textSecondary }]}>TOTAL MARKS *</Text>
                    </View>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.colors.background, color: theme.text, borderColor: theme.border }]}
                        placeholder="e.g. 100"
                        placeholderTextColor={theme.textSecondary}
                        value={totalMarks}
                        onChangeText={setTotalMarks}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <View style={styles.labelContainer}>
                        <FontAwesomeIcon icon={faCalendarAlt} size={12} color="#0d9488" style={{ marginRight: 6 }} />
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
                        <FontAwesomeIcon icon={faClock} size={12} color="#0d9488" style={{ marginRight: 6 }} />
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
                    <FontAwesomeIcon icon={faHourglassHalf} size={12} color="#0d9488" style={{ marginRight: 6 }} />
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

      {/* Class Picker Modal */}
      <Modal visible={showClassPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface || '#ffffff' }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Select Class</Text>
                    {session?.target_grade && (
                        <TouchableOpacity 
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => setShowAllClasses(!showAllClasses)}
                        >
                            <View style={[styles.miniCheckbox, { backgroundColor: showAllClasses ? '#0d9488' : 'transparent', borderColor: '#0d9488' }]} />
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.textSecondary }}>SHOW ALL</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <FlatList
                    data={filteredClasses}
                    keyExtractor={item => item.id}
                    style={{ maxHeight: 300, marginVertical: 16 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={[styles.classItem, { borderColor: theme.border }]}
                            onPress={() => {
                                setSelectedClassId(item.id);
                                setSelectedClassName(item.name);
                                setShowClassPicker(false);
                            }}
                        >
                            <Text style={[styles.className, { color: theme.text }]}>{item.name}</Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.subject}</Text>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', color: theme.textSecondary, marginVertical: 20 }}>
                            No matching classes found.
                        </Text>
                    }
                />

                <TouchableOpacity 
                    style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}
                    onPress={() => {
                        setSelectedClassId(null);
                        setSelectedClassName('');
                        setShowClassPicker(false);
                    }}
                >
                    <Text style={{ color: theme.text, fontWeight: 'bold' }}>Clear Selection</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={{ marginTop: 12, alignItems: 'center' }}
                    onPress={() => setShowClassPicker(false)}
                >
                    <Text style={{ color: theme.textSecondary }}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
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
  backButton: {
      padding: 4,
  },
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  classItem: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  className: {
    fontWeight: '700',
    fontSize: 15,
  },
  miniCheckbox: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    marginRight: 6,
  },
  closeBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  }
});
