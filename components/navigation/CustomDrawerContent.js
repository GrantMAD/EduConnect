import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, Image, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faHome,
    faUser,
    faChild,
    faBookOpen,
    faPoll,
    faGear,
    faRightFromBracket
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';

const defaultUserImage = require('../../assets/user.png');

const CustomDrawerContent = (props) => {
    const [userAvatar, setUserAvatar] = useState(null);
    const [userName, setUserName] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme();

    const mainStackState = props.state.routes.find(route => route.name === 'MainStack')?.state;
    const activeMainStackRouteName = mainStackState?.routes[mainStackState.index]?.name;

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('full_name, avatar_url, role')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        setUserAvatar(profile.avatar_url);
                        setUserName(profile.full_name || user.email);
                        setUserRole(profile.role);
                    } else {
                        setUserName(user.email);
                    }
                    setUserEmail(user.email);
                }
            } catch (error) {
                console.error("Error fetching user data for drawer:", error);
                setUserName("Guest");
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 70, backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, height: '100%', paddingTop: 70, backgroundColor: theme.colors.background }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder, paddingHorizontal: 20 }}>
                <Image
                    source={userAvatar ? { uri: userAvatar } : defaultUserImage}
                    style={{ width: 55, height: 55, borderRadius: 27.5, marginRight: 12, borderWidth: 2, borderColor: theme.colors.primary }}
                />
                <View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.text }}>Welcome,</Text>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: theme.colors.primary }}>{userName || 'User'}</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.placeholder }}>{userEmail || ''}</Text>
                </View>
            </View>

            <TouchableOpacity
                onPress={() => props.navigation.navigate('MainStack', { screen: 'HomeTabs' })}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor: activeMainStackRouteName === 'HomeTabs' ? theme.colors.primary + '20' : 'transparent',
                    borderRadius: 8,
                }}
            >
                <FontAwesomeIcon icon={faHome} size={18} color={theme.colors.primary} style={{ marginRight: 15 }} />
                <View>
                    <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: '500' }}>Home</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => props.navigation.navigate('MainStack', { screen: 'Profile' })}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor: activeMainStackRouteName === 'Profile' ? theme.colors.primary + '20' : 'transparent',
                    borderRadius: 8,
                }}
            >

                <FontAwesomeIcon icon={faUser} size={18} color={theme.colors.primary} style={{ marginRight: 15 }} />
                <View>
                    <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: '500' }}>Profile</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.placeholder }}>Manage your personal information</Text>
                </View>
            </TouchableOpacity>

            {userRole === 'parent' && (
                <TouchableOpacity
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'MyChildren' })}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                        backgroundColor: activeMainStackRouteName === 'MyChildren' ? theme.colors.primary + '20' : 'transparent',
                        borderRadius: 8,
                    }}
                >
                    <FontAwesomeIcon icon={faChild} size={18} color={theme.colors.primary} style={{ marginRight: 15 }} />
                    <View>
                        <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: '500' }}>My Children</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.placeholder }}>View your children's progress</Text>
                    </View>
                </TouchableOpacity>
            )}

            {['admin', 'teacher'].includes(userRole) && (
                <TouchableOpacity
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'ManageClasses' })}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 12,
                        paddingHorizontal: 20,
                        backgroundColor: activeMainStackRouteName === 'CreateClass' ? theme.colors.primary + '20' : 'transparent',
                        borderRadius: 8,
                    }}
                >
                    <FontAwesomeIcon icon={faBookOpen} size={18} color={theme.colors.primary} style={{ marginRight: 15 }} />
                    <View>
                        <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: '500' }}>Classes</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.placeholder }}>Create and manage classes</Text>
                    </View>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                onPress={() => props.navigation.navigate('MainStack', { screen: 'Resources' })}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor: activeMainStackRouteName === 'Resources' ? theme.colors.primary + '20' : 'transparent',
                    borderRadius: 8,
                }}
            >
                <FontAwesomeIcon icon={faBookOpen} size={18} color={theme.colors.primary} style={{ marginRight: 15 }} />
                <View>
                    <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: '500' }}>Resources</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.placeholder }}>View school resources</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => props.navigation.navigate('MainStack', { screen: 'Polls' })}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor: activeMainStackRouteName === 'Polls' ? theme.colors.primary + '20' : 'transparent',
                    borderRadius: 8,
                }}
            >
                <FontAwesomeIcon icon={faPoll} size={18} color={theme.colors.primary} style={{ marginRight: 15 }} />
                <View>
                    <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: '500' }}>Polls</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.placeholder }}>Vote on school-wide polls</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => props.navigation.navigate('MainStack', { screen: 'Settings' })}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor: activeMainStackRouteName === 'Settings' ? theme.colors.primary + '20' : 'transparent',
                    borderRadius: 8,
                }}
            >
                <FontAwesomeIcon icon={faGear} size={18} color={theme.colors.primary} style={{ marginRight: 15 }} />
                <View>
                    <Text style={{ fontSize: 16, color: theme.colors.text, fontWeight: '500' }}>Settings</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.placeholder }}>Adjust app settings and preferences</Text>
                </View>
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
                onPress={async () => {
                    await supabase.auth.signOut();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, marginBottom: 20 }}
            >
                <FontAwesomeIcon icon={faRightFromBracket} size={18} color={theme.colors.error} style={{ marginRight: 15 }} />
                <Text style={{ fontSize: 16, color: theme.colors.error, fontWeight: '500' }}>Sign Out</Text>
            </TouchableOpacity>
        </View>
    );
};

export default CustomDrawerContent;
