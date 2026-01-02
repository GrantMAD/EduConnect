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
    faChartLine,
    faStore,
    faHandshake,
    faFootballBall,
    faSearch
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useGamification } from '../../context/GamificationContext';
import { usePushNotification } from '../../context/PushNotificationContext';
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
    const [signingOut, setSigningOut] = useState(false);
    const { theme } = useTheme();
    const { equippedItem } = useGamification();
    const { clearPushToken } = usePushNotification();

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
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginHorizontal: 12,
                marginBottom: 8,
                backgroundColor: active ? theme.colors.primary + '10' : 'transparent',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: active ? theme.colors.primary + '30' : 'transparent',
            }}
            activeOpacity={0.7}
        >
            <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: active ? theme.colors.primary + '15' : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <FontAwesomeIcon icon={icon} size={16} color={active ? theme.colors.primary : theme.colors.placeholder} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? '900' : '700' }}>{label}</Text>
                {description && <Text style={{ fontSize: 10, color: theme.colors.placeholder, fontWeight: '600', marginTop: 2 }}>{description.toUpperCase()}</Text>}
            </View>
        </TouchableOpacity>
    );

    const SectionHeader = ({ title }) => (
        <Text style={{
            fontSize: 10,
            fontWeight: '900',
            color: '#94a3b8',
            marginTop: 24,
            marginBottom: 12,
            marginLeft: 28,
            textTransform: 'uppercase',
            letterSpacing: 1.5
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
                            size={64}
                            borderStyle={equippedItem ? BORDER_STYLES[equippedItem.image_url] : { borderWidth: 1, borderColor: theme.colors.cardBorder }}
                            isRainbow={equippedItem && BORDER_STYLES[equippedItem.image_url]?.rainbow}
                            isAnimated={equippedItem && BORDER_STYLES[equippedItem.image_url]?.animated}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text, letterSpacing: -0.5 }} numberOfLines={1}>{userName || 'Member'}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.placeholder, marginTop: 2 }} numberOfLines={1}>{userEmail || ''}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <View style={{ backgroundColor: theme.colors.primary + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ fontSize: 9, color: theme.colors.primary, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    {userRole || 'GUEST'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Search Bar Button */}
                <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 8 }}>
                    <TouchableOpacity
                        onPress={() => props.navigation.navigate('MainStack', { screen: 'Search' })}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: theme.colors.card,
                            height: 52,
                            paddingHorizontal: 16,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: theme.colors.cardBorder,
                        }}
                        activeOpacity={0.7}
                    >
                        <FontAwesomeIcon icon={faSearch} size={14} color={theme.colors.placeholder} style={{ marginRight: 12 }} />
                        <Text style={{ color: theme.colors.placeholder, fontSize: 14, fontWeight: '700' }}>Search Platform...</Text>
                    </TouchableOpacity>
                </View>

                <SectionHeader title="Portal" />
                <DrawerItem
                    icon={faHome}
                    label="Dashboard"
                    routeName="HomeTabs"
                    active={activeMainStackRouteName === 'HomeTabs'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'HomeTabs' })}
                />
                <DrawerItem
                    icon={faUser}
                    label="User Profile"
                    description="Personal data & settings"
                    routeName="Profile"
                    active={activeMainStackRouteName === 'Profile'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Profile' })}
                />

                {(userRole === 'parent' || userRole === 'student' || ['admin', 'teacher'].includes(userRole)) && (
                    <>
                        <SectionHeader title="Management" />
                        {userRole === 'parent' && (
                            <DrawerItem
                                icon={faChild}
                                label="My Children"
                                description="Performance tracking"
                                routeName="MyChildren"
                                active={activeMainStackRouteName === 'MyChildren'}
                                onPress={() => props.navigation.navigate('MainStack', { screen: 'MyChildren' })}
                            />
                        )}
                        <DrawerItem
                            icon={faHandshake}
                            label="Appointments"
                            description="Teacher-Parent meetings"
                            routeName="Meetings"
                            active={activeMainStackRouteName === 'Meetings'}
                            onPress={() => props.navigation.navigate('MainStack', { screen: 'Meetings' })}
                        />
                        {['admin', 'teacher'].includes(userRole) && (
                            <DrawerItem
                                icon={faBookOpen}
                                label="Academic Hub"
                                description="Manage class rosters"
                                routeName="ManageClasses"
                                active={activeMainStackRouteName === 'ManageClasses'}
                                onPress={() => props.navigation.navigate('MainStack', { screen: 'ManageClasses' })}
                            />
                        )}
                    </>
                )}

                <SectionHeader title="Community" />
                <DrawerItem
                    icon={faFootballBall}
                    label="Clubs & Teams"
                    description="Extra-curricular"
                    routeName="ClubList"
                    active={activeMainStackRouteName === 'ClubList'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'ClubList' })}
                />
                <DrawerItem
                    icon={faStore}
                    label="Marketplace"
                    description="Trade school supplies"
                    routeName="Market"
                    active={activeMainStackRouteName === 'Market'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Market' })}
                />
                <DrawerItem
                    icon={faBookOpen}
                    label="Resources"
                    description="Academic materials"
                    routeName="Resources"
                    active={activeMainStackRouteName === 'Resources'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Resources' })}
                />
                <DrawerItem
                    icon={faPoll}
                    label="Polls"
                    description="Vote on proposals"
                    routeName="Polls"
                    active={activeMainStackRouteName === 'Polls'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Polls' })}
                />

                <SectionHeader title="System" />
                <DrawerItem
                    icon={faGear}
                    label="Settings"
                    description="App preferences"
                    routeName="Settings"
                    active={activeMainStackRouteName === 'Settings'}
                    onPress={() => props.navigation.navigate('MainStack', { screen: 'Settings' })}
                />
            </ScrollView>

            <View style={{ padding: 20, paddingBottom: 20 + insets.bottom, borderTopWidth: 1, borderTopColor: theme.colors.cardBorder }}>
                <TouchableOpacity
                    onPress={async () => {
                        setSigningOut(true);
                        try {
                            await clearPushToken();
                            await supabase.auth.signOut();
                        } catch (error) {
                            console.error('Sign out error:', error);
                            setSigningOut(false);
                        }
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', height: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: theme.colors.error + '10' }}
                    disabled={signingOut}
                    activeOpacity={0.7}
                >
                    <View style={{ width: 32, alignItems: 'center', marginRight: 12 }}>
                        <FontAwesomeIcon icon={faRightFromBracket} size={16} color={theme.colors.error} />
                    </View>
                    {signingOut ? (
                        <ActivityIndicator size="small" color={theme.colors.error} />
                    ) : (
                        <Text style={{ fontSize: 14, color: theme.colors.error, fontWeight: '900', letterSpacing: 0.5 }}>SIGN OUT</Text>
                    )}
                </TouchableOpacity>
                <Text style={{ textAlign: 'center', fontSize: 10, color: theme.colors.placeholder, marginTop: 16, fontWeight: '900', letterSpacing: 1 }}>CLASSCONNECT v1.0.0</Text>
            </View>
        </View>
    );
};

export default CustomDrawerContent;
