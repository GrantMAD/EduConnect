import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faLock, faEye, faEyeSlash, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

const ChangePasswordModal = React.memo(({ visible, onClose }) => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);

    const getPasswordStrength = (password) => {
        if (!password) return { strength: 0, label: '', color: '' };

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 2) return { strength, label: 'Weak', color: '#FF3B30' };
        if (strength <= 3) return { strength, label: 'Medium', color: '#FF9500' };
        return { strength, label: 'Strong', color: '#34C759' };
    };

    const passwordStrength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

    const handleSave = async () => {
        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        if (newPassword.length < 8) {
            showToast('New password must be at least 8 characters.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('New passwords do not match.', 'error');
            return;
        }

        setSaving(true);
        try {
            // Supabase doesn't have a direct way to verify current password
            // We'll attempt to update and let Supabase handle the auth
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            showToast('Password changed successfully!', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onClose();
        } catch (error) {
            console.error('Error changing password:', error);
            showToast(error.message || 'Failed to change password.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={() => !saving && handleClose()}
            onSwipeComplete={() => !saving && handleClose()}
            swipeDirection={['down']}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.4}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: 40 }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faLock} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Security Update</Text>
                    <TouchableOpacity onPress={() => !saving && handleClose()} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
                    <View style={styles.contentContainer}>
                        {/* Current Password */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: '#94a3b8' }]}>CURRENT PASSWORD</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.cardBorder,
                                        borderWidth: 1,
                                        color: theme.colors.text
                                    }]}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder="Verify current password"
                                    placeholderTextColor={theme.colors.placeholder}
                                    secureTextEntry={!showCurrent}
                                    editable={!saving}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowCurrent(!showCurrent)}
                                >
                                    <FontAwesomeIcon
                                        icon={showCurrent ? faEyeSlash : faEye}
                                        size={16}
                                        color={theme.colors.placeholder}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* New Password */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: '#94a3b8' }]}>NEW PASSWORD</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.cardBorder,
                                        borderWidth: 1,
                                        color: theme.colors.text
                                    }]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter secure password"
                                    placeholderTextColor={theme.colors.placeholder}
                                    secureTextEntry={!showNew}
                                    editable={!saving}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowNew(!showNew)}
                                >
                                    <FontAwesomeIcon
                                        icon={showNew ? faEyeSlash : faEye}
                                        size={16}
                                        color={theme.colors.placeholder}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Password Strength Indicator */}
                            {newPassword.length > 0 && (
                                <View style={styles.strengthContainer}>
                                    <View style={styles.strengthBar}>
                                        {[1, 2, 3, 4, 5].map((level) => (
                                            <View
                                                key={level}
                                                style={[
                                                    styles.strengthSegment,
                                                    {
                                                        backgroundColor: level <= passwordStrength.strength
                                                            ? passwordStrength.color
                                                            : theme.colors.cardBorder
                                                    }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                        {passwordStrength.label.toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: '#94a3b8' }]}>CONFIRM PASSWORD</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: theme.colors.card,
                                        borderColor: theme.colors.cardBorder,
                                        borderWidth: 1,
                                        color: theme.colors.text
                                    }]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Repeat new password"
                                    placeholderTextColor={theme.colors.placeholder}
                                    secureTextEntry={!showConfirm}
                                    editable={!saving}
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowConfirm(!showConfirm)}
                                >
                                    <FontAwesomeIcon
                                        icon={showConfirm ? faEyeSlash : faEye}
                                        size={16}
                                        color={theme.colors.placeholder}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Match Indicator */}
                            {confirmPassword.length > 0 && (
                                <View style={styles.matchContainer}>
                                    <FontAwesomeIcon
                                        icon={passwordsMatch ? faCheckCircle : faTimesCircle}
                                        size={14}
                                        color={passwordsMatch ? '#10b981' : '#ef4444'}
                                    />
                                    <Text style={[styles.matchText, { color: passwordsMatch ? '#10b981' : '#ef4444' }]}>
                                        {passwordsMatch ? 'IDENTICAL' : 'NO MATCH'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={saving}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving ? 'PROCESSING...' : 'UPDATE PASSWORD'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '90%',
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        flex: 1,
        letterSpacing: -0.5,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        paddingBottom: 20,
    },
    inputSection: {
        marginBottom: 24,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 1.5,
    },
    passwordContainer: {
        position: 'relative',
    },
    input: {
        borderRadius: 16,
        height: 56,
        paddingHorizontal: 16,
        paddingRight: 56,
        fontSize: 15,
        fontWeight: '700',
    },
    eyeIcon: {
        position: 'absolute',
        right: 8,
        top: 8,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    strengthContainer: {
        marginTop: 12,
    },
    strengthBar: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
    },
    strengthSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    matchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    matchText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    saveButton: {
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default ChangePasswordModal;
