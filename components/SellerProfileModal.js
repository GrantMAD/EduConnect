import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faEnvelope, faPhone, faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SellerProfileModal = React.memo(({ visible, seller, onClose }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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
        onSwipeComplete={onClose}
        swipeDirection={['down']}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0.4}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 40) }]}>
          <View style={styles.swipeIndicator} />
          <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
            <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
              <FontAwesomeIcon icon={faUserCircle} size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Merchant Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
            </TouchableOpacity>
          </View>
  
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 24 }}>
            <View style={styles.profileContainer}>
              <Image
                source={seller.avatar_url ? { uri: seller.avatar_url } : defaultAvatar}
                style={[styles.avatar, { borderColor: theme.colors.cardBorder }]}
              />
              <Text style={[styles.sellerName, { color: theme.colors.text }]}>{seller.full_name}</Text>
              <View style={[styles.badge, { backgroundColor: theme.colors.primary + '10' }]}>
                  <Text style={[styles.badgeText, { color: theme.colors.primary }]}>VERIFIED SELLER</Text>
              </View>
            </View>
  
            <View style={[styles.detailsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <TouchableOpacity onPress={handleEmail} style={styles.modalDetailRow} activeOpacity={0.7}>
                <View style={[styles.detailIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
                  <FontAwesomeIcon icon={faEnvelope} size={12} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.detailLabel, { color: theme.colors.placeholder }]}>EMAIL ADDRESS</Text>
                  <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>{seller.email}</Text>
                </View>
              </TouchableOpacity>
              <View style={[styles.separator, { backgroundColor: theme.colors.cardBorder }]} />
              <TouchableOpacity onPress={handleCall} style={styles.modalDetailRow} activeOpacity={0.7}>
                <View style={[styles.detailIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
                  <FontAwesomeIcon icon={faPhone} size={12} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.detailLabel, { color: theme.colors.placeholder }]}>CONTACT NUMBER</Text>
                  <Text style={[styles.modalDetailText, { color: theme.colors.text }]}>{seller.number || 'Not provided'}</Text>
                </View>
              </TouchableOpacity>
            </View>
  
            <Text style={[styles.hintText, { color: theme.colors.placeholder }]}>TAP A FIELD TO INITIATE CONTACT</Text>
          </ScrollView>
        </View>
      </Modal>
    );
});

const styles = StyleSheet.create({
    modalContent: {
      paddingHorizontal: 24,
      paddingTop: 8,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      maxHeight: '90%',
    },
    swipeIndicator: {
      width: 40,
      height: 4,
      backgroundColor: '#cbd5e1',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 20,
      borderBottomWidth: 1,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.5,
      flex: 1,
    },
    modalCloseButton: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileContainer: {
      alignItems: 'center',
      paddingBottom: 24,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 24,
      borderWidth: 1,
      marginBottom: 16,
    },
    sellerName: {
      fontSize: 20,
      fontWeight: '900',
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    detailsCard: {
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
    },
    modalDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
    },
    detailIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    detailLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    modalDetailText: {
      fontSize: 14,
      fontWeight: '700',
    },
    separator: {
      height: 1,
      marginVertical: 16,
      marginLeft: 48,
    },
    hintText: {
      fontSize: 10,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
});

export default SellerProfileModal;
