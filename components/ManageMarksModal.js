import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrash, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

const MarkItem = ({ item, onUpdate, onDelete }) => {
    const [currentMark, setCurrentMark] = useState(item.mark);
    const [currentAssessmentName, setCurrentAssessmentName] = useState(item.assessment_name);
  
    return (
      <View style={styles.markItemContainer}>
        <TextInput
          style={styles.input}
          value={currentAssessmentName}
          onChangeText={setCurrentAssessmentName}
          placeholder="Assessment Name"
        />
        <TextInput
          style={styles.input}
          value={currentMark}
          onChangeText={setCurrentMark}
          placeholder="Mark"
          keyboardType="numeric"
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onUpdate(item.id, currentMark, currentAssessmentName)}>
            <FontAwesomeIcon icon={faSave} size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(item.id)}>
            <FontAwesomeIcon icon={faTrash} size={20} color="#dc3545" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

const ManageMarksModal = ({ visible, onClose, student, classId }) => {
  const { showToast } = useToast();
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [marksChanged, setMarksChanged] = useState(false);

  useEffect(() => {
    if (student) {
      fetchMarks();
    }
    setMarksChanged(false);
  }, [student]);

  const handleClose = () => {
    onClose(marksChanged);
  };

  const fetchMarks = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_marks')
        .select('*')
        .eq('student_id', student.users.id)
        .eq('class_id', classId);
      if (error) throw error;
      setMarks(data);
    } catch (error) {
      showToast('Failed to fetch marks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMark = async (markId, newMark, newAssessmentName) => {
    try {
      const { error } = await supabase
        .from('student_marks')
        .update({ mark: newMark, assessment_name: newAssessmentName })
        .eq('id', markId);
      if (error) throw error;
      showToast('Mark updated successfully.', 'success');
      setMarksChanged(true);
      fetchMarks();
    } catch (error) {
      showToast('Failed to update mark.', 'error');
    }
  };

  const handleDeleteMark = async (markId) => {
    Alert.alert(
      'Delete Mark',
      'Are you sure you want to delete this mark?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('student_marks')
                .delete()
                .eq('id', markId);
              if (error) throw error;
              showToast('Mark deleted successfully.', 'success');
              setMarksChanged(true);
              fetchMarks();
            } catch (error) {
              showToast('Failed to delete mark.', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Manage Marks for {student?.users.full_name}</Text>
            <TouchableOpacity onPress={handleClose}>
              <FontAwesomeIcon icon={faTimes} size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {loading ? (
            <Text>Loading marks...</Text>
          ) : (
            <FlatList
              data={marks}
              renderItem={({item}) => <MarkItem item={item} onUpdate={handleUpdateMark} onDelete={handleDeleteMark} />}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={<Text>No marks found for this student.</Text>}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      },
      modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        maxHeight: '80%',
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      },
      title: {
        fontSize: 18,
        fontWeight: 'bold',
      },
      markItemContainer: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
      },
      input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
        width: '100%',
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
      },
      actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 5,
        backgroundColor: '#e0f2fe',
      },
      actionButtonText: {
        marginLeft: 5,
        color: '#007AFF',
        fontWeight: 'bold',
      },
      deleteButton: {
        backgroundColor: '#ffe0e0',
      },
      deleteButtonText: {
        color: '#dc3545',
      },
});

export default ManageMarksModal;
