import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AssignmentCard = ({ assignment }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{assignment.title}</Text>
      <Text style={styles.description}>{assignment.description}</Text>
      <Text style={styles.dueDate}>Due: {new Date(assignment.due_date).toLocaleDateString()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  dueDate: {
    fontSize: 12,
    color: '#888',
  },
});

export default AssignmentCard;
