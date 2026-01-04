import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Platform } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUser, faCamera, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { Picker } from '@react-native-picker/picker';
import { COUNTRIES } from '../constants/Countries';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { useToast } from '../context/ToastContext';

const EditProfileModal = React.memo(({ visible, onClose, currentUser }) => {
    const { theme } = useTheme();
    const { showToast } = useToast();
    const [fullName, setFullName] = useState('');
    const [number, setNumber] = useState('');
    const [country, setCountry] = useState('');
    const [avatarUri, setAvatarUri] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFullName(currentUser.full_name || '');
            setNumber(currentUser.number || '');
            setCountry(currentUser.country || '');
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
                    country: country.trim(),
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
            onSwipeComplete={() => !saving && !uploading && onClose(false)}
            swipeDirection={['down']}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.4}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faUser} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Edit Profile</Text>
                    <TouchableOpacity onPress={() => !saving && !uploading && onClose(false)} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
                    <View style={styles.contentContainer}>
                        {/* Avatar Section */}
                        <View style={styles.avatarSection}>
                            <TouchableOpacity onPress={pickImage} disabled={uploading || saving} activeOpacity={0.8}>
                                <View style={styles.avatarContainer}>
                                    {avatarUri ? (
                                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                                    ) : (
                                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.card }]}>
                                            <FontAwesomeIcon icon={faUser} size={40} color={theme.colors.cardBorder} />
                                        </View>
                                    )}
                                    <View style={[styles.cameraIcon, { backgroundColor: theme.colors.primary }]}>
                                        <FontAwesomeIcon icon={faCamera} size={14} color="#fff" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                            <Text style={[styles.avatarHint, { color: theme.colors.placeholder }]}>TAP TO UPDATE PHOTO</Text>
                        </View>

                        {/* Name Input */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: '#94a3b8' }]}>FULL NAME</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.card,
                                    borderColor: theme.colors.cardBorder,
                                    borderWidth: 1,
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
                            <Text style={[styles.label, { color: '#94a3b8' }]}>PHONE NUMBER</Text>
                            <TextInput
                                style={[styles.input, {
                                    backgroundColor: theme.colors.card,
                                    borderColor: theme.colors.cardBorder,
                                    borderWidth: 1,
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

                        {/* Country Picker */}
                        <View style={styles.inputSection}>
                            <Text style={[styles.label, { color: '#94a3b8' }]}>COUNTRY</Text>
                            <View style={[styles.pickerWrapper, {
                                borderColor: theme.colors.cardBorder,
                                backgroundColor: theme.colors.card,
                                borderWidth: 1
                            }]}>
                                <Picker
                                    selectedValue={country}
                                    onValueChange={(itemValue) => setCountry(itemValue)}
                                    enabled={!saving && !uploading}
                                    dropdownIconColor={theme.colors.primary}
                                    style={{ color: theme.colors.text }}
                                >
                                    <Picker.Item label="Select your country" value="" color={theme.colors.placeholder} />
                                    {COUNTRIES.map((c) => (
                                        <Picker.Item key={c} label={c} value={c} color={theme.colors.text} />
                                    ))}
                                </Picker>
                            </View>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                            onPress={handleSave}
                            disabled={saving || uploading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveButtonText}>
                                {saving || uploading ? 'SAVING CHANGES...' : 'CONFIRM UPDATES'}
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
        letterSpacing: -0.5,
        flex: 1,
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
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 112,
        height: 112,
        borderRadius: 36,
    },
    avatarPlaceholder: {
        width: 112,
        height: 112,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarHint: {
        fontSize: 10,
        fontWeight: '900',
        marginTop: 16,
        letterSpacing: 1,
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
    input: {
        borderRadius: 16,
        height: 56,
        paddingHorizontal: 16,
        fontSize: 15,
        fontWeight: '700',
    },
    pickerWrapper: {
        borderRadius: 16,
        height: 56,
        overflow: 'hidden',
        justifyContent: 'center',
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

export default EditProfileModal;
