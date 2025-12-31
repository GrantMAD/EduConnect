import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrash, faSave, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';

const MarkItem = ({ item, onUpdate, onDelete }) => {
    const [currentAssessmentName, setCurrentAssessmentName] = useState(item.assessment_name);
    const [currentScore, setCurrentScore] = useState(item.score?.toString() || '');
    const [currentTotal, setCurrentTotal] = useState(item.total_possible?.toString() || '100');
    const [currentFeedback, setCurrentFeedback] = useState(item.teacher_feedback || '');
  
    const percentage = (currentScore && currentTotal) 
        ? ((parseFloat(currentScore) / parseFloat(currentTotal)) * 100).toFixed(1) 
        : null;

    const isOverLimit = parseFloat(currentScore) > parseFloat(currentTotal);

    return (
      <View style={styles.markItemContainer}>
        <TextInput
          style={styles.input}
          value={currentAssessmentName}
          onChangeText={setCurrentAssessmentName}
          placeholder="Assessment Name"
        />
        <View style={styles.scoreRow}>
            <View style={styles.scoreInputContainer}>
                <Text style={styles.inputLabel}>Score</Text>
                <TextInput
                    style={[styles.input, styles.scoreInput, isOverLimit && styles.inputError]}
                    value={currentScore}
                    onChangeText={setCurrentScore}
                    placeholder="Score"
                    keyboardType="numeric"
                />
                {isOverLimit && <Text style={styles.errorText}>Exceeds total!</Text>}
            </View>
            <Text style={styles.divider}>/</Text>
            <View style={styles.scoreInputContainer}>
                <Text style={styles.inputLabel}>Total</Text>
                <TextInput
                    style={[styles.input, styles.scoreInput]}
                    value={currentTotal}
                    onChangeText={setCurrentTotal}
                    placeholder="Total"
                    keyboardType="numeric"
                />
            </View>
            {percentage !== null && !isNaN(percentage) && (
                <View style={[styles.percentageBadge, 
                    parseFloat(percentage) >= 80 ? styles.badgeSuccess : 
                    parseFloat(percentage) >= 60 ? styles.badgeWarning : styles.badgeDanger
                ]}>
                    <Text style={[styles.percentageText,
                        parseFloat(percentage) >= 80 ? styles.textSuccess : 
                        parseFloat(percentage) >= 60 ? styles.textWarning : styles.textDanger
                    ]}>{percentage}%</Text>
                </View>
            )}
        </View>
        <TextInput
          style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
          value={currentFeedback}
          onChangeText={setCurrentFeedback}
          placeholder="Teacher Feedback"
          multiline
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onUpdate(item.id, currentScore, currentTotal, currentAssessmentName, currentFeedback)}>
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
  const { user } = useAuth();
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [marksChanged, setMarksChanged] = useState(false);

  // New Mark State
  const [addingNew, setAddingNew] = useState(false);
  const [newMarkName, setNewMarkName] = useState('');
  const [newMarkScore, setNewMarkScore] = useState('');
  const [newMarkTotal, setNewMarkTotal] = useState('100');
  const [newFeedback, setNewFeedback] = useState('');
  const [assessmentType, setAssessmentType] = useState('Test');

  useEffect(() => {
    if (student) {
      fetchMarks();
      setAddingNew(false);
      resetNewMarkForm();
    }
    setMarksChanged(false);
  }, [student]);

  const resetNewMarkForm = () => {
    setNewMarkName('');
    setNewMarkScore('');
    setNewMarkTotal('100');
    setNewFeedback('');
    setAssessmentType('Test');
  };

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
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMarks(data);
    } catch (error) {
      showToast('Failed to fetch marks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMark = async () => {
    if (!newMarkName.trim() || !newMarkScore.trim() || !newMarkTotal.trim()) {
        showToast('Please fill in name, score and total.', 'error');
        return;
    }

    const score = parseFloat(newMarkScore);
    const total = parseFloat(newMarkTotal);
    const percentage = ((score / total) * 100).toFixed(1);
    const formattedMark = `${score}/${total} (${percentage}%)`;

    try {
        const { error } = await supabase
            .from('student_marks')
            .insert({
                student_id: student.users.id,
                teacher_id: user.id,
                class_id: classId,
                assessment_name: `${assessmentType}: ${newMarkName}`,
                mark: formattedMark,
                score: score,
                total_possible: total,
                teacher_feedback: newFeedback
            });

        if (error) throw error;

        showToast('Mark added successfully.', 'success');
        setMarksChanged(true);
        setAddingNew(false);
        resetNewMarkForm();
        fetchMarks();
    } catch (error) {
        console.error(error);
        showToast('Failed to add mark.', 'error');
    }
  };

  const handleUpdateMark = async (markId, newScore, newTotal, newAssessmentName, newFeedback) => {
    const score = parseFloat(newScore);
    const total = parseFloat(newTotal);
    const percentage = ((score / total) * 100).toFixed(1);
    const formattedMark = `${score}/${total} (${percentage}%)`;

    try {
      const { error } = await supabase
        .from('student_marks')
        .update({ 
          mark: formattedMark,
          score: score,
          total_possible: total,
          teacher_id: user.id,
          assessment_name: newAssessmentName,
          teacher_feedback: newFeedback 
        })
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

  const renderHeader = () => {
    const previewPercentage = (newMarkScore && newMarkTotal) 
        ? ((parseFloat(newMarkScore) / parseFloat(newMarkTotal)) * 100).toFixed(1) 
        : null;
    
    const isNewOverLimit = parseFloat(newMarkScore) > parseFloat(newMarkTotal);

    return (
        <View style={styles.headerContainer}>
            {addingNew ? (
                <View style={styles.addForm}>
                    <Text style={styles.formTitle}>Add New Mark</Text>
                    
                    <View style={styles.typeSelector}>
                        {['Test', 'Assignment'].map((type) => (
                            <TouchableOpacity 
                                key={type}
                                style={[styles.typeButton, assessmentType === type && styles.typeButtonActive]}
                                onPress={() => setAssessmentType(type)}
                            >
                                <Text style={[styles.typeText, assessmentType === type && styles.typeTextActive]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TextInput
                        style={styles.input}
                        value={newMarkName}
                        onChangeText={setNewMarkName}
                        placeholder="Assessment Name (e.g. Midterm)"
                    />
                    
                    <View style={styles.scoreRow}>
                        <View style={styles.scoreInputContainer}>
                            <Text style={styles.inputLabel}>Score</Text>
                            <TextInput
                                style={[styles.input, styles.scoreInput, isNewOverLimit && styles.inputError]}
                                value={newMarkScore}
                                onChangeText={setNewMarkScore}
                                placeholder="85"
                                keyboardType="numeric"
                            />
                            {isNewOverLimit && <Text style={styles.errorText}>Exceeds total!</Text>}
                        </View>
                        <Text style={styles.divider}>/</Text>
                        <View style={styles.scoreInputContainer}>
                            <Text style={styles.inputLabel}>Total</Text>
                            <TextInput
                                style={[styles.input, styles.scoreInput]}
                                value={newMarkTotal}
                                onChangeText={setNewMarkTotal}
                                placeholder="100"
                                keyboardType="numeric"
                            />
                        </View>
                        {previewPercentage !== null && !isNaN(previewPercentage) && (
                            <View style={[styles.percentageBadge, 
                                parseFloat(previewPercentage) >= 80 ? styles.badgeSuccess : 
                                parseFloat(previewPercentage) >= 60 ? styles.badgeWarning : styles.badgeDanger
                            ]}>
                                <Text style={[styles.percentageText,
                                    parseFloat(previewPercentage) >= 80 ? styles.textSuccess : 
                                    parseFloat(previewPercentage) >= 60 ? styles.textWarning : styles.textDanger
                                ]}>{previewPercentage}%</Text>
                            </View>
                        )}
                    </View>

                    <TextInput
                        style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                        value={newFeedback}
                        onChangeText={setNewFeedback}
                        placeholder="Optional Feedback"
                        multiline
                    />
                    
                    <View style={styles.formButtons}>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setAddingNew(false)}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleAddMark}>
                            <FontAwesomeIcon icon={faPlus} color="white" size={14} style={{ marginRight: 5 }} />
                            <Text style={styles.saveButtonText}>Add Mark</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity style={styles.addButton} onPress={() => setAddingNew(true)}>
                    <FontAwesomeIcon icon={faPlus} color="#007AFF" style={{ marginRight: 10 }} />
                    <Text style={styles.addButtonText}>Add New Assessment</Text>
                </TouchableOpacity>
            )}
            <Text style={styles.sectionTitle}>Recorded Marks</Text>
        </View>
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
              ListHeaderComponent={renderHeader}
              renderItem={({item}) => <MarkItem item={item} onUpdate={handleUpdateMark} onDelete={handleDeleteMark} />}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={<Text style={styles.emptyText}>No marks found for this student.</Text>}
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
        width: '95%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        maxHeight: '90%',
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      },
      headerContainer: {
        marginBottom: 10,
      },
      title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
      },
      sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 20,
        marginBottom: 10,
      },
      addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderWidth: 2,
        borderColor: '#007AFF',
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: '#f0f7ff',
      },
      addButtonText: {
        color: '#007AFF',
        fontWeight: 'bold',
      },
      addForm: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e9ecef',
      },
      formTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
      },
      typeSelector: {
        flexDirection: 'row',
        marginBottom: 15,
        gap: 10,
      },
      typeButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
        backgroundColor: 'white',
      },
      typeButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
      },
      typeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
      },
      typeTextActive: {
        color: 'white',
      },
      scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
      },
      scoreInputContainer: {
        flex: 1,
      },
      inputLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#999',
        marginBottom: 4,
        textTransform: 'uppercase',
      },
      scoreInput: {
        textAlign: 'center',
        marginBottom: 0,
      },
      divider: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ddd',
        paddingTop: 15,
      },
      percentageBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
        marginTop: 15,
      },
      badgeSuccess: {
        backgroundColor: '#e6f4ea',
      },
      badgeWarning: {
        backgroundColor: '#fff7e6',
      },
      badgeDanger: {
        backgroundColor: '#fce8e6',
      },
      percentageText: {
        fontSize: 12,
        fontWeight: 'bold',
      },
      textSuccess: {
        color: '#1e7e34',
      },
      textWarning: {
        color: '#d39e00',
      },
      textDanger: {
        color: '#c82333',
      },
      formButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 5,
      },
      cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
      },
      cancelButtonText: {
        color: '#666',
        fontWeight: 'bold',
      },
      saveButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
      },
      saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
      },
      markItemContainer: {
        marginBottom: 15,
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
      },
      input: {
        borderWidth: 1,
        borderColor: '#e1e1e1',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        width: '100%',
        backgroundColor: 'white',
        fontSize: 14,
      },
      inputError: {
        borderColor: '#FF3B30',
        backgroundColor: '#FFF5F5',
        color: '#FF3B30'
      },
      errorText: {
        color: '#FF3B30',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: -8,
        marginBottom: 8,
        textAlign: 'center'
      },
      buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 5,
      },
      actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 8,
        backgroundColor: '#f0f7ff',
      },
      actionButtonText: {
        marginLeft: 5,
        color: '#007AFF',
        fontWeight: 'bold',
        fontSize: 12,
      },
      deleteButton: {
        backgroundColor: '#fff5f5',
      },
      deleteButtonText: {
        color: '#dc3545',
      },
      emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 30,
        fontStyle: 'italic',
      },
});

export default ManageMarksModal;
