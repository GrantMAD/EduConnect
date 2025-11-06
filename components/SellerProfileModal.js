import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Linking } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEnvelope, faPhone } from '@fortawesome/free-solid-svg-icons';

export default function SellerProfileModal({ visible, seller, onClose }) {
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
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <FontAwesomeIcon icon={faTimes} size={24} color="#aaa" />
          </TouchableOpacity>

          <Image
            source={seller.avatar_url ? { uri: seller.avatar_url } : defaultAvatar}
            style={styles.avatar}
          />

          <Text style={styles.sellerName}>{seller.full_name}</Text>

          <TouchableOpacity onPress={handleEmail} style={styles.infoRow}>
            <FontAwesomeIcon icon={faEnvelope} size={16} color="#007AFF" style={styles.icon} />
            <Text style={styles.infoText}>{seller.email}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCall} style={styles.infoRow}>
            <FontAwesomeIcon icon={faPhone} size={16} color="#007AFF" style={styles.icon} />
            <Text style={styles.infoText}>{seller.number || 'No number provided'}</Text>
          </TouchableOpacity>

          <Text style={styles.hintText}>Tap email or number to contact seller</Text>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalView: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
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
    borderColor: '#007AFF',
    marginBottom: 15,
  },
  sellerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
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
    color: '#555',
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    marginTop: 15,
  },
});
