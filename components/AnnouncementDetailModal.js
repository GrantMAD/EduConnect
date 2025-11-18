import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUser, faCalendar, faBullhorn } from '@fortawesome/free-solid-svg-icons';

const timeSince = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

export default function AnnouncementDetailModal({ visible, onClose, announcement }) {
  if (!announcement) return null;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={styles.modalContent}>
        <View style={styles.header}>
          <FontAwesomeIcon icon={faBullhorn} size={26} color="#007AFF" />
          <Text style={styles.modalTitle}>{announcement.title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <FontAwesomeIcon icon={faTimes} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>{announcement.message}</Text>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.modalDetailRow}>
              <FontAwesomeIcon icon={faUser} size={16} color="#555" style={styles.modalIcon} />
              <Text style={styles.modalDetailText}>
                Posted by {announcement.author?.full_name ?? "Unknown"}
              </Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.modalDetailRow}>
              <FontAwesomeIcon icon={faCalendar} size={16} color="#555" style={styles.modalIcon} />
              <Text style={styles.modalDetailText}>Posted {timeSince(announcement.created_at)}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
    modalContent: {
      backgroundColor: '#F7F9FC',
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
      borderBottomColor: '#E8E8E8',
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: '#333',
      marginLeft: 15,
      flex: 1,
    },
    modalCloseButton: {
      padding: 5,
    },
    descriptionContainer: {
      paddingVertical: 20,
    },
    descriptionText: {
      fontSize: 16,
      lineHeight: 24,
      color: '#555',
    },
    detailsCard: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 15,
      borderWidth: 1,
      borderColor: '#E8E8E8',
      marginBottom: 20,
    },
    modalDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalIcon: {
      marginRight: 12,
    },
    modalDetailText: {
      fontSize: 14,
      color: '#444',
    },
    separator: {
      height: 1,
      backgroundColor: '#E8E8E8',
      marginVertical: 12,
    },
  });
