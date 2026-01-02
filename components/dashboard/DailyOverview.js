import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faChevronRight,
    faInfoCircle,
    faHandshake,
    faFootballBall,
    faChalkboardTeacher
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonPiece } from '../skeletons/DashboardScreenSkeleton';

const DailyOverview = ({ loading, todaySessions, navigation }) => {
    const { theme } = useTheme();

    const renderTodaySchedule = () => {
        if (loading) {
            return [1, 2].map((i) => (
                <View key={i} style={[styles.sessionItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                    <SkeletonPiece style={{ width: '100%', height: 40, borderRadius: 8 }} />
                </View>
            ));
        }

        if (!todaySessions || todaySessions.length === 0) return (
            <View style={[styles.emptyWidget, { backgroundColor: theme.colors.card }]}>
                <FontAwesomeIcon icon={faInfoCircle} size={24} color={theme.colors.placeholder} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No classes scheduled for today.</Text>
            </View>
        );

        return todaySessions.map((session) => {
            const start = new Date(session.start_time);
            const end = new Date(session.end_time);
            const isNow = new Date() >= start && new Date() <= end;
            const isMeeting = session.eventType === 'meeting';
            const isClub = session.class?.subject === 'Extracurricular';

            return (
                <TouchableOpacity
                    key={session.id}
                    onPress={() => isMeeting ? navigation.navigate('Meetings') : isClub ? navigation.navigate('ClubDetail', { clubId: session.class?.id }) : navigation.navigate('Calendar', { openScheduleId: session.id, selectedDate: session.start_time })}
                    activeOpacity={isMeeting || isClub ? 0.7 : 1}
                    style={[
                        styles.sessionItem,
                        { backgroundColor: theme.colors.card, borderColor: isNow ? theme.colors.primary : isMeeting ? theme.colors.warning + '40' : isClub ? '#AF52DE40' : theme.colors.cardBorder }
                    ]}
                >
                    <View style={styles.sessionHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.sessionClassName, { color: theme.colors.text }]}>
                                {isMeeting ? session.title : session.class?.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                <FontAwesomeIcon
                                    icon={isMeeting ? faHandshake : isClub ? faFootballBall : faChalkboardTeacher}
                                    size={10}
                                    color={isMeeting ? theme.colors.warning : isClub ? '#AF52DE' : theme.colors.placeholder}
                                />
                                <Text style={[styles.sessionType, { color: isMeeting ? theme.colors.warning : isClub ? '#AF52DE' : theme.colors.placeholder, marginLeft: 4 }]}>
                                    {isMeeting ? 'Parent-Teacher Meeting' : isClub ? 'Club Meeting' : (session.type || 'Lecture')}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.sessionTimeContainer}>
                            <Text style={[styles.sessionStartTime, { color: isMeeting ? theme.colors.warning : isClub ? '#AF52DE' : theme.colors.primary }]}>
                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                    {isNow && (
                        <View style={[styles.liveBadge, { backgroundColor: '#FF3B30' }]}>
                            <Text style={styles.liveBadgeText}>LIVE</Text>
                        </View>
                    )}
                </TouchableOpacity>
            );
        });
    };

    return (
        <View style={styles.container}>
            {/* Today's Schedule */}
            <View style={styles.fullSection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Schedule</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Calendar')} activeOpacity={0.7}>
                        <View style={[styles.viewAllBtn, { backgroundColor: theme.colors.primary + '10' }]}>
                            <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.primary} />
                        </View>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.miniDescription, { color: theme.colors.placeholder }]}>TODAY'S CLASSES</Text>
                {renderTodaySchedule()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 32,
    },
    fullSection: {
        width: '100%',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    viewAllBtn: {
        width: 24,
        height: 24,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniDescription: {
        fontSize: 9,
        fontWeight: '900',
        marginBottom: 16,
        letterSpacing: 1,
    },
    sessionItem: {
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 8,
        position: 'relative',
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sessionClassName: {
        fontSize: 13,
        fontWeight: '800',
    },
    sessionType: {
        fontSize: 9,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    sessionTimeContainer: {
        marginLeft: 4,
    },
    sessionStartTime: {
        fontSize: 11,
        fontWeight: '900',
    },
    liveBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#fff',
    },
    liveBadgeText: {
        color: 'white',
        fontSize: 7,
        fontWeight: '900',
    },
    emptyWidget: {
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    emptyText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 8,
        textAlign: 'center',
    },
    clubActionBtn: {
        padding: 12,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clubIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    clubBtnText: {
        fontSize: 12,
        fontWeight: '800',
    },
});

export default DailyOverview;
