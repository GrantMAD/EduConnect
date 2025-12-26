import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faClipboardList,
  faCalendarAlt,
  faCheckCircle,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const AssignmentCard = ({ assignment, onPress, onTrackPress }) => {
  const { theme } = useTheme();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const isTeacher = user?.id === assignment.assigned_by;
  const isCompleted = assignment.student_completions?.length > 0;

  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
      <View style={styles.header}>
        <View style={styles.row}>
          <FontAwesomeIcon icon={faClipboardList} size={16} color={theme.colors.primary} style={styles.icon} />
          <Text style={[styles.title, { color: theme.colors.text }]}>{assignment.title}</Text>
        </View>
        {isCompleted && (
          <View style={[styles.badge, { backgroundColor: theme.colors.success + '20' }]}>
            <FontAwesomeIcon icon={faCheckCircle} size={12} color={theme.colors.success} />
            <Text style={[styles.badgeText, { color: theme.colors.success }]}>Done</Text>
          </View>
        )}
      </View>

      <View style={styles.row}>
        <FontAwesomeIcon icon={faCalendarAlt} size={16} color={theme.colors.primary} style={styles.icon} />
        <Text style={{ color: theme.colors.text }}>Due: {formatDate(assignment.due_date)}</Text>
      </View>

      <View style={[styles.hr, { borderBottomColor: theme.colors.cardBorder }]} />

      <View style={styles.footer}>
        {isTeacher ? (
          <TouchableOpacity
            style={[styles.trackButton, { backgroundColor: theme.colors.primary + '15' }]}
            onPress={onTrackPress}
          >
            <FontAwesomeIcon icon={faUsers} size={14} color={theme.colors.primary} />
            <Text style={[styles.trackButtonText, { color: theme.colors.primary }]}>Track Students</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.tapToOpen, { color: theme.colors.placeholder }]}>Tap to open</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  hr: {
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  tapToOpen: {
    fontSize: 12,
    textAlign: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: 4,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  trackButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

export default AssignmentCard;
