import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AnnouncementCard({ announcement }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{announcement.title}</Text>
      <Text>{announcement.content}</Text>
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