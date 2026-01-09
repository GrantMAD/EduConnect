import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image, ScrollView, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPlusCircle, faMinusCircle, faTag, faGraduationCap, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { useToast, useToastState } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from './Toast';

// Import services
import { getCurrentUser } from '../services/authService';
import { saveStudentMarks } from '../services/userService';
import { fetchGradingCategories } from '../services/gradebookService';

const defaultUserImage = require("../assets/user.png");

const MarksModal = React.memo(({ visible, onClose, classId, classMembers }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { toast, hideToast } = useToastState();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const insets = useSafeAreaInsets();

  const [marks, setMarks] = useState({});
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && classId) {
      const loadCats = async () => {
        try {
          const data = await fetchGradingCategories(classId);
          setCategories(data);
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingCats(false);
        }
      };
      loadCats();
    }
  }, [visible, classId]);

  const handleAddMark = (studentId) => {
    setMarks((prevMarks) => {
      const studentMarks = prevMarks[studentId] || [];
      return {
        ...prevMarks,
        [studentId]: [
          ...studentMarks,
          {
            categoryId: categories[0]?.id || null,
            assessmentName: '',
            score: '',
            total: '100',
            feedback: '',
            assessmentDate: new Date().toISOString().split('T')[0]
          }
        ],
      };
    });
  };

  const handleRemoveMark = (studentId, index) => {
    setMarks((prevMarks) => {
      const studentMarks = [...(prevMarks[studentId] || [])];
      studentMarks.splice(index, 1);
      return { ...prevMarks, [studentId]: studentMarks };
    });
  };

  const handleMarkChange = (studentId, index, field, value) => {
    setMarks((prevMarks) => {
      const studentMarks = [...(prevMarks[studentId] || [])];
      studentMarks[index] = { ...studentMarks[index], [field]: value };
      return { ...prevMarks, [studentId]: studentMarks };
    });
  };

  const saveMarks = async () => {
    setSaving(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) {
        showToast('You must be logged in to save marks.', 'error');
        setSaving(false);
        return;
      }

      const marksToSave = [];
      for (const studentId in marks) {
        for (const markData of marks[studentId]) {
          if (markData.assessmentName && markData.score && markData.total) {
            const score = parseFloat(markData.score);
            const total = parseFloat(markData.total);
            const percentage = ((score / total) * 100).toFixed(1);
            const formattedMark = `${score}/${total} (${percentage}%)`;

            marksToSave.push({
              student_id: studentId,
              class_id: classId,
              teacher_id: authUser.id,
              mark: formattedMark,
              score: score,
              total_possible: total,
              assessment_name: markData.assessmentName,
              category_id: markData.categoryId,
              assessment_date: markData.assessmentDate,
              teacher_feedback: markData.feedback || null,
            });
          }
        }
      }

      if (marksToSave.length === 0) {
        showToast('No valid marks to save.', 'info');
        setSaving(false);
        return;
      }

      await saveStudentMarks(marksToSave);

      // Award XP: 5 XP per student mark entered
      const xpEarned = marksToSave.length * 5;
      awardXP('marks_entry', xpEarned);

      showToast(`Marks saved successfully. +${xpEarned} XP`, 'success');
      setMarks({});
      onClose(true); // Pass true to indicate success
    } catch (error) {
      console.error('Error saving marks:', error);
      showToast('Failed to save marks.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderStudentItem = ({ item: student }) => (
    <View style={[styles.studentContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={student.users.avatar_url ? { uri: student.users.avatar_url } : defaultUserImage} style={styles.avatar} />
          <View>
            <Text style={[styles.studentName, { color: theme.colors.text }]}>{student.users.full_name}</Text>
            <Text style={[styles.studentEmail, { color: theme.colors.placeholder }]}>{student.users.email}</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={[styles.addMarkBtn, { backgroundColor: theme.colors.primary }]} onPress={() => handleAddMark(student.users.id)}>
          <Text style={styles.addMarkBtnText}>ADD GRADE</Text>
        </TouchableOpacity>
      </View>
      {marks[student.users.id] && marks[student.users.id].map((mark, index) => {
        const percentage = (mark.score && mark.total)
          ? ((parseFloat(mark.score) / parseFloat(mark.total)) * 100).toFixed(1)
          : null;
        const isOverLimit = parseFloat(mark.score) > parseFloat(mark.total);

        return (
          <View key={index} style={[styles.markEntryContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <View style={[styles.assessmentTypeContainer, { marginBottom: 12, paddingHorizontal: 12 }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      activeOpacity={0.8}
                      style={[
                        styles.typeBtn,
                        { borderColor: theme.colors.cardBorder },
                        mark.categoryId === cat.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                      onPress={() => handleMarkChange(student.users.id, index, 'categoryId', cat.id)}
                    >
                      <Text style={[styles.typeBtnText, mark.categoryId === cat.id ? { color: '#fff' } : { color: theme.colors.placeholder }]}>
                        {cat.name.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {categories.length === 0 && (
                    <Text style={{ fontSize: 10, color: theme.colors.placeholder }}>No categories defined</Text>
                  )}
                </View>
              </ScrollView>
              <TouchableOpacity onPress={() => handleRemoveMark(student.users.id, index)} style={{ marginLeft: 12 }}>
                <FontAwesomeIcon icon={faMinusCircle} size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 12, marginBottom: 12 }}>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <FontAwesomeIcon icon={faTag} size={12} color={theme.colors.placeholder} style={{ marginRight: 10 }} />
                <TextInput
                  style={[styles.markInput, { flex: 1, color: theme.colors.text }]}
                  placeholder="Assessment Name"
                  placeholderTextColor={theme.colors.placeholder}
                  value={mark.assessmentName}
                  onChangeText={(text) => handleMarkChange(student.users.id, index, 'assessmentName', text)}
                />
              </View>
            </View>

            <View style={[styles.markInputRow, { paddingHorizontal: 12, gap: 12 }]}>
              <View style={[styles.inputWrapper, { flex: 1, backgroundColor: theme.colors.surface, borderColor: isOverLimit ? '#ef4444' : theme.colors.cardBorder, borderWidth: 1 }]}>
                <TextInput
                  style={[styles.markInput, { flex: 1, color: theme.colors.text, textAlign: 'center' }]}
                  placeholder="Score"
                  placeholderTextColor={theme.colors.placeholder}
                  value={mark.score}
                  keyboardType="numeric"
                  onChangeText={(text) => handleMarkChange(student.users.id, index, 'score', text)}
                />
              </View>
              <Text style={{ color: theme.colors.placeholder, fontWeight: '900' }}>/</Text>
              <View style={[styles.inputWrapper, { flex: 1, backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <TextInput
                  style={[styles.markInput, { flex: 1, color: theme.colors.text, textAlign: 'center' }]}
                  placeholder="Total"
                  placeholderTextColor={theme.colors.placeholder}
                  value={mark.total}
                  keyboardType="numeric"
                  onChangeText={(text) => handleMarkChange(student.users.id, index, 'total', text)}
                />
              </View>
              {percentage !== null && !isNaN(percentage) && (
                <View style={[styles.percentageLabel, { backgroundColor: theme.colors.primary + '10' }]}>
                  <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '900' }}>{percentage}%</Text>
                </View>
              )}
            </View>

            <View style={{ paddingHorizontal: 12, paddingBottom: 12, marginTop: 12 }}>
              <TextInput
                style={[styles.textArea, { color: theme.colors.text, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface, borderWidth: 1 }]}
                placeholder="Teacher feedback (optional)..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
                value={mark.feedback}
                onChangeText={(text) => handleMarkChange(student.users.id, index, 'feedback', text)}
              />
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => onClose(false)}
      onSwipeComplete={() => onClose(false)}
      swipeDirection={['down']}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.4}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.swipeIndicator} />
        <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.iconBoxHeader, { backgroundColor: theme.colors.primary + '15' }]}>
              <FontAwesomeIcon icon={faPencilAlt} size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Submit Marks</Text>
          </View>
          <TouchableOpacity onPress={() => onClose(false)} style={styles.modalCloseButton}>
            <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.modalDescription, { color: '#94a3b8' }]}>BATCH ENTRY PORTAL</Text>

        <FlatList
          data={classMembers}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.studentList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />

        <View style={styles.modalFooter}>
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => onClose(false)}>
            <Text style={[styles.cancelText, { color: '#94a3b8' }]}>CANCEL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={saveMarks} disabled={saving} activeOpacity={0.8}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>SAVE ALL RECORDS</Text>}
          </TouchableOpacity>
        </View>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onHide={hideToast}
          />
        )}
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  iconBoxHeader: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDescription: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 24,
  },
  studentList: {
    maxHeight: 450,
  },
  studentContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 24,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '800',
  },
  studentEmail: {
    fontSize: 11,
    fontWeight: '500',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginRight: 12,
  },
  markEntryContainer: {
    borderRadius: 20,
    marginTop: 8,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  markInput: {
    fontSize: 14,
    fontWeight: '700',
  },
  textArea: {
    borderRadius: 12,
    height: 60,
    padding: 12,
    fontSize: 13,
    fontWeight: '600',
    textAlignVertical: 'top',
  },
  addMarkBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
  },
  addMarkBtnText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  assessmentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  typeBtnText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  percentageLabel: { paddingHorizontal: 10, height: 32, borderRadius: 8, justifyContent: 'center' },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { backgroundColor: 'rgba(0,0,0,0.05)' },
  saveText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  cancelText: {
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
});

export default MarksModal;