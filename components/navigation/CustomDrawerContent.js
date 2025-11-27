import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, Image, ActivityIndicator, ScrollView } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faHome,
    faUser,
    faChild,
    faBookOpen,
    faPoll,
    faGear,
    faRightFromBracket,
    faChartLine
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { BORDER_STYLES } from '../../constants/GamificationStyles';
import AnimatedAvatarBorder from '../AnimatedAvatarBorder';

const defaultUserImage = require('../../assets/user.png');

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CustomDrawerContent = (props) => {
    const [userAvatar, setUserAvatar] = useState(null);
    const [userName, setUserName] = useState(null);
    const [userEmail, setUserEmail] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileCompletion, setProfileCompletion] = useState(0);
    const { theme } = useTheme();
    const { equippedItem } = useGamification();

    const insets = useSafeAreaInsets();

    const calculateProfileCompletion = (profile) => {
        let completed = 0;
        const fields = [
            profile?.full_name,
            profile?.avatar_url,
            profile?.number,
            profile?.school_id
        ];
        fields.forEach(field => {
            if (field) completed += 25;
        });
        return completed;
    };

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
                        setProfileCompletion(calculateProfileCompletion(profile));
                    } else {
                        setUserName(user.email);
                        setProfileCompletion(0);
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

    const DrawerItem = ({ icon, label, description, routeName, onPress, active }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginHorizontal: 10,
                marginBottom: 4,
                backgroundColor: active ? theme.colors.primary + '15' : 'transparent',
                borderRadius: 12,
                borderLeftWidth: active ? 4 : 0,
                borderLeftColor: theme.colors.primary,
            }}
        >
            <View style={{ width: 24, alignItems: 'center', marginRight: 12 }}>
                <FontAwesomeIcon icon={icon} size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? '600' : '500' }}>{label}</Text>
                {description && <Text style={{ fontSize: 11, color: theme.colors.placeholder, marginTop: 2 }}>{description}</Text>}
            </View>
        </TouchableOpacity>
    );

    const SectionHeader = ({ title }) => (
        <Text style={{
            fontSize: 11,
            fontWeight: '700',
            color: theme.colors.placeholder,
            marginTop: 20,
            marginBottom: 8,
            marginLeft: 26,
            textTransform: 'uppercase',
            letterSpacing: 1
        }}>
            {title}
        </Text>
    );

    return (
        <View style={{ flex: 1, height: '100%', paddingTop: 60, backgroundColor: theme.colors.background }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ marginRight: 16 }}>
                        <AnimatedAvatarBorder
                            avatarSource={userAvatar ? { uri: userAvatar } : defaultUserImage}
                            size={60}
                            borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : { borderWidth: 2, borderColor: theme.colors.primary }}
                            isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                            isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.colors.text }} numberOfLines={1}>{userName || 'User'}</Text>
                        <Text style={{ fontSize: 13, color: theme.colors.placeholder }} numberOfLines={1}>{userEmail || ''}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                            <View style={{ backgroundColor: theme.colors.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, color: theme.colors.primary, fontWeight: '600', textTransform: 'capitalize' }}>
                                    {userRole || 'Guest'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                <SectionHeader title="General" />
                <DrawerItem
                    icon={faHome}
                    label="Home"
                    routeName="HomeTabs"
                    active={activeMainStackRouteName === 'HomeTabs'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'HomeTabs' })}
                />
                <DrawerItem
                    icon={faUser}
                    label="Profile"
                    description="Manage your personal information"
                    routeName="Profile"
                    active={activeMainStackRouteName === 'Profile'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Profile' })}
                />

                {(userRole === 'parent' || ['admin', 'teacher'].includes(userRole)) && (
                    <>
                        <SectionHeader title="Management" />
                        {userRole === 'parent' && (
                            <DrawerItem
                                icon={faChild}
                                label="My Children"
                                description="View your children's progress"
                                routeName="MyChildren"
                                active={activeMainStackRouteName === 'MyChildren'}
                                onPress={() => props.navigation.navigate('MainStack', { screen: 'MyChildren' })}
                            />
                        )}
                        {['admin', 'teacher'].includes(userRole) && (
                            <>
                                <DrawerItem
                                    icon={faBookOpen}
                                    label="Classes"
                                    description="Create and manage classes"
                                    routeName="ManageClasses"
                                    active={activeMainStackRouteName === 'ManageClasses'}
                                    onPress={() => props.navigation.navigate('MainStack', { screen: 'ManageClasses' })}
                                />
                                <DrawerItem
                                    icon={faChartLine}
                                    label="Dashboard"
                                    description="Monitor school activity"
                                    routeName="Dashboard"
                                    active={activeMainStackRouteName === 'Dashboard'}
                                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Dashboard' })}
                                />
                            </>
                        )}
                    </>
                )}

                <SectionHeader title="Community" />
                <DrawerItem
                    icon={faBookOpen}
                    label="Resources"
                    description="View school resources"
                    routeName="Resources"
                    active={activeMainStackRouteName === 'Resources'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Resources' })}
                />
                <DrawerItem
                    icon={faPoll}
                    label="Polls"
                    description="Vote on school-wide polls"
                    routeName="Polls"
                    active={activeMainStackRouteName === 'Polls'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Polls' })}
                />

                <SectionHeader title="App" />
                <DrawerItem
                    icon={faGear}
                    label="Settings"
                    description="Adjust app settings and preferences"
                    routeName="Settings"
                    active={activeMainStackRouteName === 'Settings'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Settings' })}
                />
            </ScrollView>

            <View style={{ padding: 20, paddingBottom: 20 + insets.bottom, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder }}>
                <TouchableOpacity
                    onPress={async () => {
                        const { data: { user } } = await supabase.auth.getUser();

                        await supabase.auth.signOut();
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
                >
                    <View style={{ width: 24, alignItems: 'center', marginRight: 12 }}>
                        <FontAwesomeIcon icon={faRightFromBracket} size={18} color={theme.colors.error} />
                    </View>
                    <Text style={{ fontSize: 16, color: theme.colors.error, fontWeight: '600' }}>Sign Out</Text>
                </TouchableOpacity>
                <Text style={{ textAlign: 'center', fontSize: 10, color: theme.colors.placeholder, marginTop: 10 }}>v1.0.0</Text>
            </View>
        </View>
    );
};

export default CustomDrawerContent;
