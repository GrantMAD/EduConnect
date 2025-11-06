import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';

const MarketplaceItemCard = ({ item, onViewSeller, onEdit, onDelete }) => {
  const CardWrapper = onViewSeller ? TouchableOpacity : View;

  return (
    <CardWrapper style={styles.card} {...(onViewSeller && { onPress: () => onViewSeller(item.seller) })}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
          style={styles.image}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <Text style={styles.price}>R {item.price.toFixed(2)}</Text>
      </View>

      {(onEdit || onDelete) && (
        <View style={styles.actionButtonsContainer}>
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onEdit(item)}>
              <FontAwesomeIcon icon={faEdit} size={18} color="#007AFF" />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onDelete(item.id)}>
              <FontAwesomeIcon icon={faTrash} size={18} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 8,
    overflow: 'hidden',
    shadowColor: '#000',
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
    color: '#222',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
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
    color: '#007AFF',
  },
  category: {
    fontSize: 14,
    backgroundColor: '#f2f2f2',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    color: '#444',
  },
  seller: {
    fontSize: 14,
    color: '#555',
  },
  button: {
    marginTop: 12,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    marginLeft: 15,
    padding: 5,
  },
});

export default MarketplaceItemCard;
