import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPlusCircle, faMinusCircle, faTag, faGraduationCap, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';

const defaultUserImage = require("../assets/user.png");

const MarksModal = ({ visible, onClose, classId, classMembers }) => {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};

  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAddMark = (studentId) => {
    setMarks((prevMarks) => {
      const studentMarks = prevMarks[studentId] || [];
      return {
        ...prevMarks,
        [studentId]: [...studentMarks, { assessmentType: 'test', assessmentName: '', mark: '' }],
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
          if (markData.assessmentName && markData.mark) {
            marksToSave.push({
              student_id: studentId,
              class_id: classId,
              teacher_id: user.id,
              mark: markData.mark,
              assessment_name: `${markData.assessmentType}: ${markData.assessmentName}`,
            });
          }
        }
      }

      if (marksToSave.length === 0) {
        showToast('No marks to save.', 'info');
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
    <View style={[styles.studentContainer, { backgroundColor: theme.colors.background }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={student.users.avatar_url ? { uri: student.users.avatar_url } : defaultUserImage} style={[styles.avatar, { borderColor: theme.colors.primary }]} />
          <View>
            <Text style={[styles.studentName, { color: theme.colors.text }]}>{student.users.full_name}</Text>
            <Text style={[styles.studentEmail, { color: theme.colors.placeholder }]}>{student.users.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.addMarkButton, { backgroundColor: theme.colors.inputBackground }]} onPress={() => handleAddMark(student.users.id)}>
          <FontAwesomeIcon icon={faPlusCircle} size={20} color={theme.colors.primary} />
          <Text style={[styles.addMarkButtonText, { color: theme.colors.primary }]}>Add Mark</Text>
        </TouchableOpacity>
      </View>
      {marks[student.users.id] && marks[student.users.id].map((mark, index) => (
        <View key={index} style={[styles.markEntryContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <View style={[styles.assessmentTypeContainer, { justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 10 }]}>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[styles.assessmentTypeButton, { borderColor: theme.colors.primary }, mark.assessmentType === 'test' && { backgroundColor: theme.colors.primary }]}
                onPress={() => handleMarkChange(student.users.id, index, 'assessmentType', 'test')}
              >
                <Text style={[styles.assessmentTypeButtonText, { color: theme.colors.primary }, mark.assessmentType === 'test' && { color: '#fff' }]}>Test</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assessmentTypeButton, { borderColor: theme.colors.primary }, mark.assessmentType === 'assignment' && { backgroundColor: theme.colors.primary }]}
                onPress={() => handleMarkChange(student.users.id, index, 'assessmentType', 'assignment')}
              >
                <Text style={[styles.assessmentTypeButtonText, { color: theme.colors.primary }, mark.assessmentType === 'assignment' && { color: '#fff' }]}>Assignment</Text>
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
              <FontAwesomeIcon icon={faGraduationCap} size={16} color={theme.colors.placeholder} style={{ marginRight: 5 }} />
              <TextInput
                style={[styles.markInput, { width: 80, color: theme.colors.text, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.inputBackground }]}
                placeholder="Mark"
                placeholderTextColor={theme.colors.placeholder}
                value={mark.mark}
                onChangeText={(text) => handleMarkChange(student.users.id, index, 'mark', text)}
              />
            </View>
          </View>
        </View>
      ))}
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
      <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
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
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Marks'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    borderRadius: 12,
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
    borderRadius: 8,
    padding: 10,
  },
  markEntryContainer: {
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 5,
    borderWidth: 1,
    paddingVertical: 5,
  },
  addMarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
  },
  addMarkButtonText: {
    marginLeft: 5,
    fontWeight: '600',
    fontSize: 12,
  },
  assessmentTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 5,
  },
  assessmentTypeButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    marginHorizontal: 5,
  },
  assessmentTypeButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
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
