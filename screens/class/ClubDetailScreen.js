import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
    faFootballBall, faUserFriends, faBullhorn, faCalendarAlt, 
    faChevronLeft, faClock, faUser, faInfoCircle, faPlus, 
    faCheckCircle, faPen, faTrash, faMinus, faSignOutAlt, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import CardSkeleton from '../../components/skeletons/CardSkeleton';

const defaultUserImage = require('../../assets/user.png');

export default function ClubDetailScreen({ route, navigation }) {
    const { clubId } = route.params;
    const { theme } = useTheme();
    const { showToast } = useToast();
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

    const fetchClubDetails = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch user profile
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', user.id)
                .single();
            
            setCurrentUserProfile(profile);

            // Fetch Club Info
            const { data: club, error: clubError } = await supabase
                .from('classes')
                .select('*, teacher:users(id, full_name, email, avatar_url, role)')
                .eq('id', clubId)
                .single();

            if (clubError) throw clubError;
            setClubData(club);

            // Fetch Announcements
            const { data: ann } = await supabase
                .from('announcements')
                .select('*, author:users(full_name, email)')
                .eq('class_id', clubId)
                .order('created_at', { ascending: false });
            setAnnouncements(ann || []);

            // Fetch Members (with RLS Fallback)
            const { data: mem } = await supabase
                .from('class_members')
                .select('*, users(id, full_name, email, avatar_url, role)')
                .eq('class_id', clubId);
            
            if (profile?.role === 'student' && club.users?.length > (mem?.length || 0)) {
                const { data: usersData } = await supabase
                    .from('users')
                    .select('id, full_name, email, avatar_url, role')
                    .in('id', club.users);
                
                if (usersData) {
                    setMembers(usersData.map(u => ({ user_id: u.id, users: u })));
                } else {
                    setMembers(mem || []);
                }
            } else {
                setMembers(mem || []);
            }

            // Fetch Schedules
            const { data: sch } = await supabase
                .from('class_schedules')
                .select('*')
                .eq('class_id', clubId)
                .order('start_time', { ascending: true });
            setSchedules(sch || []);

            // Fetch Join Requests if Coordinator
            const isCoord = profile?.role === 'admin' || club.teacher_id === user.id;
            if (isCoord) {
                const { data: allReqs } = await supabase
                    .from('notifications')
                    .select('*, sender:users!related_user_id(id, full_name, email, avatar_url)')
                    .eq('type', 'club_join_request')
                    .eq('user_id', user.id)
                    .is('is_read', false);
                
                setRequests(allReqs?.filter(r => r.message.includes(club.name)) || []);
            }

        } catch (error) {
            console.error('Error fetching club details:', error);
            showToast('Failed to load club details.', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchClubDetails();
    }, [clubId]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchClubDetails();
    };

    const handleLeaveClub = async () => {
        Alert.alert(
            "Leave Club",
            `Are you sure you want to leave ${clubData.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Leave", 
                    style: "destructive",
                    onPress: async () => {
                        setIsLeaving(true);
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            const { error } = await supabase
                                .from('class_members')
                                .delete()
                                .eq('class_id', clubId)
                                .eq('user_id', user.id);

                            if (error) throw error;

                            // Sync users array
                            const { data: currentMembers } = await supabase.from('class_members').select('user_id').eq('class_id', clubId);
                            const currentIds = currentMembers?.map(m => m.user_id) || [];
                            await supabase.from('classes').update({ users: currentIds }).eq('id', clubId);

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
    };

    const handleRequestAction = async (request, accept) => {
        setProcessingId(request.id);
        try {
            if (accept) {
                const { error: joinError } = await supabase
                    .from('class_members')
                    .insert({
                        class_id: clubId,
                        user_id: request.related_user_id,
                        school_id: currentUserProfile.school_id,
                        role: 'student'
                    });
                if (joinError) throw joinError;

                // Sync users array
                const { data: currentMembers } = await supabase.from('class_members').select('user_id').eq('class_id', clubId);
                const currentIds = currentMembers?.map(m => m.user_id) || [];
                await supabase.from('classes').update({ users: currentIds }).eq('id', clubId);

                await supabase.from('notifications').insert({
                    user_id: request.related_user_id,
                    type: 'club_join_accepted',
                    title: 'Club Join Approved',
                    message: `Your request to join ${clubData.name} has been approved!`,
                    related_user_id: currentUserProfile.id
                });
            }

            await supabase.from('notifications').update({ is_read: true }).eq('id', request.id);
            showToast(accept ? 'Member added!' : 'Request declined.', 'success');
            fetchClubDetails();
        } catch (e) {
            console.error(e);
            showToast('Failed to process request', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const isCoordinator = currentUserProfile?.role === 'admin' || clubData?.teacher_id === currentUserProfile?.id;
    const isMember = members.some(m => m.user_id === currentUserProfile?.id);

    const renderHeader = () => (
        <View style={styles.headerCard}>
            <View style={[styles.heroImage, { backgroundColor: '#AF52DE' }]} />
            <View style={styles.headerContent}>
                <View style={styles.headerTop}>
                    <View style={[styles.clubLogo, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                        <View style={[styles.logoInner, { backgroundColor: '#AF52DE20' }]}>
                            <Text style={[styles.logoText, { color: '#AF52DE' }]}>{clubData?.name?.charAt(0)}</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        {isCoordinator ? (
                            <TouchableOpacity 
                                style={[styles.manageButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
                                onPress={() => navigation.navigate('CreateClub', { clubToEdit: clubData })}
                            >
                                <Text style={[styles.manageButtonText, { color: theme.colors.text }]}>Manage</Text>
                            </TouchableOpacity>
                        ) : isMember ? (
                            <TouchableOpacity 
                                style={[styles.leaveButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.error + '40' }]}
                                onPress={handleLeaveClub}
                                disabled={isLeaving}
                            >
                                {isLeaving ? <ActivityIndicator size="small" color={theme.colors.error} /> : <FontAwesomeIcon icon={faSignOutAlt} size={16} color={theme.colors.error} />}
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                <View style={styles.clubInfo}>
                    <Text style={[styles.clubName, { color: theme.colors.text }]}>{clubData?.name}</Text>
                    <View style={styles.coordinatorRow}>
                        <FontAwesomeIcon icon={faUser} size={12} color={theme.colors.placeholder} />
                        <Text style={[styles.coordinatorLabel, { color: theme.colors.placeholder }]}>Coordinator: </Text>
                        <Text style={[styles.coordinatorName, { color: theme.colors.primary }]}>{clubData?.teacher?.full_name}</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderTabs = () => (
        <View style={[styles.tabBar, { backgroundColor: theme.colors.surface }]}>
            {[
                { id: 'news', label: 'News', icon: faBullhorn },
                { id: 'members', label: 'Members', icon: faUserFriends },
                { id: 'calendar', label: 'Calendar', icon: faCalendarAlt },
                ...(isCoordinator ? [{ id: 'requests', label: 'Requests', icon: faPlus }] : [])
            ].map(tab => (
                <TouchableOpacity 
                    key={tab.id}
                    onPress={() => setActiveTab(tab.id)}
                    style={[styles.tab, activeTab === tab.id && { borderBottomColor: '#AF52DE', borderBottomWidth: 3 }]}
                >
                    <FontAwesomeIcon icon={tab.icon} size={16} color={activeTab === tab.id ? '#AF52DE' : theme.colors.placeholder} />
                    <Text style={[styles.tabLabel, { color: activeTab === tab.id ? '#AF52DE' : theme.colors.placeholder }]}>{tab.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderContent = () => {
        if (loading) return <View style={{ padding: 20 }}><CardSkeleton /></View>;

        switch (activeTab) {
            case 'news':
                return (
                    <View style={styles.tabContent}>
                        <View style={styles.tabHeader}>
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
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No announcements yet.</Text>
                        ) : (
                            announcements.map(item => (
                                <View key={item.id} style={[styles.annCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                                    <Text style={[styles.annTitle, { color: theme.colors.text }]}>{item.title}</Text>
                                    <Text style={[styles.annBody, { color: theme.colors.text }]}>{item.message}</Text>
                                    <View style={styles.annFooter}>
                                        <Text style={[styles.annDate, { color: theme.colors.placeholder }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
                                        <Text style={[styles.annAuthor, { color: theme.colors.placeholder }]}>By {item.author?.full_name}</Text>
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
                        {members.map(item => (
                            <View key={item.id || item.user_id} style={styles.memberItem}>
                                <Image 
                                    source={item.users?.avatar_url ? { uri: item.users.avatar_url } : defaultUserImage} 
                                    style={styles.memberAvatar} 
                                />
                                <View style={styles.memberInfo}>
                                    <Text style={[styles.memberName, { color: theme.colors.text }]}>{item.users?.full_name}</Text>
                                    <Text style={[styles.memberRole, { color: theme.colors.placeholder }]}>{item.users?.role}</Text>
                                </View>
                                <View style={[styles.activeBadge, { backgroundColor: '#34C75920' }]}>
                                    <Text style={{ color: '#34C759', fontSize: 10, fontWeight: 'bold' }}>ACTIVE</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                );
            case 'calendar':
                return (
                    <View style={styles.tabContent}>
                        <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Meeting Schedule</Text>
                        {schedules.length === 0 ? (
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No meetings scheduled.</Text>
                        ) : (
                            schedules.map(session => (
                                <View key={session.id} style={[styles.scheduleItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                                    <View style={[styles.dateBox, { backgroundColor: '#AF52DE20' }]}>
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
                            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No pending requests.</Text>
                        ) : (
                            requests.map(req => (
                                <View key={req.id} style={[styles.reqCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                                    <View style={styles.reqTop}>
                                        <Image source={req.sender?.avatar_url ? { uri: req.sender.avatar_url } : defaultUserImage} style={styles.memberAvatar} />
                                        <View style={styles.reqInfo}>
                                            <Text style={[styles.memberName, { color: theme.colors.text }]}>{req.sender?.full_name}</Text>
                                            <Text style={[styles.memberRole, { color: theme.colors.placeholder }]}>{req.sender?.email}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.reqActions}>
                                        <TouchableOpacity 
                                            style={[styles.reqBtn, { backgroundColor: theme.colors.error + '10' }]}
                                            onPress={() => handleRequestAction(req, false)}
                                            disabled={processingId === req.id}
                                        >
                                            <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>Decline</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.reqBtn, { backgroundColor: '#34C759' }]}
                                            onPress={() => handleRequestAction(req, true)}
                                            disabled={processingId === req.id}
                                        >
                                            {processingId === req.id ? <ActivityIndicator size="small" color="white" /> : <Text style={{ color: 'white', fontWeight: 'bold' }}>Approve</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                );
        }
    };

    return (
        <ScrollView 
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#AF52DE" />}
        >
            <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { marginTop: insets.top + 10 }]}>
                <FontAwesomeIcon icon={faChevronLeft} size={20} color="white" />
            </TouchableOpacity>
            
            {renderHeader()}
            {renderTabs()}
            {renderContent()}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backButton: { position: 'absolute', left: 20, zIndex: 10, padding: 10 },
    headerCard: { paddingBottom: 24 },
    heroImage: { height: 140, width: '100%' },
    headerContent: { paddingHorizontal: 24, marginTop: -40 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    clubLogo: { width: 80, height: 80, borderRadius: 20, borderWidth: 4, padding: 4, elevation: 4 },
    logoInner: { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: 32, fontWeight: '900' },
    headerActions: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
    manageButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, elevation: 2 },
    manageButtonText: { fontSize: 13, fontWeight: 'bold' },
    leaveButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    clubInfo: { marginTop: 16 },
    clubName: { fontSize: 28, fontWeight: '800' },
    coordinatorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    coordinatorLabel: { fontSize: 12 },
    coordinatorName: { fontSize: 12, fontWeight: 'bold' },
    tabBar: { flexDirection: 'row', marginTop: 24, paddingHorizontal: 10 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', gap: 4 },
    tabLabel: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
    tabContent: { padding: 24 },
    tabHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    tabTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    addButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    annCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    annTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    annBody: { fontSize: 14, lineHeight: 20, opacity: 0.8 },
    annFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    annDate: { fontSize: 11 },
    annAuthor: { fontSize: 11, fontStyle: 'italic' },
    memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
    memberAvatar: { width: 44, height: 44, borderRadius: 12 },
    memberInfo: { flex: 1, marginLeft: 12 },
    memberName: { fontSize: 15, fontWeight: 'bold' },
    memberRole: { fontSize: 12 },
    activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    scheduleItem: { flexDirection: 'row', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12, alignItems: 'center' },
    dateBox: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    dateMonth: { fontSize: 10, fontWeight: '900' },
    dateDay: { fontSize: 18, fontWeight: '900' },
    scheduleInfo: { marginLeft: 16 },
    scheduleTime: { fontSize: 14, fontWeight: 'bold' },
    scheduleLabel: { fontSize: 12 },
    reqCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    reqTop: { flexDirection: 'row', alignItems: 'center' },
    reqInfo: { flex: 1, marginLeft: 12 },
    reqActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
    reqBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
    emptyText: { textAlign: 'center', marginTop: 20, fontStyle: 'italic' }
});
