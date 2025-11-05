import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faBookOpen, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';

export default function HomeworkCard({ homework, onPress }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.row}>
        <FontAwesomeIcon icon={faBookOpen} size={16} color="#007AFF" style={styles.icon} />
        <Text style={styles.title}>{homework.subject}</Text>
      </View>
      <View style={styles.row}>
        <FontAwesomeIcon icon={faCalendarAlt} size={16} color="#007AFF" style={styles.icon} />
        <Text>Due: {formatDate(homework.due_date)}</Text>
      </View>
      <View style={styles.hr} />
      <Text style={styles.tapToOpen}>Tap to open</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
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
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    marginVertical: 5,
  },
  tapToOpen: {
    fontSize: 12,
    color: 'gray',
    textAlign: 'right',
    marginTop: 5,
  },
});