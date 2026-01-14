import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faSpinner, faBug, faLightbulb, faWrench, faQuestion, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createSystemReport } from '../services/systemReportService';
import * as Device from 'expo-device';

const REPORT_TYPES = [
    { id: 'bug', label: 'Bug Report', icon: faBug, color: '#ef4444' },
    { id: 'feature_request', label: 'Feature Request', icon: faLightbulb, color: '#f59e0b' },
    { id: 'improvement', label: 'Improvement', icon: faWrench, color: '#3b82f6' },
    { id: 'other', label: 'Other', icon: faQuestion, color: '#64748b' }
];

const PRIORITIES = [
    { id: 'low', label: 'Low', color: '#10b981' },
    { id: 'medium', label: 'Medium', color: '#f59e0b' },
    { id: 'high', label: 'High', color: '#ef4444' },
    { id: 'critical', label: 'Critical', color: '#7f1d1d' }
];

const ReportIssueModal = ({ visible, onClose }) => {
    const { theme } = useTheme();
    const { user, profile } = useAuth();
    const { showToast } = useToast();
    
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('bug');
    const [priority, setPriority] = useState('medium');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleClose = () => {
        if (isSubmitting) return;
        setTitle('');
        setDescription('');
        setType('bug');
        setPriority('medium');
        onClose();
    };

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert('Missing Info', 'Please provide a title and description.');
            return;
        }

        setIsSubmitting(true);
        try {
            const reportData = {
                reporter_id: user?.id,
                school_id: profile?.school_id,
                title: title.trim(),
                description: description.trim(),
                type,
                priority,
                page_url: 'Mobile App', // Placeholder since it's an app
                browser_info: {
                    platform: Platform.OS,
                    version: Platform.Version,
                    model: Device.modelName,
                    brand: Device.brand,
                    osBuildId: Device.osBuildId
                }
            };

            await createSystemReport(reportData);
            showToast('Report submitted successfully. Thank you!', 'success');
            handleClose();
        } catch (error) {
            console.error('Error submitting report:', error);
            showToast('Failed to submit report. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContainer, { backgroundColor: theme.colors.card }]}>
                    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>Report an Issue</Text>
                        <TouchableOpacity onPress={handleClose} disabled={isSubmitting}>
                            <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        {/* Type Selection */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeContainer}>
                            {REPORT_TYPES.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    style={[
                                        styles.typeButton,
                                        { 
                                            backgroundColor: type === t.id ? t.color + '20' : theme.colors.background,
                                            borderColor: type === t.id ? t.color : theme.colors.border
                                        }
                                    ]}
                                    onPress={() => setType(t.id)}
                                >
                                    <FontAwesomeIcon icon={t.icon} size={14} color={type === t.id ? t.color : theme.colors.placeholder} />
                                    <Text style={[
                                        styles.typeText, 
                                        { color: type === t.id ? t.color : theme.colors.placeholder }
                                    ]}>{t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Title Input */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Title <Text style={{color: '#ef4444'}}>*</Text></Text>
                        <TextInput
                            style={[styles.input, { 
                                backgroundColor: theme.colors.background, 
                                color: theme.colors.text,
                                borderColor: theme.colors.border
                            }]}
                            placeholder="Brief summary of the issue"
                            placeholderTextColor={theme.colors.placeholder}
                            value={title}
                            onChangeText={setTitle}
                        />

                        {/* Priority Selection */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Priority</Text>
                        <View style={styles.priorityContainer}>
                            {PRIORITIES.map((p) => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[
                                        styles.priorityButton,
                                        { 
                                            backgroundColor: priority === p.id ? p.color : theme.colors.background,
                                            borderColor: priority === p.id ? p.color : theme.colors.border
                                        }
                                    ]}
                                    onPress={() => setPriority(p.id)}
                                >
                                    <Text style={[
                                        styles.priorityText, 
                                        { color: priority === p.id ? '#fff' : theme.colors.placeholder }
                                    ]}>{p.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Description Input */}
                        <Text style={[styles.label, { color: theme.colors.text }]}>Description <Text style={{color: '#ef4444'}}>*</Text></Text>
                        <TextInput
                            style={[styles.textArea, { 
                                backgroundColor: theme.colors.background, 
                                color: theme.colors.text,
                                borderColor: theme.colors.border
                            }]}
                            placeholder="Please provide details about what happened..."
                            placeholderTextColor={theme.colors.placeholder}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={5}
                            textAlignVertical="top"
                        />
                        
                        <View style={[styles.infoBox, { backgroundColor: theme.colors.background }]}>
                            <Text style={[styles.infoText, { color: theme.colors.placeholder }]}>
                                We'll automatically include your device info ({Device.modelName}, {Platform.OS} {Platform.Version}) to help us debug the issue.
                            </Text>
                        </View>
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
                        <TouchableOpacity 
                            style={[styles.cancelButton, { borderColor: theme.colors.border }]} 
                            onPress={handleClose}
                            disabled={isSubmitting}
                        >
                            <Text style={[styles.cancelText, { color: theme.colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.submitButton, { backgroundColor: theme.colors.primary, opacity: isSubmitting ? 0.7 : 1 }]} 
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.submitText}>Submit Report</Text>
                            )}
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
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '85%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 12,
    },
    typeContainer: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    typeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        height: 120,
    },
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    priorityText: {
        fontSize: 12,
        fontWeight: '600',
    },
    infoBox: {
        padding: 12,
        borderRadius: 8,
        marginTop: 20,
        marginBottom: 40,
    },
    infoText: {
        fontSize: 12,
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelText: {
        fontWeight: '600',
    },
    submitButton: {
        flex: 2,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default ReportIssueModal;
