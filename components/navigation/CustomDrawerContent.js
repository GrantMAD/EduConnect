import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faHome,
    faUser,
    faChild,
    faBookOpen,
    faPoll,
    faGear,
    faRightFromBracket,
    faStore,
    faHandshake,
    faFootballBall,
    faSearch,
    faFileSignature
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useGamification } from '../../context/GamificationContext';
import { usePushNotification } from '../../context/PushNotificationContext';
import { BORDER_STYLES } from '../../constants/GamificationStyles';
import AnimatedAvatarBorder from '../AnimatedAvatarBorder';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services
import { signOut as signOutService } from '../../services/authService';

const defaultUserImage = require('../../assets/user.png');

/* ----------------------------- Drawer Item ----------------------------- */
const DrawerItem = React.memo(
    ({ icon, label, description, onPress, active, color, theme }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
                marginHorizontal: 12,
                marginBottom: 8,
                backgroundColor: active ? color + '15' : 'transparent',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: active ? color + '30' : 'transparent'
            }}
            activeOpacity={0.7}
        >
            <View
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    backgroundColor: active ? color + '15' : color + '08',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12
                }}
            >
                <FontAwesomeIcon icon={icon} size={16} color={active ? color : color + 'bb'} />
            </View>

            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        fontSize: 14,
                        color: active ? color : theme.colors.text,
                        fontWeight: active ? '900' : '700'
                    }}
                >
                    {label}
                </Text>
                {description && (
                    <Text
                        style={{
                            fontSize: 10,
                            color: theme.colors.placeholder,
                            fontWeight: '600',
                            marginTop: 2
                        }}
                    >
                        {description.toUpperCase()}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    )
);

/* --------------------------- Section Header ---------------------------- */
const SectionHeader = React.memo(({ title }) => (
    <Text
        style={{
            fontSize: 10,
            fontWeight: '900',
            color: '#94a3b8',
            marginTop: 24,
            marginBottom: 12,
            marginLeft: 28,
            textTransform: 'uppercase',
            letterSpacing: 1.5
        }}
    >
        {title}
    </Text>
));

/* ------------------------- Main Drawer Content ------------------------- */
const CustomDrawerContent = React.memo((props) => {
    const { profile, loading: authLoading } = useAuth();
    const [profileCompletion, setProfileCompletion] = useState(0);
    const [signingOut, setSigningOut] = useState(false);
    const { theme } = useTheme();
    const { equippedItem } = useGamification();
    const { clearPushToken } = usePushNotification();
    const insets = useSafeAreaInsets();

    const calculateProfileCompletion = useCallback((p) => {
        let completed = 0;
        const fields = [p?.full_name, p?.avatar_url, p?.number, p?.school_id];
        fields.forEach((field) => field && (completed += 25));
        return completed;
    }, []);

    const mainStackState = props.state.routes.find(
        (route) => route.name === 'MainStack'
    )?.state;

    const activeMainStackRouteName =
        mainStackState?.routes[mainStackState.index]?.name;

    useEffect(() => {
        if (profile) {
            setProfileCompletion(calculateProfileCompletion(profile));
        }
    }, [profile, calculateProfileCompletion]);

    if (authLoading && !profile) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingTop: 70,
                    backgroundColor: theme.colors.background
                }}
            >
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const userName = profile?.full_name || 'Member';
    const userEmail = profile?.email || '';
    const userRole = profile?.role || 'GUEST';
    const userAvatar = profile?.avatar_url;

    return (
        <View style={{ flex: 1, paddingTop: 60, backgroundColor: theme.colors.background }}>
            {/* HEADER */}
            <View
                style={{
                    paddingHorizontal: 24,
                    paddingBottom: 24,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.cardBorder
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AnimatedAvatarBorder
                        avatarSource={userAvatar ? { uri: userAvatar } : defaultUserImage}
                        size={64}
                        borderStyle={
                            equippedItem
                                ? BORDER_STYLES[equippedItem.image_url]
                                : { borderWidth: 1, borderColor: theme.colors.cardBorder }
                        }
                        isRainbow={!!BORDER_STYLES[equippedItem?.image_url]?.rainbow}
                        isAnimated={!!BORDER_STYLES[equippedItem?.image_url]?.animated}
                    />
                    <View style={{ marginLeft: 16, flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text }}>
                            {userName}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.placeholder }}>
                            {userEmail}
                        </Text>
                    </View>
                </View>
            </View>

            {/* CONTENT */}
            <ScrollView showsVerticalScrollIndicator={false}>
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
                        <Text style={{ color: theme.colors.placeholder, fontSize: 14, fontWeight: '700', flex: 1 }}>Search Platform...</Text>
                        <View style={{ backgroundColor: theme.colors.placeholder + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.cardBorder }}>
                            <Text style={{ color: theme.colors.placeholder, fontSize: 10, fontWeight: '900' }}>CTRL+K</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <SectionHeader title="Portal" />
                <DrawerItem
                    icon={faHome}
                    label="Dashboard"
                    theme={theme}
                    active={activeMainStackRouteName === 'HomeTabs'}
                    onPress={() =>
                        props.navigation.navigate('MainStack', { screen: 'HomeTabs' })
                    }
                    color="#4f46e5"
                />
                <DrawerItem
                    icon={faUser}
                    label="User Profile"
                    description="Personal data & settings"
                    theme={theme}
                    active={activeMainStackRouteName === 'Profile'}
                    onPress={() =>
                        props.navigation.navigate('MainStack', { screen: 'Profile' })
                    }
                    color="#06b6d4"
                />

                {(userRole === 'parent' || userRole === 'student' || ['admin', 'teacher'].includes(userRole)) && (
                    <>
                        <SectionHeader title="Management" />
                        {userRole === 'parent' && (
                            <DrawerItem
                                icon={faChild}
                                label="My Children"
                                description="Performance tracking"
                                theme={theme}
                                active={activeMainStackRouteName === 'MyChildren'}
                                onPress={() =>
                                    props.navigation.navigate('MainStack', { screen: 'MyChildren' })
                                }
                                color="#f59e0b"
                            />
                        )}
                        <DrawerItem
                            icon={faHandshake}
                            label="Appointments"
                            description="Teacher-Parent meetings"
                            theme={theme}
                            active={activeMainStackRouteName === 'Meetings'}
                            onPress={() =>
                                props.navigation.navigate('MainStack', { screen: 'Meetings' })
                            }
                            color="#10b981"
                        />
                        {['admin', 'teacher'].includes(userRole) && (
                            <>
                                <DrawerItem
                                    icon={faBookOpen}
                                    label="Academic Hub"
                                    description="Manage class rosters"
                                    theme={theme}
                                    active={activeMainStackRouteName === 'ManageClasses'}
                                    onPress={() =>
                                        props.navigation.navigate('MainStack', { screen: 'ManageClasses' })
                                    }
                                    color="#8b5cf6"
                                />
                                <DrawerItem
                                    icon={faGear}
                                    label="Management Center"
                                    description="School administration"
                                    theme={theme}
                                    active={activeMainStackRouteName === 'Management'}
                                    onPress={() =>
                                        props.navigation.navigate('MainStack', { screen: 'Management' })
                                    }
                                    color="#4f46e5"
                                />
                            </>
                        )}
                    </>
                )}

                <SectionHeader title="Community" />
                <DrawerItem
                    icon={faFootballBall}
                    label="Clubs & Teams"
                    description="Extra-curricular"
                    theme={theme}
                    active={activeMainStackRouteName === 'ClubList'}
                    onPress={() =>
                        props.navigation.navigate('MainStack', { screen: 'ClubList' })
                    }
                    color="#e11d48"
                />
                <DrawerItem
                    icon={faStore}
                    label="Marketplace"
                    description="Trade school supplies"
                    theme={theme}
                    active={activeMainStackRouteName === 'Market'}
                    onPress={() =>
                        props.navigation.navigate('MainStack', { screen: 'Market' })
                    }
                    color="#db2777"
                />
                <DrawerItem
                    icon={faBookOpen}
                    label="Resources"
                    description="Academic materials"
                    theme={theme}
                    active={activeMainStackRouteName === 'Resources'}
                    onPress={() =>
                        props.navigation.navigate('MainStack', { screen: 'Resources' })
                    }
                    color="#2563eb"
                />
                <DrawerItem
                    icon={faPoll}
                    label="Polls"
                    description="Vote on proposals"
                    theme={theme}
                    active={activeMainStackRouteName === 'Polls'}
                    onPress={() =>
                        props.navigation.navigate('MainStack', { screen: 'Polls' })
                    }
                    color="#f59e0b"
                />

                {userRole !== 'parent' && (
                    <DrawerItem
                        icon={faFileSignature}
                        label={['admin', 'teacher'].includes(userRole) ? "Exams" : "My Exams"}
                        description={['admin', 'teacher'].includes(userRole) ? "Schedule & Staff" : "Hall ticket"}
                        theme={theme}
                        active={activeMainStackRouteName === (['admin', 'teacher'].includes(userRole) ? 'ExamManagement' : 'MyExams')}
                        onPress={() =>
                            props.navigation.navigate('MainStack', { screen: (['admin', 'teacher'].includes(userRole) ? 'ExamManagement' : 'MyExams') })
                        }
                        color="#0d9488"
                    />
                )}

                <SectionHeader title="System" />
                <DrawerItem
                    icon={faGear}
                    label="Settings"
                    description="App preferences"
                    theme={theme}
                    active={activeMainStackRouteName === 'Settings'}
                    onPress={() =>
                        props.navigation.navigate('MainStack', { screen: 'Settings' })
                    }
                    color="#64748b"
                />
            </ScrollView>

            {/* SIGN OUT */}
            <View
                style={{
                    padding: 20,
                    paddingBottom: 20 + insets.bottom,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.cardBorder
                }}
            >
                <TouchableOpacity
                    onPress={async () => {
                        setSigningOut(true);
                        await clearPushToken();
                        await signOutService();
                    }}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: 52,
                        paddingHorizontal: 16,
                        borderRadius: 16,
                        backgroundColor: theme.colors.error + '10'
                    }}
                >
                    <FontAwesomeIcon icon={faRightFromBracket} size={16} color={theme.colors.error} />
                    <Text
                        style={{
                            marginLeft: 12,
                            fontSize: 14,
                            color: theme.colors.error,
                            fontWeight: '900'
                        }}
                    >
                        SIGN OUT
                    </Text>
                </TouchableOpacity>
                <Text
                    style={{
                        textAlign: 'center',
                        fontSize: 10,
                        color: theme.colors.placeholder,
                        marginTop: 16,
                        fontWeight: '900',
                        letterSpacing: 1
                    }}
                >
                    CLASSCONNECT v1.0.0
                </Text>
            </View>
        </View>
    );
});

export default CustomDrawerContent;
