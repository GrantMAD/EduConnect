import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const MarketplaceItemCard = ({ item, onViewSeller, onEdit, onDelete }) => {
  const { theme } = useTheme(); // Use the theme hook
  const CardWrapper = onViewSeller ? TouchableOpacity : View;

  return (
    <CardWrapper style={[styles.card, { backgroundColor: theme.colors.cardBackground, shadowColor: theme.colors.text }]} {...(onViewSeller && { onPress: () => onViewSeller(item.seller) })}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
          style={styles.image}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.description, { color: theme.colors.text }]} numberOfLines={2}>
          {item.description}
        </Text>

        <Text style={[styles.price, { color: theme.colors.primary }]}>R {item.price.toFixed(2)}</Text>
      </View>

      {(onEdit || onDelete) && (
        <View style={[styles.actionButtonsContainer, { borderTopColor: theme.colors.cardBorder }]}>
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)}>
              <FontAwesomeIcon icon={faEdit} size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(item.id)}>
              <FontAwesomeIcon icon={faTrash} size={18} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
  },
  infoContainer: {
    padding: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
  },
  category: {
    fontSize: 14,
    backgroundColor: '#f2f2f2', // This might need to be themed as well if used
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    color: '#444', // This might need to be themed as well if used
  },
  seller: {
    fontSize: 14,
    color: '#555', // This might need to be themed as well if used
  },
  button: {
    marginTop: 12,
    backgroundColor: '#007AFF', // This might need to be themed as well if used
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff', // This might need to be themed as well if used
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
  },
  actionButton: {
    marginLeft: 15,
    padding: 5,
  },
});

export default MarketplaceItemCard;
