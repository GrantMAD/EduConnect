import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useToast, useToastState } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTrash, faSave, faTimes, faPlus, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from './Toast';

const MarkItem = ({ item, onUpdate, onDelete }) => {
    const { theme } = useTheme();
    const [currentAssessmentName, setCurrentAssessmentName] = useState(item.assessment_name);
    const [currentScore, setCurrentScore] = useState(item.score?.toString() || '');
    const [currentTotal, setCurrentTotal] = useState(item.total_possible?.toString() || '100');
    const [currentFeedback, setCurrentFeedback] = useState(item.teacher_feedback || '');
  
    const percentage = (currentScore && currentTotal) 
        ? ((parseFloat(currentScore) / parseFloat(currentTotal)) * 100).toFixed(1) 
        : null;

    const isOverLimit = parseFloat(currentScore) > parseFloat(currentTotal);

    return (
      <View style={[styles.markItemContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
        <View style={styles.inputSection}>
            <Text style={[styles.labelSmall, { color: '#94a3b8' }]}>ASSESSMENT NAME</Text>
            <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                value={currentAssessmentName}
                onChangeText={setCurrentAssessmentName}
                placeholder="e.g. Term 1 Test"
                placeholderTextColor={theme.colors.placeholder}
            />
        </View>

        <View style={styles.scoreRow}>
            <View style={styles.scoreInputContainer}>
                <Text style={[styles.labelSmall, { color: '#94a3b8' }]}>SCORE</Text>
                <TextInput
                    style={[styles.input, styles.scoreInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.text }, isOverLimit && styles.inputError]}
                    value={currentScore}
                    onChangeText={setCurrentScore}
                    placeholder="85"
                    placeholderTextColor={theme.colors.placeholder}
                    keyboardType="numeric"
                />
            </View>
            <Text style={[styles.divider, { color: theme.colors.cardBorder }]}>/</Text>
            <View style={styles.scoreInputContainer}>
                <Text style={[styles.labelSmall, { color: '#94a3b8' }]}>TOTAL</Text>
                <TextInput
                    style={[styles.input, styles.scoreInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                    value={currentTotal}
                    onChangeText={setCurrentTotal}
                    placeholder="100"
                    placeholderTextColor={theme.colors.placeholder}
                    keyboardType="numeric"
                />
            </View>
            {percentage !== null && !isNaN(percentage) && (
                <View style={[styles.percentageBadge, { backgroundColor: theme.colors.primary + '10' }]}>
                    <Text style={[styles.percentageText, { color: theme.colors.primary }]}>
                        {percentage}%
                    </Text>
                </View>
            )}
        </View>

        <View style={styles.inputSection}>
            <Text style={[styles.labelSmall, { color: '#94a3b8' }]}>OBSERVATIONS</Text>
            <TextInput
                style={[styles.textArea, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                value={currentFeedback}
                onChangeText={setCurrentFeedback}
                placeholder="Add teacher feedback..."
                placeholderTextColor={theme.colors.placeholder}
                multiline
            />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: theme.colors.primary }]} onPress={() => onUpdate(item.id, currentScore, currentTotal, currentAssessmentName, currentFeedback)}>
            <Text style={styles.actionButtonText}>SAVE UPDATES</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} style={[styles.actionButton, { backgroundColor: '#ef4444' + '15' }]} onPress={() => onDelete(item.id)}>
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>REMOVE</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

const ManageMarksModal = ({ visible, onClose, student, classId }) => {
  const { showToast } = useToast();
  const { toast, hideToast } = useToastState();
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
      showToast('Error loading marks.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMark = async () => {
    if (!newMarkName.trim() || !newMarkScore.trim() || !newMarkTotal.trim()) {
        showToast('Required fields missing.', 'error');
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

        showToast('Entry added.', 'success');
        setMarksChanged(true);
        setAddingNew(false);
        resetNewMarkForm();
        fetchMarks();
    } catch (error) {
        showToast('Action failed.', 'error');
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
      'Delete Entry',
      'This record will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('student_marks').delete().eq('id', markId);
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
    
    return (
        <View style={styles.headerContainer}>
            {addingNew ? (
                <View style={[styles.addForm, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <Text style={[styles.formTitle, { color: theme.colors.text }]}>New Entry</Text>
                    
                    <View style={styles.typeSelector}>
                        {['Test', 'Assignment'].map((type) => (
                            <TouchableOpacity 
                                activeOpacity={0.8}
                                key={type}
                                style={[styles.typeButton, { borderColor: theme.colors.cardBorder }, assessmentType === type && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}
                                onPress={() => setAssessmentType(type)}
                            >
                                <Text style={[styles.typeText, assessmentType === type ? { color: '#fff' } : { color: theme.colors.placeholder }]}>{type.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={[styles.labelSmall, { color: '#94a3b8' }]}>ASSESSMENT NAME</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                            value={newMarkName}
                            onChangeText={setNewMarkName}
                            placeholder="e.g. Quiz 1"
                            placeholderTextColor={theme.colors.placeholder}
                        />
                    </View>
                    
                    <View style={styles.scoreRow}>
                        <View style={styles.scoreInputContainer}>
                            <Text style={[styles.labelSmall, { color: '#94a3b8' }]}>SCORE</Text>
                            <TextInput
                                style={[styles.input, styles.scoreInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                                value={newMarkScore}
                                onChangeText={setNewMarkScore}
                                placeholder="85"
                                placeholderTextColor={theme.colors.placeholder}
                                keyboardType="numeric"
                            />
                        </View>
                        <Text style={[styles.divider, { color: theme.colors.cardBorder }]}>/</Text>
                        <View style={styles.scoreInputContainer}>
                            <Text style={[styles.labelSmall, { color: '#94a3b8' }]}>TOTAL</Text>
                            <TextInput
                                style={[styles.input, styles.scoreInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                                value={newMarkTotal}
                                onChangeText={setNewMarkTotal}
                                placeholder="100"
                                placeholderTextColor={theme.colors.placeholder}
                                keyboardType="numeric"
                            />
                        </View>
                        {previewPercentage !== null && !isNaN(previewPercentage) && (
                            <View style={[styles.percentageBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                                <Text style={[styles.percentageText, { color: theme.colors.primary }]}>{previewPercentage}%</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.inputSection}>
                        <Text style={[styles.labelSmall, { color: '#94a3b8' }]}>TEACHER NOTES</Text>
                        <TextInput
                            style={[styles.textArea, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                            value={newFeedback}
                            onChangeText={setNewFeedback}
                            placeholder="Observations or notes..."
                            placeholderTextColor={theme.colors.placeholder}
                            multiline
                        />
                    </View>
                    
                    <View style={styles.formButtons}>
                        <TouchableOpacity activeOpacity={0.7} style={styles.cancelButton} onPress={() => setAddingNew(false)}>
                            <Text style={[styles.cancelButtonText, { color: theme.colors.placeholder }]}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.8} style={[styles.saveButton, { backgroundColor: theme.colors.primary }]} onPress={handleAddMark}>
                            <Text style={styles.saveButtonText}>ADD RECORD</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity activeOpacity={0.8} style={[styles.addButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '05' }]} onPress={() => setAddingNew(true)}>
                    <FontAwesomeIcon icon={faPlus} color={theme.colors.primary} size={14} style={{ marginRight: 10 }} />
                    <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>NEW ASSESSMENT RECORD</Text>
                </TouchableOpacity>
            )}
            <Text style={[styles.sectionTitle, { color: '#94a3b8' }]}>ACADEMIC HISTORY</Text>
        </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
            <View style={styles.headerTitleRow}>
                <View style={[styles.iconBoxHeader, { backgroundColor: theme.colors.primary + '15' }]}>
                    <FontAwesomeIcon icon={faPencilAlt} size={18} color={theme.colors.primary} />
                </View>
                <View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Student Marks</Text>
                    <Text style={[styles.modalSub, { color: theme.colors.placeholder }]}>{student?.users.full_name.toUpperCase()}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={[styles.closeBtn, { backgroundColor: theme.colors.background }]}>
              <FontAwesomeIcon icon={faTimes} size={16} color={theme.colors.placeholder} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.center}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={marks}
              ListHeaderComponent={renderHeader}
              renderItem={({item}) => <MarkItem item={item} onUpdate={handleUpdateMark} onDelete={handleDeleteMark} />}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={<Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No records found.</Text>}
            />
          )}
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
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
      },
      modalContent: {
        width: '100%',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 24,
        paddingTop: 24,
        maxHeight: '90%',
      },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
        marginBottom: 20,
      },
      headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
      iconBoxHeader: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
      modalTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
      modalSub: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
      closeBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

      headerContainer: { marginBottom: 10 },
      sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 32, marginBottom: 16 },
      
      addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 20,
      },
      addButtonText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
      
      addForm: { padding: 20, borderRadius: 24 },
      formTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3, marginBottom: 20 },
      
      typeSelector: { flexDirection: 'row', marginBottom: 20, gap: 10 },
      typeButton: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
      typeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
      
      formButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
      cancelButton: { paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
      cancelButtonText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
      saveButton: { height: 48, paddingHorizontal: 24, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
      saveButtonText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

      markItemContainer: { padding: 20, borderRadius: 24, marginBottom: 12 },
      inputSection: { gap: 8, marginBottom: 16 },
      labelSmall: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
      input: { height: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 14, fontWeight: '700' },
      textArea: { height: 80, borderRadius: 16, borderWidth: 1, padding: 16, fontSize: 14, fontWeight: '600', textAlignVertical: 'top' },
      
      scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
      scoreInputContainer: { flex: 1 },
      scoreInput: { textAlign: 'center' },
      divider: { fontSize: 24, fontWeight: '300', marginTop: 12 },
      percentageBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 16, alignSelf: 'flex-end' },
      percentageText: { fontSize: 13, fontWeight: '900' },
      
      buttonContainer: { flexDirection: 'row', gap: 10, marginTop: 8 },
      actionButton: { flex: 1, height: 48, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
      actionButtonText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
      
      center: { padding: 40, alignItems: 'center' },
      emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14, fontWeight: '700' },
});

export default ManageMarksModal;