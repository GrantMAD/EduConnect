import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';
import { supabase } from '../lib/supabase';
import { getGradesBySchoolType } from '../utils/gradeUtils';
import { DEFAULT_PRIMARY_MIN_GRADE } from '../constants/GradeConstants';

const CreateManagedStudentModal = ({
    visible,
    onClose,
    onRefresh,
    user,
    profile,
    theme
}) => {
    const [fullName, setFullName] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getAvailableGrades = () => {
        const schoolType = profile?.school_type || 'Primary School';
        const minGrade = profile?.student_account_min_grade || DEFAULT_PRIMARY_MIN_GRADE;
        const allPossibleGrades = getGradesBySchoolType(schoolType);

        if (minGrade === 'None') return [];

        const minIndex = allPossibleGrades.indexOf(minGrade);
        if (minIndex === -1) return allPossibleGrades.slice(0, 3);

        return allPossibleGrades.slice(0, minIndex);
    };

    const grades = getAvailableGrades();
    const minGradeText = profile?.student_account_min_grade || DEFAULT_PRIMARY_MIN_GRADE;

    const handleSubmit = async () => {
        if (!fullName || !selectedGrade || !profile?.school_id) return;

        setIsSubmitting(true);
        try {
            // 1. Create shadow student
            const { data: newStudent, error: createError } = await supabase
                .from('users')
                .insert([{
                    full_name: fullName,
                    grade: selectedGrade,
                    role: 'student',
                    school_id: profile.school_id,
                    is_managed: true,
                    managed_by: user.id,
                    email: `shadow_${Date.now()}@managed.local`
                }])
                .select()
                .single();

            if (createError) throw createError;

            // 2. Auto-link parent and child
            const { error: linkError } = await supabase
                .from('parent_child_relationships')
                .insert([{
                    parent_id: user.id,
                    child_id: newStudent.id
                }]);

            if (linkError) throw linkError;

            onRefresh();
            handleClose();
        } catch (error) {
            console.error('Error creating managed student:', error);
            alert('Failed to create child profile.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFullName('');
        setSelectedGrade('');
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={styles.centeredView}>
                <View style={[styles.modalView, { backgroundColor: theme.colors.surface }]}>
                    <LinearGradient
                        colors={['#f97316', '#db2777']}
                        style={styles.header}
                    >
                        <View style={styles.iconBox}>
                            <FontAwesome5 name="child" size={24} color="#fff" />
                        </View>
                        <Text style={styles.headerTitle}>Create Child Profile</Text>
                        <Text style={styles.headerSubtitle}>MANAGED STUDENT ACCOUNT</Text>

                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={handleClose}
                            disabled={isSubmitting}
                        >
                            <FontAwesome5 name="times" size={20} color="#ffffff80" />
                        </TouchableOpacity>
                    </LinearGradient>

                    <ScrollView style={styles.body}>
                        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                            {minGradeText === 'None' ? (
                                <Text>Create a profile here to track your child's academic progress.</Text>
                            ) : (
                                <Text>Students below <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>{minGradeText}</Text> cannot have independent logins. Create a profile here to track their progress.</Text>
                            )}
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>FULL NAME</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
                                placeholder="Child's Full Name"
                                placeholderTextColor={theme.colors.placeholder}
                                value={fullName}
                                onChangeText={setFullName}
                                disabled={isSubmitting}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>CURRENT GRADE</Text>
                            <View style={styles.gradesGrid}>
                                {grades.map(g => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.gradeBtn,
                                            { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
                                            selectedGrade === g && { backgroundColor: '#f97316', borderColor: '#f97316' }
                                        ]}
                                        onPress={() => setSelectedGrade(g)}
                                        disabled={isSubmitting}
                                    >
                                        <Text style={[
                                            styles.gradeText,
                                            { color: theme.colors.text },
                                            selectedGrade === g && { color: '#fff' }
                                        ]}>{g}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                { backgroundColor: '#f97316' },
                                (!fullName || !selectedGrade) && { opacity: 0.5 }
                            ]}
                            onPress={handleSubmit}
                            disabled={!fullName || !selectedGrade || isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Create Profile</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={handleClose}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalView: {
        width: '100%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        maxHeight: '90%',
    },
    header: {
        padding: 32,
        alignItems: 'center',
    },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginTop: 4,
    },
    closeBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 8,
    },
    body: {
        padding: 24,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 8,
    },
    input: {
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 15,
        fontWeight: '600',
    },
    gradesGrid: {
        flexDirection: 'row',
        gap: 8,
    },
    gradeBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    gradeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    footer: {
        padding: 24,
        paddingTop: 0,
    },
    submitBtn: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    cancelBtn: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '700',
    },
});

export default CreateManagedStudentModal;
