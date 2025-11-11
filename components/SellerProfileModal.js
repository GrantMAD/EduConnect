import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Linking } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

export default function SellerProfileModal({ visible, seller, onClose }) {
  const { theme } = useTheme(); // Use the theme hook

  if (!seller) return null;

  const defaultAvatar = require('../assets/user.png');

  const handleCall = () => {
    if (seller.number) {
      Linking.openURL(`tel:${seller.number}`);
    }
  };

  const handleEmail = () => {
    if (seller.email) {
      Linking.openURL(`mailto:${seller.email}`);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={[styles.centeredView, { backgroundColor: theme.colors.backdrop }]}>
        <View style={[styles.modalView, { backgroundColor: theme.colors.surface, shadowColor: theme.colors.text }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesomeIcon icon={faTimes} size={24} color={theme.colors.placeholder} />
          </TouchableOpacity>

          <Image
            source={seller.avatar_url ? { uri: seller.avatar_url } : defaultAvatar}
            style={[styles.avatar, { borderColor: theme.colors.primary }]}
          />

          <Text style={[styles.sellerName, { color: theme.colors.text }]}>{seller.full_name}</Text>

          <TouchableOpacity onPress={handleEmail} style={styles.infoRow}>
            <FontAwesomeIcon icon={faEnvelope} size={16} color={theme.colors.primary} style={styles.icon} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>{seller.email}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCall} style={styles.infoRow}>
            <FontAwesomeIcon icon={faPhone} size={16} color={theme.colors.primary} style={styles.icon} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>{seller.number || 'No number provided'}</Text>
          </TouchableOpacity>

          <Text style={[styles.hintText, { color: theme.colors.placeholder }]}>Tap email or number to contact seller</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '85%',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    marginBottom: 15,
  },
  sellerName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'flex-start',
    marginLeft: 20,
  },
  icon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    marginTop: 15,
  },
});
