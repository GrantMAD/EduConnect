import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function EventCard({ event }) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: '#10b981' + '15' }]}>
            <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#10b981" />
        </View>
        <View style={styles.content}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{event.title}</Text>
            <Text style={[styles.date, { color: theme.colors.placeholder }]}>{event.date}</Text>
        </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
      flex: 1,
  },
  title: {
    fontWeight: '800',
    fontSize: 15,
  },
  date: {
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
  }
});