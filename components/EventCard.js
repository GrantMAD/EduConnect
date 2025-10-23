import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EventCard({ event }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>
      <Text>{event.date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  title: {
    fontWeight: 'bold',
  },
});