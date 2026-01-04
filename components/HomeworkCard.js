import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faBookOpen,
  faCalendarAlt,
  faCheckCircle,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const HomeworkCard = React.memo(({ homework, onPress, onTrackPress, userId }) => {
  const { theme } = useTheme();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const isTeacher = userId === homework.created_by;
  const isCompleted = homework.student_completions?.length > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
            <FontAwesomeIcon icon={faBookOpen} size={14} color={theme.colors.primary} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{homework.subject}</Text>
        </View>
        {isCompleted && (
          <View style={[styles.badge, { backgroundColor: '#10b981' + '15' }]}>
            <FontAwesomeIcon icon={faCheckCircle} size={10} color="#10b981" />
            <Text style={[styles.badgeText, { color: '#10b981' }]}>Done</Text>
          </View>
        )}
      </View>

      <View style={[styles.dateRow, { backgroundColor: theme.colors.background }]}>
        <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.colors.placeholder} />
        <Text style={[styles.dateText, { color: theme.colors.placeholder }]}>DUE {formatDate(homework.due_date).toUpperCase()}</Text>
      </View>

      <View style={styles.footer}>
        {isTeacher ? (
          <TouchableOpacity
            style={[styles.trackButton, { backgroundColor: theme.colors.primary }]}
            onPress={onTrackPress}
          >
            <FontAwesomeIcon icon={faUsers} size={12} color="#fff" />
            <Text style={styles.trackButtonText}>TRACK STUDENTS</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.openRow}>
            <Text style={[styles.tapToOpen, { color: theme.colors.primary }]}>VIEW DETAILS</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: -0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 20,
    gap: 8,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 0,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  openRow: {
    alignItems: 'center',
    paddingTop: 4,
  },
  tapToOpen: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

export default HomeworkCard;
