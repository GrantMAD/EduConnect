import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTag } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const ManageMarketItemListItem = ({ item, onPress }) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity 
        style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]} 
        onPress={() => onPress(item)}
        activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.image_url || 'https://via.placeholder.com/50' }}
        style={styles.image}
      />
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, { backgroundColor: theme.colors.primary + '10' }]}>
            <Text style={[styles.categoryText, { color: theme.colors.primary }]}>{item.category?.toUpperCase() || 'OTHER'}</Text>
          </View>
          <Text style={[styles.price, { color: theme.colors.primary }]}>R {item.price.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 14,
    fontWeight: '900',
  },
});

export default ManageMarketItemListItem;