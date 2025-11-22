import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUsers, faSchool, faBullhorn, faStore, faCog, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import SettingsScreenSkeleton from '../components/skeletons/SettingsScreenSkeleton';

export default function ManagementScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (error) {
                    console.error('Error fetching user role:', error);
                } else {
                    setUser(userData);
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    const ManagementButton = ({ icon, title, description, onPress, color }) => (
        <TouchableOpacity
            style={[styles.button, { borderColor: theme.colors.cardBorder }]}
            onPress={onPress}
        >
            <FontAwesomeIcon icon={icon} size={20} color={color || theme.colors.primary} />
            <View style={styles.buttonContent}>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>{title}</Text>
                <Text style={[styles.buttonDescription, { color: theme.colors.placeholder }]}>{description}</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return <SettingsScreenSkeleton />;
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.scrollContent}
        >
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <FontAwesomeIcon icon={faArrowLeft} size={20} color="#007AFF" />
                <Text style={[styles.backButtonText, { color: '#007AFF' }]}>Back to Settings</Text>
            </TouchableOpacity>
            <View style={styles.header}>
                <FontAwesomeIcon icon={faCog} size={32} color={theme.colors.primary} />
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Management</Text>
            </View>
            <Text style={[styles.description, { color: theme.colors.placeholder }]}>
                Manage users, content, and school data
            </Text>

            {/* User Management - Admin Only */}
            {user && user.role === 'admin' && (
                <View style={styles.section}>
                    <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>User Management</Text>
                    <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
                        Manage users and classes within your school
                    </Text>
                    <ManagementButton
                        icon={faUsers}
                        title="Manage Users"
                        description="Add, edit, or remove users from your school"
                        onPress={() => navigation.navigate('UserManagement')}
                        color="#007AFF"
                    />
                </View>
            )}

            {/* Announcements - Admin & Teacher */}
            {user && (user.role === 'admin' || user.role === 'teacher') && (
                <View style={styles.section}>
                    <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
                    <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Announcements</Text>
                    <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
                        Manage school-wide announcements
                    </Text>
                    <ManagementButton
                        icon={faBullhorn}
                        title="Manage Announcements"
                        description="Create, edit, or delete announcements"
                        onPress={() => navigation.navigate('ManageAnnouncements')}
                        color="#FF3B30"
                    />
                </View>
            )}

            {/* School Data - Admin Only */}
            {user && user.role === 'admin' && (
                <View style={styles.section}>
                    <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
                    <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>School Data</Text>
                    <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
                        Manage your school's information and branding
                    </Text>
                    <ManagementButton
                        icon={faSchool}
                        title="Manage School Data"
                        description="Update school-wide information and branding"
                        onPress={() => navigation.navigate('SchoolData')}
                        color="#34C759"
                    />
                </View>
            )}

            {/* Marketplace - All Users */}
            <View style={styles.section}>
                <View style={[styles.separator, { borderBottomColor: theme.colors.cardBorder }]} />
                <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>Marketplace</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>
                    Manage your marketplace items
                </Text>
                <ManagementButton
                    icon={faStore}
                    title="Manage Market Data"
                    description="Oversee marketplace items"
                    onPress={() => navigation.navigate('ManageMarketData')}
                    color="#FF9500"
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginLeft: 12,
    },
    description: {
        fontSize: 16,
        marginBottom: 32,
    },
    separator: {
        borderBottomWidth: 1,
        marginBottom: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionDescription: {
        fontSize: 14,
        marginBottom: 16,
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 8,
    },
    buttonContent: {
        flex: 1,
        marginLeft: 15,
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 4,
    },
    buttonDescription: {
        fontSize: 13,
    },
    backButton: {
        marginBottom: 10,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '500',
    },
});
