import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPlus, faTrash, faSave, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { fetchLessonTopics, saveLessonTopic, deleteLessonTopic } from '../services/lessonService';

export default function TopicManagerModal({ isOpen, onClose, classId, onRefresh }) {
    const { theme, isDarkTheme } = useTheme();
    const { showToast } = useToast();
    const [topics, setTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadTopics();
        }
    }, [isOpen]);

    const loadTopics = async () => {
        setLoading(true);
        try {
            const data = await fetchLessonTopics(classId);
            setTopics(data);
        } catch (error) {
            console.error('Error loading topics:', error);
            showToast('Failed to load topics', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTopic = () => {
        setTopics([...topics, { name: '', description: '', class_id: classId, sort_order: topics.length }]);
    };

    const handleUpdateTopic = (index, field, value) => {
        const newTopics = [...topics];
        newTopics[index] = { ...newTopics[index], [field]: value };
        setTopics(newTopics);
    };

    const handleRemoveTopic = async (index) => {
        const topic = topics[index];
        if (topic.id) {
            Alert.alert(
                'Delete Topic',
                'Are you sure? This will un-link any lesson plans associated with this topic.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteLessonTopic(topic.id);
                                showToast('Topic deleted', 'success');
                                setTopics(topics.filter((_, i) => i !== index));
                            } catch {
                                showToast('Failed to delete topic', 'error');
                            }
                        }
                    }
                ]
            );
        } else {
            setTopics(topics.filter((_, i) => i !== index));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(topics.map(topic => saveLessonTopic(topic)));
            showToast('Curriculum topics saved', 'success');
            if (onRefresh) onRefresh();
            onClose();
        } catch (error) {
            console.error('Error saving topics:', error);
            showToast('Failed to save topics', 'error');
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
                        <FontAwesomeIcon icon={faLayerGroup} size={20} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.title, { color: theme.colors.text }]}>Curriculum Topics</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Organize lessons into units.</Text>
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
                    {loading ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginVertical: 40 }} />
                    ) : (
                        <View style={styles.topicsList}>
                            {topics.length === 0 ? (
                                <View style={[styles.emptyBox, { borderColor: theme.colors.cardBorder }]}>
                                    <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No topics defined yet.</Text>
                                </View>
                            ) : (
                                topics.map((topic, index) => (
                                    <View key={index} style={[styles.topicCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}>
                                        <View style={{ flex: 1, gap: 10 }}>
                                            <TextInput
                                                value={topic.name}
                                                onChangeText={(t) => handleUpdateTopic(index, 'name', t)}
                                                placeholder="Topic Name (e.g. Unit 1)"
                                                placeholderTextColor={theme.colors.placeholder}
                                                style={[styles.input, { color: theme.colors.text, borderBottomColor: theme.colors.cardBorder }]}
                                            />
                                            <TextInput
                                                value={topic.description || ''}
                                                onChangeText={(t) => handleUpdateTopic(index, 'description', t)}
                                                placeholder="Brief description..."
                                                placeholderTextColor={theme.colors.placeholder}
                                                multiline
                                                style={[styles.textArea, { color: theme.colors.text }]}
                                            />
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveTopic(index)} style={styles.deleteBtn}>
                                            <FontAwesomeIcon icon={faTrash} size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}

                            <TouchableOpacity
                                onPress={handleAddTopic}
                                style={[styles.addBtn, { borderColor: theme.colors.primary, borderStyle: 'dashed' }]}
                            >
                                <FontAwesomeIcon icon={faPlus} size={14} color={theme.colors.primary} />
                                <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>Add New Unit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
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
                                <Text style={styles.saveText}>Save Curriculum</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
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
    scrollContent: { padding: 24, flexGrow: 1 },
    topicsList: { gap: 16, paddingBottom: 40 },
    emptyBox: { padding: 40, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center' },
    emptyText: { fontSize: 14, fontWeight: '600', fontStyle: 'italic' },
    topicCard: { padding: 16, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    input: { fontSize: 15, fontWeight: '800', paddingVertical: 8, borderBottomWidth: 1 },
    textArea: { fontSize: 13, fontWeight: '500', minHeight: 60, textAlignVertical: 'top' },
    deleteBtn: { padding: 8, marginTop: 4 },
    addBtn: { padding: 16, borderRadius: 20, borderWidth: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    addBtnText: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    footer: { flexDirection: 'row', padding: 24, borderTopWidth: 1, gap: 12 },
    cancelBtn: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cancelText: { fontSize: 14, fontWeight: '800' },
    saveBtn: { flex: 2, height: 56, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
    saveText: { color: '#fff', fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }
});
