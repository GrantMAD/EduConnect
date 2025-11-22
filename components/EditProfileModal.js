import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUser, faCamera } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { useToast } from '../context/ToastContext';

export default function EditProfileModal({ visible, onClose, currentUser }) {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [fullName, setFullName] = useState('');
    const [number, setNumber] = useState('');
    const [avatarUri, setAvatarUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFullName(currentUser.full_name || '');
            setNumber(currentUser.number || '');
            setAvatarUri(currentUser.avatar_url || null);
        }
    }, [currentUser]);

    const pickImage = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showToast('Please grant media library access to upload photos.', 'error');
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    const uploadAvatar = async (uri) => {
        setUploading(true);
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });
            const buffer = Buffer.from(base64, 'base64');

            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${currentUser.id}_avatar_${Date.now()}.${fileExt}`;
            const filePath = `${currentUser.id}/${fileName}`;
            const contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, buffer, { cacheControl: '3600', upsert: true, contentType });

            if (uploadError) throw uploadError;

            const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            return publicData?.publicUrl || null;
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Failed to upload avatar.', 'error');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            showToast('Name cannot be empty.', 'error');
            return;
        }

        setSaving(true);
        try {
            let avatarUrl = currentUser.avatar_url;

            // Upload new avatar if changed
            if (avatarUri && avatarUri !== currentUser.avatar_url) {
                const uploadedUrl = await uploadAvatar(avatarUri);
                if (uploadedUrl) avatarUrl = uploadedUrl;
            }

            const { error } = await supabase
                .from('users')
                .update({
                    full_name: fullName.trim(),
                    number: number.trim(),
                    avatar_url: avatarUrl,
                })
                .eq('id', currentUser.id);

            if (error) throw error;

            showToast('Profile updated successfully!', 'success');
            onClose(true); // Pass true to indicate successful update
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Failed to update profile.', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={() => !saving && !uploading && onClose(false)}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faUser} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Edit Profile</Text>
                    <TouchableOpacity onPress={() => !saving && !uploading && onClose(false)} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.contentContainer}>
                        {/* Avatar Section */}
                        <View style={styles.avatarSection}>
                            <TouchableOpacity onPress={pickImage} disabled={uploading || saving}>
                                <View style={styles.avatarContainer}>
                                    {avatarUri ? (
                                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                                    ) : (
                                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.inputBackground }]}>
                                            <FontAwesomeIcon icon={faUser} size={40} color={theme.colors.placeholder} />
                                        </View>
                                    )}
                                    <View style={[styles.cameraIcon, { backgroundColor: theme.colors.primary }]}>
                                        <FontAwesomeIcon icon={faCamera} size={16} color="#fff" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <Text style={[styles.avatarHint, { color: theme.colors.placeholder }]}>Tap to change avatar</Text>
                        </View>

                        <View style={[styles.divider, { backgroundColor: theme.colors.cardBorder }]} />

                        {/* Name Input */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Full Name</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.inputBackground,
                                    borderColor: theme.colors.inputBorder,
                                    color: theme.colors.text
                                }]}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Enter your full name"
                                placeholderTextColor={theme.colors.placeholder}
                                editable={!saving && !uploading}
                            />
                        </View>

                        {/* Phone Number Input */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>Phone Number</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.inputBackground,
                                    borderColor: theme.colors.inputBorder,
                                    color: theme.colors.text
                                }]}
                                value={number}
                                onChangeText={setNumber}
                                placeholder="Enter your phone number"
                                placeholderTextColor={theme.colors.placeholder}
                                keyboardType="phone-pad"
                                editable={!saving && !uploading}
                            />
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={saving || uploading}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving || uploading ? 'Saving...' : 'Save Changes'}
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
    avatarSection: {
        alignItems: 'center',
        marginVertical: 20,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#007AFF',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#ddd',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarHint: {
        fontSize: 13,
        marginTop: 8,
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
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
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
