import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClipboardList, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const AssignmentCard = ({ assignment, onPress }) => {
  const { theme } = useTheme(); // Use the theme hook

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  return (
    <TouchableOpacity onPress={onPress} style={[styles.container, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
      <View style={styles.row}>
        <FontAwesomeIcon icon={faClipboardList} size={16} color={theme.colors.primary} style={styles.icon} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{assignment.title}</Text>
      </View>
      <View style={styles.row}>
        <FontAwesomeIcon icon={faCalendarAlt} size={16} color={theme.colors.primary} style={styles.icon} />
        <Text style={{ color: theme.colors.text }}>Due: {formatDate(assignment.due_date)}</Text>
      </View>
      <View style={[styles.hr, { borderBottomColor: theme.colors.cardBorder }]} />
      <Text style={[styles.tapToOpen, { color: theme.colors.placeholder }]}>Tap to open</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 10,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    marginRight: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  hr: {
    borderBottomWidth: 1,
    marginVertical: 5,
  },
  tapToOpen: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
});

export default AssignmentCard;
