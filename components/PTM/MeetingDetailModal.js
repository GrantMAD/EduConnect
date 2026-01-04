import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Linking,
  TouchableOpacity
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faUser,
  faVideo,
  faMapMarkerAlt,
  faPhone,
  faStickyNote,
  faUserGraduate,
  faEnvelope,
  faInfoCircle,
  faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import StandardBottomModal from '../StandardBottomModal';
import MeetingAgendaBrief from './MeetingAgendaBrief';

const defaultUserImage = require('../../assets/user.png');

const MeetingDetailModal = React.memo(({ isOpen, onClose, booking, isTeacher }) => {
  const { theme } = useTheme();
  if (!booking) return null;

  const startTime = new Date(booking.slot?.start_time);
  const endTime = new Date(booking.slot?.end_time);
  const otherParty = isTeacher ? booking.parent : booking.slot?.teacher;

  const getMeetingIcon = (type) => {
    switch (type) {
      case 'video': return faVideo;
      case 'phone': return faPhone;
      default: return faMapMarkerAlt;
    }
  };

  return (
    <StandardBottomModal
      visible={isOpen}
      onClose={onClose}
      title="Appointment Brief"
      icon={faInfoCircle}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time & Type Section */}
        <View style={[styles.timeBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.timeInfo}>
            <View style={[styles.meetingIconBox, { backgroundColor: theme.colors.primary + '15' }]}>
              <FontAwesomeIcon icon={getMeetingIcon(booking.slot?.meeting_type)} size={18} color={theme.colors.primary} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {startTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
              </Text>
              <Text style={[styles.timeText, { color: theme.colors.primary }]}>
                {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View style={[styles.formatBadge, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[styles.formatText, { color: theme.colors.primary }]}>
              {booking.slot?.meeting_type?.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Participants */}
        <Text style={[styles.sectionLabel, { color: '#94a3b8' }]}>CONVERSATION PARTNERS</Text>
        <View style={[styles.personCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <Image
            source={otherParty?.avatar_url ? { uri: otherParty.avatar_url } : defaultUserImage}
            style={styles.avatar}
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.personName, { color: theme.colors.text }]}>{otherParty?.full_name}</Text>
            <Text style={[styles.personRole, { color: theme.colors.placeholder }]}>{isTeacher ? 'PARENT REPRESENTATIVE' : 'ACADEMIC FACILITATOR'}</Text>
          </View>
        </View>

        <View style={[styles.personCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '10' }]}>
            <FontAwesomeIcon icon={faUserGraduate} size={14} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.personName, { color: theme.colors.text }]}>{booking.student?.full_name}</Text>
            <Text style={[styles.personRole, { color: theme.colors.placeholder }]}>STUDENT SUBJECT</Text>
          </View>
        </View>

        {/* Discussion Brief */}
        <MeetingAgendaBrief studentId={booking.student_id} isTeacher={isTeacher} />

        {/* Location */}
        <Text style={[styles.sectionLabel, { color: '#94a3b8', marginTop: 24 }]}>VENUE / CONNECTION</Text>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <View style={[styles.locationIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
            <FontAwesomeIcon icon={getMeetingIcon(booking.slot?.meeting_type)} color={theme.colors.primary} size={14} />
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            {booking.slot?.location ? (
              booking.slot?.meeting_type === 'video' ? (
                <TouchableOpacity onPress={() => Linking.openURL(booking.slot.location)} style={styles.linkRow} activeOpacity={0.7}>
                  <Text style={[styles.locationText, { color: theme.colors.primary }]}>JOIN DIGITAL SESSION</Text>
                  <FontAwesomeIcon icon={faExternalLinkAlt} size={10} color={theme.colors.primary} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ) : (
                <Text style={[styles.locationText, { color: theme.colors.text }]}>{booking.slot.location.toUpperCase()}</Text>
              )
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>LOCATING...</Text>
            )}
          </View>
        </View>

        {/* Notes */}
        {booking.notes && (
          <>
            <Text style={[styles.sectionLabel, { color: '#94a3b8' }]}>SUBMITTED AGENDA</Text>
            <View style={[styles.notesCard, { backgroundColor: '#f59e0b' + '10', borderColor: '#f59e0b' + '20', borderWidth: 1 }]}>
              <Text style={[styles.notesText, { color: theme.colors.text }]}>"{booking.notes}"</Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </StandardBottomModal>
  );
});

const styles = StyleSheet.create({
  content: { padding: 16 },
  timeBox: {
    padding: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32
  },
  timeInfo: { flexDirection: 'row', alignItems: 'center' },
  meetingIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dateText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  timeText: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  formatBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  formatText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  sectionLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 16, marginLeft: 4 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
    borderRadius: 24
  },
  avatar: { width: 44, height: 44, borderRadius: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  personRole: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginTop: 2 },
  personName: { fontSize: 15, fontWeight: '800' },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24
  },
  locationIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  emptyText: { fontSize: 12, fontWeight: '700' },
  notesCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 24,
  },
  notesText: { fontSize: 14, fontWeight: '600', fontStyle: 'italic', lineHeight: 22 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, elevation: 1 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  personEmail: { fontSize: 11 },
});

export default MeetingDetailModal;
