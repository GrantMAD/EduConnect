import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import LinearGradient from 'react-native-linear-gradient';

const AssignGradeModal = ({ 
    visible, 
    onClose, 
    onConfirm, 
    requesterName = "the student",
    existingShadow = null,
    isLoading = false,
    theme
}) => {
    const [selectedGrade, setSelectedGrade] = useState('');
    const grades = [
        'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 
        'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 
        'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
    ];

    const isRestricted = selectedGrade && ['Grade 1', 'Grade 2', 'Grade 3'].includes(selectedGrade);

    const handleConfirm = () => {
        if (!selectedGrade) return;
        onConfirm(selectedGrade, isRestricted, existingShadow?.id);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={[styles.modalView, { backgroundColor: theme.colors.surface }]}>
                    <LinearGradient
                        colors={['#4f46e5', '#4338ca']}
                        style={styles.header}
                    >
                        <View style={styles.iconBox}>
                            <FontAwesome5 name="graduation-cap" size={24} color="#fff" />
                        </View>
                        <Text style={styles.headerTitle}>Assign Grade Level</Text>
                        <Text style={styles.headerSubtitle}>ACADEMIC PLACEMENT</Text>
                        
                        <TouchableOpacity 
                            style={styles.closeBtn} 
                            onPress={onClose}
                            disabled={isLoading}
                        >
                            <FontAwesome5 name="times" size={20} color="#ffffff80" />
                        </TouchableOpacity>
                    </LinearGradient>

                    <ScrollView style={styles.body}>
                        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                            You are about to accept <Text style={{ fontWeight: 'bold', color: theme.colors.text }}>{requesterName}</Text> into the school. Please select their current grade level.
                        </Text>

                        <Text style={styles.label}>SELECT GRADE</Text>
                        <View style={styles.gradesGrid}>
                            {grades.map(g => (
                                <TouchableOpacity
                                    key={g}
                                    style={[
                                        styles.gradeBtn,
                                        { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
                                        selectedGrade === g && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                    onPress={() => setSelectedGrade(g)}
                                    disabled={isLoading}
                                >
                                    <Text style={[
                                        styles.gradeText,
                                        { color: theme.colors.text },
                                        selectedGrade === g && { color: '#fff' }
                                    ]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {isRestricted ? (
                            <View style={[styles.alertBox, styles.errorAlert]}>
                                <FontAwesome5 name="exclamation-triangle" size={16} color="#e11d48" />
                                <View style={styles.alertContent}>
                                    <Text style={styles.alertTitle}>RESTRICTED SIGNUP</Text>
                                    <Text style={styles.alertText}>
                                        Students below Grade 4 cannot have independent accounts. Please decline and use a managed profile.
                                    </Text>
                                </View>
                            </View>
                        ) : selectedGrade && existingShadow ? (
                            <View style={[styles.alertBox, styles.infoAlert]}>
                                <FontAwesome5 name="sync" size={16} color="#007AFF" />
                                <View style={styles.alertContent}>
                                    <Text style={styles.alertTitle}>SHADOW PROFILE FOUND</Text>
                                    <Text style={styles.alertText}>
                                        A managed profile exists for this student. Accepting will merge their history.
                                    </Text>
                                </View>
                            </View>
                        ) : selectedGrade ? (
                            <View style={[styles.alertBox, styles.successAlert]}>
                                <FontAwesome5 name="check-circle" size={16} color="#10b981" />
                                <View style={styles.alertContent}>
                                    <Text style={styles.alertTitle}>GRADE VERIFIED</Text>
                                    <Text style={styles.alertText}>
                                        This student will be assigned to {selectedGrade}.
                                    </Text>
                                </View>
                            </View>
                        ) : null}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[
                                styles.confirmBtn,
                                { backgroundColor: theme.colors.primary },
                                isRestricted && { backgroundColor: theme.colors.cardBorder, opacity: 0.5 }
                            ]}
                            onPress={handleConfirm}
                            disabled={!selectedGrade || isRestricted || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.confirmBtnText}>
                                    {existingShadow ? 'Merge & Graduate' : 'Confirm Placement'}
                                </Text>
                            )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.cancelBtn}
                            onPress={onClose}
                            disabled={isLoading}
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
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 1,
        marginBottom: 12,
    },
    gradesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    gradeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: '30%',
        alignItems: 'center',
    },
    gradeText: {
        fontSize: 13,
        fontWeight: '700',
    },
    alertBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 24,
        gap: 12,
    },
    errorAlert: {
        backgroundColor: '#fff1f2',
    },
    infoAlert: {
        backgroundColor: '#eff6ff',
    },
    successAlert: {
        backgroundColor: '#ecfdf5',
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 4,
    },
    alertText: {
        fontSize: 12,
        lineHeight: 16,
    },
    footer: {
        padding: 24,
        paddingTop: 0,
    },
    confirmBtn: {
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmBtnText: {
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

export default AssignGradeModal;
