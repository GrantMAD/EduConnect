import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import Modal from 'react-native-modal';
import { Picker } from '@react-native-picker/picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faTimes,
    faSave,
    faTrash,
    faCalendarAlt,
    faBookOpen,
    faBullseye,
    faLink,
    faInfoCircle,
    faPlus,
    faPlusCircle,
    faFileAlt
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { saveLessonPlan, unlinkLibraryResource } from '../services/lessonService';
import ResourcePickerModal from './ResourcePickerModal';

export default function LessonPlanModal({ isOpen, onClose, classId, topics, plan, onRefresh }) {
    const { theme } = useTheme();
    const { showToast } = useToast();
    
    const [formData, setFormData] = useState({
        title: '',
        topic_id: '',
        scheduled_date: new Date().toISOString().split('T')[0],
        content: '',
        objectives: [''],
        resources: [],
        status: 'draft',
        class_id: classId
    });
    const [libraryResources, setLibraryResources] = useState([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [newResource, setNewResource] = useState({ name: '', url: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (plan) {
                setFormData(prev => {
                    if (prev.id === plan.id) return prev;
                    return {
                        ...plan,
                        scheduled_date: plan.scheduled_date ? new Date(plan.scheduled_date).toISOString().split('T')[0] : '',
                        objectives: plan.objectives?.length > 0 ? plan.objectives : [''],
                        resources: plan.resources || []
                    };
                });
                setLibraryResources(plan.library_resources?.map(lr => lr.resource) || []);
            } else {
                setFormData({
                    title: '',
                    topic_id: '',
                    scheduled_date: new Date().toISOString().split('T')[0],
                    content: '',
                    objectives: [''],
                    resources: [],
                    status: 'draft',
                    class_id: classId
                });
                setLibraryResources([]);
            }
        }
    }, [isOpen, plan, classId]);

    const handleObjectiveChange = (index, value) => {
        const newObjectives = [...formData.objectives];
        newObjectives[index] = value;
        setFormData({ ...formData, objectives: newObjectives });
    };

    const addObjective = () => {
        setFormData({ ...formData, objectives: [...formData.objectives, ''] });
    };

    const removeObjective = (index) => {
        setFormData({
            ...formData,
            objectives: formData.objectives.filter((_, i) => i !== index)
        });
    };

    const addResource = () => {
        if (!newResource.name || !newResource.url) {
            showToast('Please provide both name and URL for the resource', 'warning');
            return;
        }
        setFormData({
            ...formData,
            resources: [...formData.resources, newResource]
        });
        setNewResource({ name: '', url: '' });
    };

    const removeResource = (index) => {
        setFormData({
            ...formData,
            resources: formData.resources.filter((_, i) => i !== index)
        });
    };

    const handleUnlinkLibraryResource = async (resourceId) => {
        if (!plan?.id) return;
        try {
            await unlinkLibraryResource(resourceId, classId, plan.id);
            setLibraryResources(prev => prev.filter(r => r.id !== resourceId));
            showToast('Library resource unlinked', 'success');
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error unlinking resource:', error);
            showToast('Failed to unlink resource', 'error');
        }
    };

    const handleSave = async () => {
        if (!formData.title) {
            showToast('Lesson title is required', 'warning');
            return;
        }

        setSaving(true);
        try {
            const cleanedData = {
                ...formData,
                objectives: formData.objectives.filter(obj => obj.trim() !== '')
            };
            await saveLessonPlan(cleanedData);
            showToast(`Lesson plan ${plan ? 'updated' : 'created'} successfully`, 'success');
            if (onRefresh) onRefresh();
            onClose();
        } catch (error) {
            console.error('Error saving lesson plan:', error);
            showToast('Failed to save lesson plan', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isVisible={isOpen}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            style={styles.modal}
            propagateSwipe
        >
            <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.swipeIndicator} />
                
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faBookOpen} size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>
                            {plan ? 'Edit Lesson' : 'New Lesson'}
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Define teaching goals.</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={styles.scroll} 
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.formSection}>
                        <Text style={styles.label}>LESSON TITLE</Text>
                        <TextInput
                            value={formData.title}
                            onChangeText={(t) => setFormData({ ...formData, title: t })}
                            placeholder="Enter title..."
                            placeholderTextColor={theme.colors.placeholder}
                            style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.formSection, { flex: 1 }]}>
                            <Text style={styles.label}>UNIT / TOPIC</Text>
                            <View style={[styles.pickerWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                <Picker
                                    selectedValue={formData.topic_id}
                                    onValueChange={(itemValue) => setFormData({ ...formData, topic_id: itemValue })}
                                    style={{ color: theme.colors.text }}
                                    dropdownIconColor={theme.colors.placeholder}
                                >
                                    <Picker.Item label="No Topic" value="" />
                                    {topics.map((t) => (
                                        <Picker.Item key={t.id} label={t.name} value={t.id} />
                                    ))}
                                </Picker>
                            </View>
                        </View>
                        <View style={[styles.formSection, { flex: 1 }]}>
                            <Text style={styles.label}>SCHEDULE DATE</Text>
                            <TextInput
                                value={formData.scheduled_date}
                                onChangeText={(t) => setFormData({ ...formData, scheduled_date: t })}
                                placeholder="YYYY-MM-DD"
                                style={[styles.input, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}
                            />
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>OVERVIEW</Text>
                        <TextInput
                            value={formData.content}
                            onChangeText={(t) => setFormData({ ...formData, content: t })}
                            placeholder="Detailed notes..."
                            placeholderTextColor={theme.colors.placeholder}
                            multiline
                            style={[styles.textArea, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}
                        />
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.label}>STATUS</Text>
                        <View style={styles.statusRow}>
                            {['draft', 'published', 'completed'].map(s => (
                                <TouchableOpacity
                                    key={s}
                                    onPress={() => setFormData({ ...formData, status: s })}
                                    style={[
                                        styles.statusBtn,
                                        { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder },
                                        formData.status === s && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ]}
                                >
                                    <Text style={[styles.statusText, { color: theme.colors.placeholder }, formData.status === s && { color: '#fff' }]}>
                                        {s.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.label}>OBJECTIVES</Text>
                            <TouchableOpacity onPress={addObjective}>
                                <Text style={{ color: theme.colors.primary, fontSize: 11, fontWeight: '900' }}>+ ADD</Text>
                            </TouchableOpacity>
                        </View>
                        {formData.objectives.map((obj, i) => (
                            <View key={i} style={styles.objectiveRow}>
                                <TextInput
                                    value={obj}
                                    onChangeText={(t) => handleObjectiveChange(i, t)}
                                    placeholder={`Objective ${i + 1}`}
                                    placeholderTextColor={theme.colors.placeholder}
                                    style={[styles.input, { flex: 1, color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}
                                />
                                {formData.objectives.length > 1 && (
                                    <TouchableOpacity onPress={() => removeObjective(i)} style={styles.removeBtn}>
                                        <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>

                    {/* Library Materials Section */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.labelWithIcon}>
                                <FontAwesomeIcon icon={faFileAlt} size={10} color="#6366f1" style={{ marginRight: 6 }} />
                                <Text style={styles.label}>LIBRARY MATERIALS</Text>
                            </View>
                            <TouchableOpacity onPress={() => {
                                if (!plan?.id) {
                                    showToast('Please save lesson first', 'info');
                                    return;
                                }
                                setIsPickerOpen(true);
                            }}>
                                <Text style={{ color: '#6366f1', fontSize: 11, fontWeight: '900' }}>+ LINK FROM LIBRARY</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {libraryResources.map((res) => (
                            <View key={res.id} style={[styles.libraryItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}>
                                <FontAwesomeIcon icon={faFileAlt} size={14} color="#6366f1" />
                                <Text style={[styles.libraryItemText, { color: theme.colors.text }]} numberOfLines={1}>{res.title}</Text>
                                <TouchableOpacity onPress={() => handleUnlinkLibraryResource(res.id)} style={styles.removeBtn}>
                                    <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {libraryResources.length === 0 && (
                            <Text style={styles.emptySmallText}>No library items linked yet.</Text>
                        )}
                    </View>

                    {/* External Links Section */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.labelWithIcon}>
                                <FontAwesomeIcon icon={faLink} size={10} color="#10b981" style={{ marginRight: 6 }} />
                                <Text style={styles.label}>EXTERNAL LINKS</Text>
                            </View>
                        </View>
                        
                        <View style={[styles.linkInputContainer, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}>
                            <TextInput
                                value={newResource.name}
                                onChangeText={(t) => setNewResource({ ...newResource, name: t })}
                                placeholder="Link Name (e.g. Video)"
                                placeholderTextColor={theme.colors.placeholder}
                                style={[styles.linkInput, { color: theme.colors.text, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder }]}
                            />
                            <View style={styles.linkRow}>
                                <TextInput
                                    value={newResource.url}
                                    onChangeText={(t) => setNewResource({ ...newResource, url: t })}
                                    placeholder="https://..."
                                    placeholderTextColor={theme.colors.placeholder}
                                    style={[styles.linkInput, { color: theme.colors.text, flex: 1 }]}
                                />
                                <TouchableOpacity onPress={addResource} style={[styles.addLinkBtn, { backgroundColor: theme.colors.primary }]}>
                                    <Text style={styles.addLinkBtnText}>ADD</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {formData.resources.map((res, i) => (
                            <View key={i} style={[styles.libraryItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}>
                                <FontAwesomeIcon icon={faLink} size={14} color="#10b981" />
                                <Text style={[styles.libraryItemText, { color: theme.colors.text }]} numberOfLines={1}>{res.name}</Text>
                                <TouchableOpacity onPress={() => removeResource(i)} style={styles.removeBtn}>
                                    <FontAwesomeIcon icon={faTrash} size={14} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '20' }]}>
                        <FontAwesomeIcon icon={faInfoCircle} size={14} color={theme.colors.primary} />
                        <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                            Drafts are only visible to teachers. Published lessons are visible to students and parents.
                        </Text>
                    </View>
                    
                    <View style={{ height: 40 }} />
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: theme.colors.cardBorder }]}>
                    <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                        <Text style={[styles.cancelText, { color: theme.colors.placeholder }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} size={14} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.saveText}>Save Lesson</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <ResourcePickerModal
                    isOpen={isPickerOpen}
                    onClose={() => setIsPickerOpen(false)}
                    classId={classId}
                    lessonPlanId={plan?.id}
                    onRefresh={onRefresh}
                    onSelect={(res) => setLibraryResources(prev => [...prev, res])}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modal: { margin: 0, justifyContent: 'flex-end' },
    container: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%', flex: 1 },
    swipeIndicator: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
    header: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900' },
    subtitle: { fontSize: 13, fontWeight: '500' },
    closeBtn: { padding: 4 },
    scroll: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40, flexGrow: 1 },
    formSection: { marginBottom: 20 },
    label: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
    labelWithIcon: { flexDirection: 'row', alignItems: 'center' },
    input: { height: 50, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 14, fontWeight: '700' },
    row: { flexDirection: 'row', gap: 12 },
    pickerWrapper: { height: 50, borderRadius: 16, overflow: 'hidden', justifyContent: 'center' },
    textArea: { minHeight: 100, borderRadius: 16, borderWidth: 1, padding: 16, fontSize: 14, textAlignVertical: 'top' },
    statusRow: { flexDirection: 'row', gap: 8 },
    statusBtn: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    statusText: { fontSize: 9, fontWeight: '900' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    objectiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    removeBtn: { padding: 8 },
    libraryItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 8, gap: 12 },
    libraryItemText: { flex: 1, fontSize: 13, fontWeight: '700' },
    emptySmallText: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginVertical: 8 },
    linkInputContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
    linkInput: { height: 44, paddingHorizontal: 16, fontSize: 13, fontWeight: '600' },
    linkRow: { flexDirection: 'row', alignItems: 'center' },
    addLinkBtn: { paddingHorizontal: 16, height: 44, justifyContent: 'center', alignItems: 'center' },
    addLinkBtnText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    infoBox: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 10 },
    infoText: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18 },
    footer: { flexDirection: 'row', padding: 24, borderTopWidth: 1, gap: 12 },
    cancelBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '800' },
    saveBtn: { flex: 2, height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    saveText: { color: '#fff', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }
});
