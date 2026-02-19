import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, FlatList, RefreshControl, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useToastActions } from '../../context/ToastContext';
import { getAvatarUrl } from '../../lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faFootballBall, faUserFriends, faBullhorn, faCalendarAlt,
    faChevronLeft, faClock, faUser, faInfoCircle, faPlus,
    faCheckCircle, faPen, faTrash, faMinus, faSignOutAlt, faSpinner, faChevronRight, faBookOpen
} from '@fortawesome/free-solid-svg-icons';
import CardSkeleton from '../../components/skeletons/CardSkeleton';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../../services/authService';
import { getUserProfile, fetchUsersByIdsWithPreferences } from '../../services/userService';
import {
    fetchClassInfo,
    fetchClassMembers,
    fetchClassSchedules,
    removeMemberFromClass,
    updateClassMemberIds,
    addMemberToClass,
    fetchClassMembersIdsService
} from '../../services/classService';
import { fetchAnnouncements } from '../../services/announcementService';
import {
    fetchClubJoinRequests,
    sendNotification,
    markAsRead
} from '../../services/notificationService';

const { width } = Dimensions.get('window');

const ClubDetailScreen = ({ route, navigation }) => {
    const { clubId } = route.params;
    const { theme } = useTheme();
    const { showToast } = useToastActions();
    const insets = useSafeAreaInsets();

    const [clubData, setClubData] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null);
    const [announcements, setAnnouncements] = useState([]);
    const [members, setMembers] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('news');
    const [processingId, setProcessingId] = useState(null);
    const [isLeaving, setIsLeaving] = useState(false);

    const fetchClubDetails = useCallback(async () => {
        try {
            const authUser = await getCurrentUser();
            if (!authUser) return;

            const profile = await getUserProfile(authUser.id);
            setCurrentUserProfile(profile);

            const clubDetail = await fetchClassInfo(clubId);

            setClubData(clubDetail);

            const ann = await fetchAnnouncements(clubId);
            setAnnouncements(ann || []);

            const mem = await fetchClassMembers(clubId);

            if (profile?.role === 'student' && clubDetail.users?.length > (mem?.length || 0)) {
                const usersData = await fetchUsersByIdsWithPreferences(clubDetail.users);
                if (usersData) {
                    setMembers(usersData.map(u => ({ user_id: u.id, users: u })));
                } else {
                    setMembers(mem || []);
                }
            } else {
                setMembers(mem || []);
            }

            const sch = await fetchClassSchedules([clubId]);
            setSchedules(sch || []);

            const isCoord = profile?.role === 'admin' || clubDetail.teacher_id === authUser.id;
            if (isCoord) {
                const allReqs = await fetchClubJoinRequests(authUser.id);
                setRequests(allReqs?.filter(r => r.message.includes(clubDetail.name)) || []);
            }

        } catch (error) {
            console.error('Error fetching club details:', error);
            showToast('Failed to load club details.', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [clubId, showToast]);

    useEffect(() => {
        fetchClubDetails();
    }, [fetchClubDetails]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchClubDetails();
    }, [fetchClubDetails]);

    const handleLeaveClub = useCallback(async () => {
        Alert.alert(
            "Leave Club",
            `Are you sure you want to leave ${clubData?.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                        setIsLeaving(true);
                        try {
                            const authUser = await getCurrentUser();
                            if (!authUser) return;

                            await removeMemberFromClass(clubId, authUser.id);

                            const currentIds = await fetchClassMembersIdsService(clubId);
                            await updateClassMemberIds(clubId, currentIds);

                            showToast(`You have left ${clubData.name}`, 'success');
                            navigation.navigate('ClubList');
                        } catch (e) {
                            console.error(e);
                            showToast('Failed to leave club', 'error');
                        } finally {
                            setIsLeaving(false);
                        }
                    }
                }
            ]
        );
    }, [clubData, clubId, navigation, showToast]);

    const handleRequestAction = useCallback(async (request, accept) => {
        setProcessingId(request.id);
        try {
            if (accept) {
                await addMemberToClass({
                    class_id: clubId,
                    user_id: request.related_user_id,
                    school_id: currentUserProfile.school_id,
                    role: 'student'
                });

                const currentIds = await fetchClassMembersIdsService(clubId);
                await updateClassMemberIds(clubId, currentIds);

                await sendNotification({
                    user_id: request.related_user_id,
                    type: 'club_join_accepted',
                    title: 'Club Join Approved',
                    message: `Your request to join ${clubData.name} has been approved!`,
                    related_user_id: currentUserProfile.id
                });
            }

            await markAsRead(request.id);
            showToast(accept ? 'Member added!' : 'Request declined.', 'success');
            fetchClubDetails();
        } catch (e) {
            console.error(e);
            showToast('Failed to process request', 'error');
        } finally {
            setProcessingId(null);
        }
    }, [clubId, clubData, currentUserProfile, fetchClubDetails, showToast]);

    const isCoordinator = useMemo(() => currentUserProfile?.role === 'admin' || clubData?.teacher_id === currentUserProfile?.id, [currentUserProfile, clubData]);
    const isMember = useMemo(() => members.some(m => m.user_id === currentUserProfile?.id), [members, currentUserProfile]);

    const renderHeader = useCallback(() => (
        <LinearGradient
            colors={['#9333ea', '#4f46e5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroContainer}
        >
            <View style={styles.heroContent}>
                <View style={styles.heroHeaderRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHero}>
                        <FontAwesomeIcon icon={faChevronLeft} size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.heroActions}>
                        {isCoordinator ? (
                            <TouchableOpacity
                                style={styles.heroActionBtn}
                                onPress={() => navigation.navigate('CreateClub', { clubToEdit: clubData })}
                            >
                                <Text style={styles.heroActionBtnText}>MANAGE</Text>
                            </TouchableOpacity>
                        ) : isMember ? (
                            <TouchableOpacity
                                style={[styles.heroActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}
                                onPress={handleLeaveClub}
                                disabled={isLeaving}
                            >
                                {isLeaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.heroActionBtnText, { color: '#fca5a5' }]}>LEAVE</Text>}
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                <View style={styles.heroBody}>
                    <View style={styles.clubLogoBox}>
                        <View style={[styles.logoInner, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <Text style={styles.logoText}>{clubData?.name?.charAt(0)}</Text>
                        </View>
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.clubNameHero}>{clubData?.name}</Text>
                        <View style={styles.heroMetaRow}>
                            <View style={styles.heroBadge}>
                                <FontAwesomeIcon icon={faFootballBall} size={10} color="#fff" style={{ opacity: 0.7 }} />
                                <Text style={styles.heroBadgeText}>EXTRA-CURRICULAR</Text>
                            </View>
                            <View style={styles.heroBadge}>
                                <FontAwesomeIcon icon={faUserFriends} size={10} color="#fff" style={{ opacity: 0.7 }} />
                                <Text style={styles.heroBadgeText}>{members.length} MEMBERS</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.coordBox}>
                    <View style={styles.coordAvatarBox}>
                        <Image source={getAvatarUrl(clubData?.teacher?.avatar_url, clubData?.teacher?.email, clubData?.teacher?.id)} style={styles.coordAvatar} />
                    </View>
                    <View style={{ marginLeft: 10 }}>
                        <Text style={styles.coordLabel}>COORDINATOR</Text>
                        <Text style={styles.coordName}>{clubData?.teacher?.full_name || 'Unassigned'}</Text>
                    </View>
                </View>
            </View>
        </LinearGradient>
    ), [isCoordinator, isMember, clubData, members, navigation, handleLeaveClub, isLeaving]);

    const renderTabs = useCallback(() => (
        <View style={[styles.tabBar, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderBottomWidth: 1 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {[
                    { id: 'news', label: 'News', icon: faBullhorn },
                    { id: 'lessons', label: 'Lessons', icon: faBookOpen },
                    { id: 'members', label: 'Members', icon: faUserFriends },
                    { id: 'calendar', label: 'Calendar', icon: faCalendarAlt },
                    ...(isCoordinator ? [{ id: 'requests', label: 'Requests', icon: faPlus }] : [])
                ].map(tab => (
                    <TouchableOpacity
                        key={tab.id}
                        onPress={() => setActiveTab(tab.id)}
                        style={[styles.tab, activeTab === tab.id && { borderBottomColor: '#AF52DE', borderBottomWidth: 2 }]}
                    >
                        <FontAwesomeIcon icon={tab.icon} size={14} color={activeTab === tab.id ? '#AF52DE' : theme.colors.placeholder} />
                        <Text style={[styles.tabLabel, { color: activeTab === tab.id ? '#AF52DE' : theme.colors.placeholder }]}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    ), [isCoordinator, activeTab, theme.colors]);

    const renderContent = useCallback(() => {
        if (loading) return <View style={{ padding: 20 }}><CardSkeleton /></View>;

        switch (activeTab) {
            case 'news':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.tabHeaderRow}>
                            <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Updates & Announcements</Text>
                            {isCoordinator && (
                                <TouchableOpacity
                                    style={[styles.addButton, { backgroundColor: '#AF52DE' }]}
                                    onPress={() => navigation.navigate('CreateAnnouncement', { classId: clubId })}
                                >
                                    <FontAwesomeIcon icon={faPlus} size={12} color="white" />
                                </TouchableOpacity>
                            )}
                        </View>
                        {announcements.length === 0 ? (
                            <View style={styles.emptyContent}>
                                <FontAwesomeIcon icon={faBullhorn} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No announcements yet.</Text>
                            </View>
                        ) : (
                            announcements.map(item => (
                                <View key={item.id} style={[styles.annCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                    <Text style={[styles.annTitle, { color: theme.colors.text }]}>{item.title}</Text>
                                    <Text style={[styles.annBody, { color: theme.colors.text }]} numberOfLines={3}>{item.message}</Text>
                                    <View style={[styles.annDivider, { backgroundColor: theme.colors.cardBorder, opacity: 0.3 }]} />
                                    <View style={styles.annFooter}>
                                        <View style={styles.annAuthorRow}>
                                            <FontAwesomeIcon icon={faUser} size={10} color={theme.colors.placeholder} />
                                            <Text style={[styles.annAuthor, { color: theme.colors.placeholder }]}>{item.author?.full_name}</Text>
                                        </View>
                                        <Text style={[styles.annDate, { color: theme.colors.placeholder }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                );
            case 'members':
                return (
                    <View style={styles.tabContent}>
                        <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Member Roster ({members.length})</Text>
                        <View style={[styles.membersList, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            {members.map((item, idx) => (
                                <View key={item.id || item.user_id} style={[styles.memberItem, idx === members.length - 1 && { borderBottomWidth: 0 }, { borderBottomColor: theme.colors.cardBorder + '30' }]}>
                                    <View style={[styles.memberAvatarBox, { borderColor: theme.colors.cardBorder }]}>
                                        <Image
                                            source={getAvatarUrl(item.users?.avatar_url, item.users?.email, item.users?.id)}
                                            style={styles.memberAvatar}
                                        />
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={[styles.memberName, { color: theme.colors.text }]}>{item.users?.full_name}</Text>
                                        <Text style={[styles.memberRoleLabel, { color: theme.colors.placeholder }]}>{item.users?.role?.toUpperCase()}</Text>
                                    </View>
                                    <View style={[styles.memberBadgeSmall, { backgroundColor: '#34C75910' }]}>
                                        <Text style={{ color: '#34C759', fontSize: 9, fontWeight: '900' }}>MEMBER</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                );
            case 'calendar':
                return (
                    <View style={styles.tabContent}>
                        <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Meeting Schedule</Text>
                        {schedules.length === 0 ? (
                            <View style={styles.emptyContent}>
                                <FontAwesomeIcon icon={faCalendarAlt} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No meetings scheduled.</Text>
                            </View>
                        ) : (
                            schedules.map(session => (
                                <View key={session.id} style={[styles.scheduleItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                    <View style={[styles.dateBox, { backgroundColor: '#AF52DE15' }]}>
                                        <Text style={[styles.dateMonth, { color: '#AF52DE' }]}>
                                            {new Date(session.start_time).toLocaleString('default', { month: 'short' }).toUpperCase()}
                                        </Text>
                                        <Text style={[styles.dateDay, { color: '#AF52DE' }]}>{new Date(session.start_time).getDate()}</Text>
                                    </View>
                                    <View style={styles.scheduleInfo}>
                                        <Text style={[styles.scheduleTime, { color: theme.colors.text }]}>
                                            {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <Text style={[styles.scheduleLabel, { color: theme.colors.placeholder }]}>{session.class_info || 'Club Meeting'}</Text>
                                    </View>
                                    <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.cardBorder} />
                                </View>
                            ))
                        )}
                    </View>
                );
            case 'requests':
                return (
                    <View style={styles.tabContent}>
                        <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Join Requests ({requests.length})</Text>
                        {requests.length === 0 ? (
                            <View style={styles.emptyContent}>
                                <FontAwesomeIcon icon={faUserFriends} size={40} color={theme.colors.placeholder} style={{ opacity: 0.2 }} />
                                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No pending requests.</Text>
                            </View>
                        ) : (
                            requests.map(req => (
                                <View key={req.id} style={[styles.reqCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                    <View style={styles.reqTop}>
                                        <View style={[styles.memberAvatarBox, { borderColor: theme.colors.cardBorder }]}>
                                            <Image source={getAvatarUrl(req.sender?.avatar_url, req.sender?.email, req.sender?.id)} style={styles.memberAvatar} />
                                        </View>
                                        <View style={styles.reqInfo}>
                                            <Text style={[styles.memberName, { color: theme.colors.text }]}>{req.sender?.full_name}</Text>
                                            <Text style={[styles.memberRoleLabel, { color: theme.colors.placeholder }]}>{req.sender?.email}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.reqActions}>
                                        <TouchableOpacity
                                            style={[styles.reqBtn, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                                            onPress={() => handleRequestAction(req, false)}
                                            disabled={processingId === req.id}
                                        >
                                            <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 12 }}>DECLINE</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.reqBtn, { backgroundColor: '#10b981' }]}
                                            onPress={() => handleRequestAction(req, true)}
                                            disabled={processingId === req.id}
                                        >
                                            {processingId === req.id ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: '900', fontSize: 12 }}>APPROVE</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                );
            case 'lessons':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.tabHeaderRow}>
                            <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Learning Path</Text>
                            <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: '#4f46e5' }]}
                                onPress={() => navigation.navigate('LessonPlans', { classId: clubId, className: clubData?.name, role: currentUserProfile?.role })}
                            >
                                <FontAwesomeIcon icon={faChevronRight} size={12} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.annCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <Text style={[styles.annTitle, { color: theme.colors.text }]}>Curriculum Timeline</Text>
                            <Text style={[styles.annBody, { color: theme.colors.text }]}>View all scheduled lessons, objectives, and resources for this class.</Text>
                            <TouchableOpacity
                                style={{ marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                                onPress={() => navigation.navigate('LessonPlans', { classId: clubId, className: clubData?.name, role: currentUserProfile?.role })}
                            >
                                <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 13 }}>VIEW FULL TIMELINE</Text>
                                <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    }, [loading, activeTab, theme, isCoordinator, navigation, clubId, announcements, members, schedules, requests, processingId, handleRequestAction]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AF52DE" />}
            >
                {renderHeader()}
                {renderTabs()}
                {renderContent()}
            </ScrollView>
        </View>
    );
}

export default React.memo(ClubDetailScreen);

const styles = StyleSheet.create({
    container: { flex: 1 },
    heroContainer: {
        padding: 24,
        paddingTop: 40,
        elevation: 0,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
    },
    heroContent: {
        width: '100%',
    },
    heroHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButtonHero: { padding: 4 },
    heroActions: { flexDirection: 'row', gap: 8 },
    heroActionBtn: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    heroActionBtnText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    heroBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    clubLogoBox: { width: 80, height: 80, borderRadius: 24, padding: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
    logoInner: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: 36, fontWeight: '900', color: '#fff' },
    clubNameHero: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
    heroMetaRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    heroBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginLeft: 6 },
    coordBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
    },
    coordAvatarBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    coordAvatar: { width: '100%', height: '100%' },
    coordLabel: { fontSize: 8, fontWeight: '900', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
    coordName: { fontSize: 13, fontWeight: '700', color: '#fff' },

    tabBar: { marginTop: 12 },
    tab: { paddingVertical: 16, marginRight: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
    tabLabel: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

    tabContent: { padding: 20 },
    tabHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    tabTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
    addButton: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    annCard: { padding: 20, borderRadius: 24, marginBottom: 16 },
    annTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
    annBody: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
    annDivider: { height: 1, marginVertical: 16 },
    annFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    annAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    annAuthor: { fontSize: 11, fontWeight: '700' },
    annDate: { fontSize: 11, fontWeight: '600' },

    membersList: { borderRadius: 24, overflow: 'hidden' },
    memberItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    memberAvatarBox: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
    memberAvatar: { width: '100%', height: '100%' },
    memberInfo: { flex: 1, marginLeft: 16 },
    memberName: { fontSize: 15, fontWeight: '800' },
    memberRoleLabel: { fontSize: 9, fontWeight: '900', marginTop: 2, letterSpacing: 1 },
    memberBadgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

    scheduleItem: { flexDirection: 'row', padding: 16, borderRadius: 24, marginBottom: 12, alignItems: 'center' },
    dateBox: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    dateMonth: { fontSize: 9, fontWeight: '900' },
    dateDay: { fontSize: 20, fontWeight: '900', marginTop: -2 },
    scheduleInfo: { flex: 1, marginLeft: 16 },
    scheduleTime: { fontSize: 14, fontWeight: '800' },
    scheduleLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },

    reqCard: { padding: 20, borderRadius: 24, marginBottom: 16 },
    reqTop: { flexDirection: 'row', alignItems: 'center' },
    reqInfo: { flex: 1, marginLeft: 16 },
    reqActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
    reqBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    emptyContent: { padding: 40, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
    backButton: { position: 'absolute', left: 20, zIndex: 10, padding: 10 },
    headerCard: { paddingBottom: 24 },
    heroImage: { height: 140, width: '100%' },
    headerContent: { paddingHorizontal: 24, marginTop: -40 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    clubLogo: { width: 80, height: 80, borderRadius: 20, borderWidth: 4, padding: 4, elevation: 4 },
    headerActions: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
    manageButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, elevation: 2 },
    manageButtonText: { fontSize: 13, fontWeight: 'bold' },
    leaveButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    clubInfo: { marginTop: 16 },
    clubName: { fontSize: 28, fontWeight: '800' },
    coordinatorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    coordinatorLabel: { fontSize: 12 },
    coordinatorName: { fontSize: 12, fontWeight: 'bold' },
    tabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    memberRole: { fontSize: 12 },
    activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
});