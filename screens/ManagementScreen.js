import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUsers, faSchool, faBullhorn, faStore, faCog, faArrowLeft, faHandshake, faChartLine, faUserShield, faChevronRight, faUserFriends } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import SettingsScreenSkeleton, { SkeletonPiece } from '../components/skeletons/SettingsScreenSkeleton';
import LinearGradient from 'react-native-linear-gradient';

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
                if (!error) {
                    setUser(userData);
                }
            }
            setLoading(false);
        };

        fetchUser();
    }, []);

    const ManagementButton = ({ icon, title, description, onPress, color }) => (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconBox, { backgroundColor: (color || theme.colors.primary) + '15' }]}>
                <FontAwesomeIcon icon={icon} size={18} color={color || theme.colors.primary} />
            </View>
            <View style={styles.buttonContent}>
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>{title}</Text>
                <Text style={[styles.buttonDescription, { color: theme.colors.placeholder }]}>{description}</Text>
            </View>
            <FontAwesomeIcon icon={faChevronRight} size={12} color={theme.colors.cardBorder} />
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.scrollContent}
        >
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']} 
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroContainer}
            >
                <View style={styles.heroContent}>
                    <View style={styles.heroTextContainer}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <FontAwesomeIcon icon={faArrowLeft} size={18} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.heroTitle}>Management Hub</Text>
                        </View>
                        <Text style={styles.heroDescription}>
                            Centralized tools for school administration and content management.
                        </Text>
                    </View>
                    <View style={styles.roleBadge}>
                        <FontAwesomeIcon icon={faUserShield} size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'ADMIN'}</Text>
                    </View>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={{ padding: 20 }}>
                    <SkeletonPiece style={{ width: '60%', height: 20, borderRadius: 4, marginBottom: 8 }} />
                    <SkeletonPiece style={{ width: '90%', height: 14, borderRadius: 4, marginBottom: 16 }} />
                    {[1, 2, 3].map(i => (
                        <View key={i} style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center' }}>
                            <SkeletonPiece style={{ width: 40, height: 40, borderRadius: 10 }} />
                            <View style={{ marginLeft: 15, flex: 1 }}>
                                <SkeletonPiece style={{ width: 100, height: 16, borderRadius: 4, marginBottom: 4 }} />
                                <SkeletonPiece style={{ width: 150, height: 13, borderRadius: 4 }} />
                            </View>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={{ padding: 20 }}>
                    {/* User Management - Admin Only */}
                    {user && user.role === 'admin' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>USER MANAGEMENT</Text>
                            <ManagementButton
                                icon={faUsers}
                                title="Manage Users"
                                description="Add, edit, or remove users from your school"
                                onPress={() => navigation.navigate('UserManagement')}
                                color="#3b82f6"
                            />
                            <ManagementButton
                                icon={faUserFriends}
                                title="Manage Clubs & Teams"
                                description="Organize extracurricular activities"
                                onPress={() => navigation.navigate('ClubList')}
                                color="#8b5cf6"
                            />
                            <ManagementButton
                                icon={faUserFriends}
                                title="Family Connections"
                                description="Manage parent-child links across the school"
                                onPress={() => navigation.navigate('My Children')}
                                color="#a855f7"
                            />
                        </View>
                    )}

                    {/* Announcements - Admin & Teacher */}
                    {user && (user.role === 'admin' || user.role === 'teacher') && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>COMMUNICATION</Text>
                            <ManagementButton
                                icon={faBullhorn}
                                title="Manage Announcements"
                                description="Create, edit, or delete announcements"
                                onPress={() => navigation.navigate('ManageAnnouncements')}
                                color="#f43f5e"
                            />
                            <ManagementButton
                                icon={faHandshake}
                                title="Parent-Teacher Meetings"
                                description="Manage availability and bookings"
                                onPress={() => navigation.navigate('Meetings')}
                                color="#06b6d4"
                            />
                        </View>
                    )}

                    {/* School Data - Admin Only */}
                    {user && user.role === 'admin' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>SCHOOL DATA</Text>
                            <ManagementButton
                                icon={faSchool}
                                title="Manage School Data"
                                description="Update school-wide information and branding"
                                onPress={() => navigation.navigate('SchoolData')}
                                color="#10b981"
                            />
                            <ManagementButton
                                icon={faChartLine}
                                title="Engagement Audit"
                                description="Track teacher activity and adoption"
                                onPress={() => navigation.navigate('EngagementInsights')}
                                color="#6366f1"
                            />
                        </View>
                    )}

                    {/* Marketplace - All Users */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>MARKETPLACE</Text>
                        <ManagementButton
                            icon={faStore}
                            title="Manage Market Data"
                            description="Oversee marketplace items"
                            onPress={() => navigation.navigate('ManageMarketData')}
                            color="#f59e0b"
                        />
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    heroContainer: {
        padding: 24,
        paddingTop: 40,
        marginBottom: 0,
        elevation: 0,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    heroTextContainer: {
        flex: 1,
        paddingRight: 10,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: -1,
    },
    heroDescription: {
        color: '#e0e7ff',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    backButton: { marginRight: 12 },
    roleBadge: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    roleText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        marginTop: 2,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: '#94a3b8',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    button: {
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonContent: {
        flex: 1,
        marginLeft: 16,
    },
    buttonText: {
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 2,
    },
    buttonDescription: {
        fontSize: 12,
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        marginBottom: 32,
    },
    separator: {
        borderBottomWidth: 1,
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
    backButtonText: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '500',
    },
});
