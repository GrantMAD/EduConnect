import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPlusCircle, faMinusCircle, faTag, faGraduationCap, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const defaultUserImage = require("../assets/user.png");

const MarksModal = ({ visible, onClose, classId, classMembers }) => {
  const { showToast } = useToast();
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAddMark = (studentId) => {
    setMarks((prevMarks) => {
      const studentMarks = prevMarks[studentId] || [];
      return {
        ...prevMarks,
        [studentId]: [...studentMarks, { assessmentName: '', mark: '', assessmentType: 'test' }],
      };
    });
  };

  const handleMarkChange = (studentId, index, field, value) => {
    setMarks((prevMarks) => {
      const studentMarks = [...prevMarks[studentId]];
      studentMarks[index] = { ...studentMarks[index], [field]: value };
      return {
        ...prevMarks,
        [studentId]: studentMarks,
      };
    });
  };

  const handleRemoveMark = (studentId, index) => {
    setMarks((prevMarks) => {
      const studentMarks = [...prevMarks[studentId]];
      studentMarks.splice(index, 1);
      return {
        ...prevMarks,
        [studentId]: studentMarks,
      };
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

      showToast('Marks saved successfully.', 'success');
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
    <View style={styles.studentContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image source={student.users.avatar_url ? { uri: student.users.avatar_url } : defaultUserImage} style={styles.avatar} />
          <View>
            <Text style={styles.studentName}>{student.users.full_name}</Text>
            <Text style={styles.studentEmail}>{student.users.email}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addMarkButton} onPress={() => handleAddMark(student.users.id)}>
          <FontAwesomeIcon icon={faPlusCircle} size={20} color="#007AFF" />
          <Text style={styles.addMarkButtonText}>Add Mark</Text>
        </TouchableOpacity>
      </View>
      {marks[student.users.id] && marks[student.users.id].map((mark, index) => (
        <View key={index} style={styles.markEntryContainer}>
          <View style={[styles.assessmentTypeContainer, {justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 10}]}>
            <View style={{flexDirection: 'row'}}>
              <TouchableOpacity
                style={[styles.assessmentTypeButton, mark.assessmentType === 'test' && styles.assessmentTypeButtonSelected]}
                onPress={() => handleMarkChange(student.users.id, index, 'assessmentType', 'test')}
              >
                <Text style={[styles.assessmentTypeButtonText, mark.assessmentType === 'test' && styles.assessmentTypeButtonTextSelected]}>Test</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.assessmentTypeButton, mark.assessmentType === 'assignment' && styles.assessmentTypeButtonSelected]}
                onPress={() => handleMarkChange(student.users.id, index, 'assessmentType', 'assignment')}
              >
                <Text style={[styles.assessmentTypeButtonText, mark.assessmentType === 'assignment' && styles.assessmentTypeButtonTextSelected]}>Assignment</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => handleRemoveMark(student.users.id, index)} style={{alignSelf: 'center'}}>
              <FontAwesomeIcon icon={faMinusCircle} size={20} color="#dc3545" />
            </TouchableOpacity>
          </View>
          <View style={[styles.markInputRow, {paddingHorizontal: 10}]}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginRight: 10}}>
              <FontAwesomeIcon icon={faTag} size={16} color="#888" style={{marginRight: 5}} />
              <TextInput
                style={[styles.markInput, {flex: 1}]}
                placeholder="Assessment Name"
                value={mark.assessmentName}
                onChangeText={(text) => handleMarkChange(student.users.id, index, 'assessmentName', text)}
              />
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <FontAwesomeIcon icon={faGraduationCap} size={16} color="#888" style={{marginRight: 5}} />
              <TextInput
                style={[styles.markInput, { width: 80 }]}
                placeholder="Mark"
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <FontAwesomeIcon icon={faPencilAlt} size={20} color="#007AFF" style={{marginRight: 10}} />
              <Text style={styles.modalTitle}>Enter Marks</Text>
            </View>
            <TouchableOpacity onPress={() => onClose(false)}>
              <FontAwesomeIcon icon={faTimes} size={20} color="#333" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalDescription}>Enter assessment details and marks for each student. You can add multiple marks per student.</Text>

          <FlatList
            data={classMembers}
            renderItem={renderStudentItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.studentList}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => onClose(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveMarks} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Marks'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  studentList: {
    maxHeight: 400,
  },
  studentContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    // marginBottom: 10, // Removed as email will follow
  },
  studentEmail: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  markInputRow: {
    marginBottom: 10,
  },
  markInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
  },
  markEntryContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  addMarkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
  },
  addMarkButtonText: {
    marginLeft: 10,
    color: '#007AFF',
    fontWeight: '600',
  },
  assessmentTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10,
  },
  assessmentTypeButton: {
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginHorizontal: 5,
  },
  assessmentTypeButtonSelected: {
    backgroundColor: '#007AFF',
  },
  assessmentTypeButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 12,
  },
  assessmentTypeButtonTextSelected: {
    color: '#fff',
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
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  cancelText: {
    color: '#333',
    fontWeight: '600',
  },
});

export default MarksModal;
