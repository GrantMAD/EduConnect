import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RNModal from 'react-native-modal';
import { useTheme } from '../context/ThemeContext';
import { fetchExamPaper, createExamPaper, fetchExamSession } from '../services/examService';
import { fetchAllClasses } from '../services/classService';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowLeft, faBook, faBarcode, faCalendarAlt, faClock, faHourglassHalf, faChalkboardTeacher, faChevronRight, faSearch, faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';
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
  const [searchQuery, setSearchQuery] = useState('');

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
      
      // Set initial date to session start date if available
      if (sessionData?.start_date) {
        setDate(new Date(sessionData.start_date));
      }
    } catch (error) {
      console.error('Error loading paper creation data:', error);
    }
  }, [sessionId, profile.school_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredClasses = useMemo(() => {
    let result = classes;
    
    // Filter by grade if needed
    if (!showAllClasses && session?.target_grade) {
        const target = session.target_grade.toLowerCase().trim();
        result = result.filter(c => {
            const classGrade = c.grade?.toString().toLowerCase().trim() || "";
            return classGrade === target;
        });
    }

    // Filter by search query
    if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        result = result.filter(c => 
            c.name?.toLowerCase().includes(query) || 
            c.subject?.toLowerCase().includes(query)
        );
    }

    return result;
  }, [classes, session, showAllClasses, searchQuery]);

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
                    {session?.start_date && session?.end_date && (
                        <Text style={{ fontSize: 9, color: theme.textSecondary, marginTop: 4 }}>
                            Range: {new Date(session.start_date).toLocaleDateString()} - {new Date(session.end_date).toLocaleDateString()}
                        </Text>
                    )}
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
                <DateTimePicker 
                    value={date} 
                    mode="date" 
                    display="default" 
                    onChange={onDateChange}
                    minimumDate={session?.start_date ? new Date(session.start_date) : undefined}
                    maximumDate={session?.end_date ? new Date(session.end_date) : undefined}
                />
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
      <RNModal 
        isVisible={showClassPicker}
        onBackdropPress={() => setShowClassPicker(false)}
        onSwipeComplete={() => setShowClassPicker(false)}
        swipeDirection={['down']}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        propagateSwipe
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface || '#ffffff', paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalDragIndicator} />
            
            <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Select Class</Text>
                <TouchableOpacity onPress={() => setShowClassPicker(false)} style={styles.closeIconBtn}>
                    <FontAwesomeIcon icon={faTimes} size={20} color={theme.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.background, borderColor: theme.border }]}>
                <FontAwesomeIcon icon={faSearch} size={16} color={theme.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search classes..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                         <FontAwesomeIcon icon={faTimes} size={14} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Toggle */}
            {session?.target_grade && (
                <TouchableOpacity 
                    style={styles.filterToggle}
                    onPress={() => setShowAllClasses(!showAllClasses)}
                >
                    <View style={[styles.checkbox, { backgroundColor: showAllClasses ? '#0d9488' : 'transparent', borderColor: '#0d9488' }]}>
                        {showAllClasses && <FontAwesomeIcon icon={faCheck} size={10} color="white" />}
                    </View>
                    <Text style={{ fontSize: 13, color: theme.textSecondary, marginLeft: 8 }}>
                        Show all classes (Ignore {session.target_grade} filter)
                    </Text>
                </TouchableOpacity>
            )}

            <FlatList
                data={filteredClasses}
                keyExtractor={item => item.id.toString()}
                style={{ maxHeight: 400, marginVertical: 12 }}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={[
                            styles.classItem, 
                            { 
                                borderColor: theme.border, 
                                backgroundColor: selectedClassId === item.id ? (theme.dark ? '#134e4a' : '#f0fdfa') : theme.cardBackground,
                                borderColor: selectedClassId === item.id ? '#0d9488' : theme.border 
                            }
                        ]}
                        onPress={() => {
                            setSelectedClassId(item.id);
                            setSelectedClassName(item.name);
                            setShowClassPicker(false);
                        }}
                    >
                        <View style={[styles.classIcon, { backgroundColor: selectedClassId === item.id ? '#0d9488' : (theme.dark ? '#333' : '#e2e8f0') }]}>
                             <FontAwesomeIcon icon={faBook} size={16} color={selectedClassId === item.id ? 'white' : theme.textSecondary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.className, { color: theme.text }]}>{item.name}</Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{item.subject || 'No Subject'}</Text>
                        </View>
                        {selectedClassId === item.id && (
                             <FontAwesomeIcon icon={faCheck} size={16} color="#0d9488" />
                        )}
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', padding: 30 }}>
                        <FontAwesomeIcon icon={faSearch} size={40} color={theme.border} />
                        <Text style={{ textAlign: 'center', color: theme.textSecondary, marginTop: 12 }}>
                            No matching classes found.
                        </Text>
                    </View>
                }
            />

            <TouchableOpacity 
                style={[styles.clearBtn, { borderColor: theme.border }]}
                onPress={() => {
                    setSelectedClassId(null);
                    setSelectedClassName('');
                    setShowClassPicker(false);
                }}
            >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Clear Selection</Text>
            </TouchableOpacity>
        </View>
      </RNModal>
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
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  closeIconBtn: {
      padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  filterToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
      paddingVertical: 4,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classItem: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  classIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
  },
  className: {
    fontWeight: '700',
    fontSize: 15,
  },
  clearBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  }
});
