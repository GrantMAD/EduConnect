import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image, ScrollView, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPlusCircle, faMinusCircle, faTag, faGraduationCap, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import { useToast, useToastState } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from './Toast';

const defaultUserImage = require("../assets/user.png");

const MarksModal = ({ visible, onClose, classId, classMembers }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { toast, hideToast } = useToastState();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const insets = useSafeAreaInsets();

  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAddMark = (studentId) => {
    setMarks((prevMarks) => {
      const studentMarks = prevMarks[studentId] || [];
      return {
        ...prevMarks,
        [studentId]: [...studentMarks, { assessmentType: 'test', assessmentName: '', score: '', total: '100', feedback: '' }],
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
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
              teacher_id: user.id,
              mark: formattedMark,
              score: score,
              total_possible: total,
              assessment_name: `${markData.assessmentType}: ${markData.assessmentName}`,
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

      const { error } = await supabase.from('student_marks').insert(marksToSave);

      if (error) throw error;

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
    <View style={[styles.studentContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={student.users.avatar_url ? { uri: student.users.avatar_url } : defaultUserImage} style={[styles.avatar, { borderColor: theme.colors.primary }]} />
          <View>
            <Text style={[styles.studentName, { color: theme.colors.text }]}>{student.users.full_name}</Text>
            <Text style={[styles.studentEmail, { color: theme.colors.placeholder }]}>{student.users.email}</Text>
          </View>
        </View>
        <TouchableOpacity activeOpacity={0.7} style={[styles.addMarkBtn, { backgroundColor: theme.colors.primary }]} onPress={() => handleAddMark(student.users.id)}>
          <FontAwesomeIcon icon={faPlusCircle} size={14} color="#fff" />
          <Text style={styles.addMarkBtnText}>ADD GRADE</Text>
        </TouchableOpacity>
      </View>
      {marks[student.users.id] && marks[student.users.id].map((mark, index) => {
        const percentage = (mark.score && mark.total) 
            ? ((parseFloat(mark.score) / parseFloat(mark.total)) * 100).toFixed(1) 
            : null;
        const isOverLimit = parseFloat(mark.score) > parseFloat(mark.total);

        return (
          <View key={index} style={[styles.markEntryContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            <View style={[styles.assessmentTypeContainer, { justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 10 }]}>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.typeBtn, { borderColor: theme.colors.cardBorder }, mark.assessmentType === 'test' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  onPress={() => handleMarkChange(student.users.id, index, 'assessmentType', 'test')}
                >
                  <Text style={[styles.typeBtnText, mark.assessmentType === 'test' ? { color: '#fff' } : { color: theme.colors.textSecondary }]}>TEST</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.typeBtn, { borderColor: theme.colors.cardBorder }, mark.assessmentType === 'assignment' && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                  onPress={() => handleMarkChange(student.users.id, index, 'assessmentType', 'assignment')}
                >
                  <Text style={[styles.typeBtnText, mark.assessmentType === 'assignment' ? { color: '#fff' } : { color: theme.colors.textSecondary }]}>ASSIGNMENT</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => handleRemoveMark(student.users.id, index)} style={{ alignSelf: 'center' }}>
                <FontAwesomeIcon icon={faMinusCircle} size={20} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
            <View style={[styles.markInputRow, { paddingHorizontal: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginRight: 10, flex: 1 }}>
                <FontAwesomeIcon icon={faTag} size={16} color={theme.colors.placeholder} style={{ marginRight: 5 }} />
                <TextInput
                  style={[styles.markInput, { flex: 1, color: theme.colors.text, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.inputBackground }]}
                  placeholder="Assessment Name"
                  placeholderTextColor={theme.colors.placeholder}
                  value={mark.assessmentName}
                  onChangeText={(text) => handleMarkChange(student.users.id, index, 'assessmentName', text)}
                />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <TextInput
                  style={[styles.markInput, { width: 60, color: theme.colors.text, borderColor: isOverLimit ? theme.colors.error : theme.colors.cardBorder, backgroundColor: theme.colors.inputBackground, textAlign: 'center' }]}
                  placeholder="Score"
                  placeholderTextColor={theme.colors.placeholder}
                  value={mark.score}
                  keyboardType="numeric"
                  onChangeText={(text) => handleMarkChange(student.users.id, index, 'score', text)}
                />
                <Text style={{ marginHorizontal: 5, color: theme.colors.text }}>/</Text>
                <TextInput
                  style={[styles.markInput, { width: 60, color: theme.colors.text, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.inputBackground, textAlign: 'center' }]}
                  placeholder="Total"
                  placeholderTextColor={theme.colors.placeholder}
                  value={mark.total}
                  keyboardType="numeric"
                  onChangeText={(text) => handleMarkChange(student.users.id, index, 'total', text)}
                />
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, marginBottom: 10 }}>
                {percentage !== null && !isNaN(percentage) ? (
                    <Text style={{ color: parseFloat(percentage) >= 80 ? theme.colors.success : parseFloat(percentage) >= 60 ? theme.colors.warning : theme.colors.error, fontWeight: 'bold' }}>
                        {percentage}%
                    </Text>
                ) : <View />}
                {isOverLimit && <Text style={{ color: theme.colors.error, fontSize: 10, fontWeight: 'bold' }}>Exceeds total!</Text>}
            </View>
            <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
              <TextInput
                style={[styles.markInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.inputBackground, height: 60, textAlignVertical: 'top' }]}
                placeholder="Add feedback/comments (optional)..."
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
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 30) }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesomeIcon icon={faPencilAlt} size={20} color={theme.colors.primary} style={{ marginRight: 10 }} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Enter Marks</Text>
          </View>
          <TouchableOpacity onPress={() => onClose(false)} style={styles.modalCloseButton}>
            <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.modalDescription, { color: theme.colors.placeholder }]}>Enter assessment details and marks for each student. You can add multiple marks per student.</Text>

        <FlatList
          data={classMembers}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.studentList}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.modalFooter}>
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.colors.cardBackground }]} onPress={() => onClose(false)}>
            <Text style={[styles.cancelText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={saveMarks} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save Marks</Text>}
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
};

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    maxHeight: '90%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  studentList: {
    maxHeight: 400,
  },
  studentContainer: {
    marginBottom: 15,
    padding: 15,
    borderRadius: 24,
    borderWidth: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
  },
  markInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  markInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  markEntryContainer: {
    borderRadius: 18,
    marginTop: 10,
    marginBottom: 5,
    borderWidth: 1,
    paddingVertical: 10,
  },
  addMarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  addMarkBtnText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  assessmentTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 5,
  },
  typeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  typeBtnText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  cancelText: {
    fontWeight: '600',
  },
});

export default MarksModal;