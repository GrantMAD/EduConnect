import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBullhorn } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function AnnouncementCard({ announcement }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: '#4f46e5' + '15' }]}>
            <FontAwesomeIcon icon={faBullhorn} size={14} color="#4f46e5" />
        </View>
        <Text style={[styles.title, { color: theme.colors.text }]}>{announcement.title}</Text>
      </View>
      <Text style={[styles.content, { color: theme.colors.text }]} numberOfLines={3}>
        {announcement.message || announcement.content}
      </Text>
      <View style={styles.footer}>
          <Text style={[styles.date, { color: theme.colors.placeholder }]}>
              {new Date(announcement.created_at).toLocaleDateString()}
          </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontWeight: '800',
    fontSize: 16,
    flex: 1,
  },
  content: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
  },
  date: {
      fontSize: 11,
      fontWeight: '600',
  }
});