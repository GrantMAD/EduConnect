import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEdit, faTrash, faBox, faBook, faLaptop, faPencilAlt, faChair, faTshirt } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const MarketplaceItemCard = ({ item, onViewSeller, onEdit, onDelete }) => {
  const { theme } = useTheme(); // Use the theme hook
  const CardWrapper = onViewSeller ? TouchableOpacity : View;

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Books': return '#FF9500'; // Orange
      case 'Electronics': return '#007AFF'; // Blue
      case 'Stationery': return '#AF52DE'; // Purple
      case 'Furniture': return '#5856D6'; // Indigo
      case 'Clothing': return '#FF2D55'; // Pink
      case 'Other': return '#8E8E93'; // Gray
      default: return theme.colors.primary;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Books': return faBook;
      case 'Electronics': return faLaptop;
      case 'Stationery': return faPencilAlt;
      case 'Furniture': return faChair;
      case 'Clothing': return faTshirt;
      default: return faBox;
    }
  };

  const [imageError, setImageError] = React.useState(false);

  return (
    <CardWrapper
      style={[styles.card, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}
      {...(onViewSeller && { onPress: () => onViewSeller(item.seller) })}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        {!imageError && item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.image, styles.fallbackContainer, { backgroundColor: theme.colors.inputBackground }]}>
            <FontAwesomeIcon icon={getCategoryIcon(item.category)} size={48} color={theme.colors.placeholder} />
          </View>
        )}
        {item.category && (
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) }]}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.description, { color: theme.colors.placeholder }]} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

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
    borderWidth: 1,
    height: 320,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoContainer: {
    padding: 14,
    flex: 1,
    justifyContent: 'space-between',
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
  },
  actionButton: {
    marginLeft: 15,
    padding: 5,
  },
});

export default MarketplaceItemCard;

