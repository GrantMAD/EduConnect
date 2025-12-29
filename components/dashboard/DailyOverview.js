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
        <View style={styles.rowWidgets}>
            {/* Today's Schedule */}
            <View style={styles.halfSection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Schedule</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
                        <FontAwesomeIcon icon={faChevronRight} size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.miniDescription, { color: theme.colors.placeholder }]}>View your classes & clubs.</Text>
                {renderTodaySchedule()}
            </View>

            {/* Clubs Widget */}
            <View style={styles.halfSection}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Clubs</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('ClubList')}>
                        <FontAwesomeIcon icon={faChevronRight} size={14} color="#AF52DE" />
                    </TouchableOpacity>
                </View>
                <Text style={[styles.miniDescription, { color: theme.colors.placeholder }]}>Groups & teams.</Text>
                <TouchableOpacity
                    style={[styles.actionButton, { width: '100%', margin: 0, backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, paddingVertical: 12 }]}
                    onPress={() => navigation.navigate('ClubList')}
                >
                    <FontAwesomeIcon icon={faFootballBall} size={18} color="#AF52DE" />
                    <Text style={[styles.actionButtonText, { color: theme.colors.text, fontSize: 12 }]}>Explore Clubs</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    rowWidgets: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    halfSection: {
        width: '48%',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    miniDescription: {
        fontSize: 11,
        marginBottom: 12,
        marginTop: -8,
    },
    sessionItem: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
        position: 'relative',
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sessionClassName: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    sessionType: {
        fontSize: 10,
    },
    sessionTimeContainer: {
        marginLeft: 4,
    },
    sessionStartTime: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    liveBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    liveBadgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    emptyWidget: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    emptyText: {
        fontSize: 10,
        marginTop: 8,
        textAlign: 'center',
    },
    actionButton: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default DailyOverview;
