import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPlus, faTrash, faSave, faPercent, faExclamationTriangle, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { fetchGradingCategories, saveGradingCategory, deleteGradingCategory } from '../services/gradebookService';

const GradingCategoriesModal = ({ visible, onClose, classId, onRefresh }) => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (visible && classId) {
            loadCategories();
        }
    }, [visible, classId]);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await fetchGradingCategories(classId);
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = () => {
        setCategories([...categories, { name: '', weight: 0, class_id: classId }]);
    };

    const handleUpdateCategory = (index, field, value) => {
        const newCategories = [...categories];
        newCategories[index] = { ...newCategories[index], [field]: value };
        setCategories(newCategories);
    };

    const handleRemoveCategory = async (index) => {
        const category = categories[index];
        if (category.id) {
            Alert.alert(
                'Delete Category?',
                'This will affect weighted grade calculations for all marks in this category.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteGradingCategory(category.id);
                                setCategories(categories.filter((_, i) => i !== index));
                                showToast('Category deleted', 'success');
                            } catch (error) {
                                showToast('Failed to delete category', 'error');
                            }
                        }
                    }
                ]
            );
        } else {
            setCategories(categories.filter((_, i) => i !== index));
        }
    };

    const handleSave = async () => {
        const totalWeight = categories.reduce((sum, cat) => sum + parseFloat(cat.weight || 0), 0);

        const performSave = async () => {
            setSaving(true);
            try {
                // Filter out empty names
                const validCategories = categories.filter(c => c.name.trim() !== '');
                await Promise.all(validCategories.map(cat => saveGradingCategory({
                    ...cat,
                    weight: parseFloat(cat.weight || 0)
                })));
                showToast('Grading categories saved successfully', 'success');
                if (onRefresh) onRefresh();
                onClose();
            } catch (error) {
                console.error('Error saving categories:', error);
                showToast('Failed to save categories', 'error');
            } finally {
                setSaving(false);
            }
        };

        if (totalWeight !== 100 && categories.length > 0) {
            Alert.alert(
                'Weight Inconsistency',
                `Total weight is ${totalWeight}%, not 100%. Calculations will be normalized based on this sum. Continue?`,
                [
                    { text: 'Adjust', style: 'cancel' },
                    { text: 'Save Anyway', onPress: performSave }
                ]
            );
        } else {
            await performSave();
        }
    };

    const totalWeightSum = categories.reduce((a, b) => a + parseFloat(b.weight || 0), 0);

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            style={styles.modal}
            backdropOpacity={0.5}
            avoidKeyboard={true}
        >
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={styles.headerTitleRow}>
                        <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                            <FontAwesomeIcon icon={faLayerGroup} size={18} color={theme.colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.title, { color: theme.colors.text }]}>Grading Categories</Text>
                            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Define weights for this class.</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                        {loading ? (
                            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
                        ) : (
                            <>
                                {categories.length === 0 ? (
                                    <View style={[styles.emptyBox, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card + '50' }]}>
                                        <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No categories defined yet.</Text>
                                    </View>
                                ) : (
                                    categories.map((cat, index) => (
                                        <View key={index} style={styles.categoryRow}>
                                            <View style={styles.inputGroup}>
                                                <TextInput
                                                    style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                                                    value={cat.name}
                                                    onChangeText={(val) => handleUpdateCategory(index, 'name', val)}
                                                    placeholder="Category (e.g. Exams)"
                                                    placeholderTextColor={theme.colors.placeholder}
                                                />
                                            </View>
                                            <View style={styles.weightGroup}>
                                                <TextInput
                                                    style={[styles.weightInput, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                                                    value={cat.weight.toString()}
                                                    onChangeText={(val) => handleUpdateCategory(index, 'weight', val)}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                    placeholderTextColor={theme.colors.placeholder}
                                                    textAlign="right"
                                                />
                                                <View style={styles.percentIcon}>
                                                    <FontAwesomeIcon icon={faPercent} size={10} color={theme.colors.placeholder} />
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleRemoveCategory(index)}
                                                style={styles.deleteBtn}
                                            >
                                                <FontAwesomeIcon icon={faTrash} size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}

                                <TouchableOpacity
                                    style={[styles.addBtn, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '05' }]}
                                    onPress={handleAddCategory}
                                >
                                    <FontAwesomeIcon icon={faPlus} size={14} color={theme.colors.primary} />
                                    <Text style={[styles.addBtnText, { color: theme.colors.primary }]}>ADD NEW CATEGORY</Text>
                                </TouchableOpacity>

                                {totalWeightSum !== 100 && categories.length > 0 && (
                                    <View style={[styles.warningBox, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}>
                                        <FontAwesomeIcon icon={faExclamationTriangle} size={14} color="#d97706" style={{ marginTop: 2 }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.warningTitle}>Weighted sum: {totalWeightSum}%</Text>
                                            <Text style={styles.warningText}>For accuracy, ensure weights total 100%.</Text>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </KeyboardAvoidingView>

                <View style={[styles.footer, { borderTopColor: theme.colors.cardBorder }]}>
                    <TouchableOpacity
                        style={[styles.cancelBtn, { borderColor: theme.colors.cardBorder }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.cancelBtnText, { color: theme.colors.text }]}>CANCEL</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} size={16} color="#fff" />
                                <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modal: { margin: 0, justifyContent: 'flex-end' },
    container: { borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 20, fontWeight: '900' },
    subtitle: { fontSize: 13, fontWeight: '600' },
    content: { flex: 1, padding: 24 },
    scrollContent: { paddingBottom: 40 },
    emptyBox: { padding: 32, borderRadius: 24, borderStyle: 'dotted', borderWidth: 2, alignItems: 'center' },
    emptyText: { fontSize: 14, fontStyle: 'italic', fontWeight: '500' },
    categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    inputGroup: { flex: 1 },
    input: { height: 48, borderRadius: 12, paddingHorizontal: 16, fontSize: 14, fontWeight: '600', borderWidth: 1 },
    weightGroup: { width: 80, position: 'relative' },
    weightInput: { height: 48, borderRadius: 12, paddingLeft: 10, paddingRight: 24, fontSize: 14, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', borderWidth: 1 },
    percentIcon: { position: 'absolute', right: 10, top: 18 },
    deleteBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, gap: 10, marginTop: 10 },
    addBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    warningBox: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, marginTop: 24, borderWidth: 1 },
    warningTitle: { color: '#b45309', fontWeight: '800', fontSize: 13 },
    warningText: { color: '#d97706', fontSize: 11, fontWeight: '600' },
    footer: { padding: 24, flexDirection: 'row', gap: 12, borderTopWidth: 1 },
    cancelBtn: { flex: 1, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    cancelBtnText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    saveBtn: { flex: 2, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
});

export default GradingCategoriesModal;
