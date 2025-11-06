import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function MarketplaceItemCard({ item, onEditImage, onViewSeller }) {
  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.image_url || 'https://via.placeholder.com/150' }}
          style={styles.image}
        />
        {onEditImage && (
          <TouchableOpacity style={styles.editOverlay} onPress={() => onEditImage(item)}>
            <FontAwesome name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.detailRow}>
          <FontAwesome name="tag" size={14} color="#555" style={styles.icon} />
          <Text style={styles.price}>{item.price} ZAR</Text>
        </View>

        <View style={styles.detailRow}>
          <FontAwesome name="list" size={14} color="#555" style={styles.icon} />
          <Text style={styles.category}>{item.category}</Text>
        </View>

        <View style={styles.detailRow}>
          <FontAwesome name="user" size={14} color="#555" style={styles.icon} />
          <Text style={styles.seller}>Seller: {item.seller.full_name}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => onViewSeller(item.seller)}>
          <Text style={styles.buttonText}>View Seller</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  editOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 20,
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
});
