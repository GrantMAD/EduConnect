import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTag } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const ManageMarketItemListItem = ({ item, onPress }) => {
  const { theme } = useTheme(); // Use the theme hook

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]} onPress={() => onPress(item)}>
      <Image
        source={{ uri: item.image_url || 'https://via.placeholder.com/50' }}
        style={styles.image}
      />
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.priceCategoryContainer}>
          <FontAwesomeIcon icon={faTag} size={12} color={theme.colors.placeholder} style={styles.icon} />
          <Text style={[styles.category, { color: theme.colors.placeholder }]}>{item.category}</Text>
          <Text style={[styles.price, { color: theme.colors.primary }]}>R {item.price.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 5,
  },
  category: {
    fontSize: 12,
    marginRight: 10,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ManageMarketItemListItem;