import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEnvelope, faPhone, faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function SellerProfileModal({ visible, seller, onClose }) {
  const { theme } = useTheme();

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
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
          <FontAwesomeIcon icon={faUserCircle} size={26} color={theme.colors.primary} />
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Seller Profile</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.profileContainer}>
            <Image
              source={seller.avatar_url ? { uri: seller.avatar_url } : defaultAvatar}
              style={[styles.avatar, { borderColor: theme.colors.primary }]}
            />
            <Text style={[styles.sellerName, { color: theme.colors.text }]}>{seller.full_name}</Text>
          </View>

          <View style={[styles.detailsCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
            <TouchableOpacity onPress={handleEmail} style={styles.modalDetailRow}>
              <FontAwesomeIcon icon={faEnvelope} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
              <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>{seller.email}</Text>
            </TouchableOpacity>
            <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
            <TouchableOpacity onPress={handleCall} style={styles.modalDetailRow}>
              <FontAwesomeIcon icon={faPhone} size={16} color={theme.colors.placeholder} style={styles.modalIcon} />
              <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>{seller.number || 'No number provided'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.hintText, { color: theme.colors.placeholder }]}>Tap email or number to contact seller</Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 15,
    flex: 1,
  },
  modalCloseButton: {
    padding: 5,
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    marginBottom: 10,
  },
  sellerName: {
    fontSize: 20,
    fontWeight: '600',
  },
  detailsCard: {
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    marginBottom: 10,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  modalIcon: {
    marginRight: 12,
  },
  modalDetailText: {
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginVertical: 12,
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
});
