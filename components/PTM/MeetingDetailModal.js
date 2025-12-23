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

const defaultUserImage = require('../../assets/user.png');

export default function MeetingDetailModal({ isOpen, onClose, booking, isTeacher }) {
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
      title="Meeting Details"
      icon={faInfoCircle}
    >
      <ScrollView style={styles.content}>
        {/* Time & Type Section */}
        <View style={[styles.timeBox, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '20' }]}>
          <View style={styles.timeInfo}>
            <FontAwesomeIcon icon={getMeetingIcon(booking.slot?.meeting_type)} size={24} color={theme.colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.dateText, { color: theme.colors.text }]}>
                {startTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
              <Text style={[styles.timeText, { color: theme.colors.primary }]}>
                {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: theme.colors.cardBackground }]}>
            <Text style={[styles.badgeText, { color: theme.colors.placeholder }]}>
              {booking.slot?.meeting_type?.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Participants */}
        <Text style={[styles.sectionLabel, { color: theme.colors.placeholder }]}>PARTICIPANTS</Text>
        <View style={styles.personCard}>
          <Image
            source={otherParty?.avatar_url ? { uri: otherParty.avatar_url } : defaultUserImage}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.personRole, { color: theme.colors.placeholder }]}>{isTeacher ? 'PARENT' : 'TEACHER'}</Text>
            <Text style={[styles.personName, { color: theme.colors.text }]}>{otherParty?.full_name}</Text>
            <Text style={[styles.personEmail, { color: theme.colors.placeholder }]}>{otherParty?.email}</Text>
          </View>
        </View>

        <View style={styles.personCard}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '15' }]}>
            <FontAwesomeIcon icon={faUserGraduate} size={16} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.personRole, { color: theme.colors.placeholder }]}>STUDENT</Text>
            <Text style={[styles.personName, { color: theme.colors.text }]}>{booking.student?.full_name}</Text>
          </View>
        </View>

        {/* Location */}
        <Text style={[styles.sectionLabel, { color: theme.colors.placeholder }]}>LOCATION / LINK</Text>
        <View style={[styles.infoCard, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
          <FontAwesomeIcon icon={faMapMarkerAlt} color={theme.colors.placeholder} size={16} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            {booking.slot?.location ? (
              booking.slot?.meeting_type === 'video' ? (
                <TouchableOpacity onPress={() => Linking.openURL(booking.slot.location)} style={styles.linkRow}>
                  <Text style={[styles.locationText, { color: theme.colors.primary }]}>{booking.slot.location}</Text>
                  <FontAwesomeIcon icon={faExternalLinkAlt} size={12} color={theme.colors.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ) : (
                <Text style={[styles.locationText, { color: theme.colors.text }]}>{booking.slot.location}</Text>
              )
            ) : (
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No location provided.</Text>
            )}
          </View>
        </View>

        {/* Notes */}
        {booking.notes && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.colors.placeholder }]}>PARENT'S NOTES</Text>
            <View style={[styles.infoCard, { backgroundColor: theme.colors.warning + '10', borderColor: theme.colors.warning + '20' }]}>
              <FontAwesomeIcon icon={faStickyNote} color={theme.colors.warning} size={16} />
              <Text style={[styles.notesText, { color: theme.colors.text }]}>"{booking.notes}"</Text>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </StandardBottomModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  timeBox: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32
  },
  timeInfo: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 14, fontWeight: '900' },
  timeText: { fontSize: 13, fontWeight: 'bold' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, elevation: 1 },
  badgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  sectionLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  personRole: { fontSize: 8, fontWeight: 'bold', marginBottom: 2 },
  personName: { fontSize: 15, fontWeight: 'bold' },
  personEmail: { fontSize: 11 },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24
  },
  linkRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 14, fontWeight: 'bold' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  notesText: { fontSize: 14, fontStyle: 'italic', flex: 1, marginLeft: 12, lineHeight: 20 }
});
