import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MarketplaceItemCard({ item }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{item.name}</Text>
      <Text>Price: {item.price}</Text>
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