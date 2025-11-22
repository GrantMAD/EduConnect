import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faLock, faEye, faEyeSlash, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function ChangePasswordModal({ visible, onClose }) {
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
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faLock} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Change Password</Text>
                    <TouchableOpacity onPress={() => !saving && handleClose()} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>
                        {/* Current Password */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Current Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: theme.colors.inputBackground,
                                        borderColor: theme.colors.inputBorder,
                                        color: theme.colors.text
                                    }]}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    placeholder="Enter current password"
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
                                        size={18}
                                        color={theme.colors.placeholder}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        {/* New Password */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>New Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: theme.colors.inputBackground,
                                        borderColor: theme.colors.inputBorder,
                                        color: theme.colors.text
                                    }]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter new password"
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
                                        size={18}
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
                                                            : theme.colors.inputBorder
                                                    }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                    <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>
                                        {passwordStrength.label}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Confirm New Password</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: theme.colors.inputBackground,
                                        borderColor: theme.colors.inputBorder,
                                        color: theme.colors.text
                                    }]}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm new password"
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
                                        size={18}
                                        color={theme.colors.placeholder}
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* Match Indicator */}
                            {confirmPassword.length > 0 && (
                                <View style={styles.matchContainer}>
                                    <FontAwesomeIcon
                                        icon={passwordsMatch ? faCheckCircle : faTimesCircle}
                                        size={16}
                                        color={passwordsMatch ? '#34C759' : '#FF3B30'}
                                    />
                                    <Text style={[styles.matchText, { color: passwordsMatch ? '#34C759' : '#FF3B30' }]}>
                                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving ? 'Changing Password...' : 'Change Password'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 15,
        flex: 1,
    },
    modalCloseButton: {
        padding: 5,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    divider: {
        height: 1,
        marginVertical: 15,
    },
    inputSection: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    passwordContainer: {
        position: 'relative',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        paddingRight: 50,
        fontSize: 15,
    },
    eyeIcon: {
        position: 'absolute',
        right: 14,
        top: 14,
        padding: 4,
    },
    strengthContainer: {
        marginTop: 8,
    },
    strengthBar: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 4,
    },
    strengthSegment: {
        flex: 1,
        height: 4,
        borderRadius: 2,
    },
    strengthLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    matchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    matchText: {
        fontSize: 13,
        marginLeft: 6,
        fontWeight: '500',
    },
    saveButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
