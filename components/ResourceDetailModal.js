import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUser, faCalendar, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import RNFetchBlob from 'rn-fetch-blob';
import FileViewer from 'react-native-file-viewer';

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

export default function ResourceDetailModal({ visible, onClose, resource }) {
  if (!resource) return null;

  const handleOpenFile = async (url) => {
    if (!url) return;

    try {
      const decodedUrl = decodeURIComponent(url);
      const fileName = decodedUrl.split('/').pop();
      const localPath = `${RNFetchBlob.fs.dirs.CacheDir}/${fileName}`;

      const res = await RNFetchBlob.config({
        path: localPath,
        fileCache: true,
      }).fetch('GET', url);

      if (res.info().status === 200) {
        await FileViewer.open(localPath, { showOpenWithDialog: true });
      } else {
        throw new Error('Failed to download file.');
      }
    } catch (err) {
      console.error('Cannot open file:', err);
      Alert.alert('Error', 'Failed to open file. Make sure you have an app that can open this file type.');
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="fadeInUp"
      animationOut="fadeOutDown"
      backdropOpacity={0.4}
    >
      <View style={styles.modalContent}>
        <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
          <FontAwesomeIcon icon={faTimes} size={20} color="#555" />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <FontAwesomeIcon icon={faFileAlt} size={24} color="#007AFF" style={{ marginRight: 10, marginTop: 2 }} />
          <Text style={styles.modalTitle}>{resource.title}</Text>
        </View>

        <View style={styles.modalSeparator} />

        <ScrollView style={styles.modalMessageScrollView}>
          <Text style={styles.modalMessageText}>{resource.description}</Text>
        </ScrollView>

        <View style={styles.modalSeparator} />

        <View style={styles.modalDetailRow}>
          <FontAwesomeIcon icon={faUser} size={16} color="#007AFF" style={styles.modalIcon} />
          <Text style={styles.modalDetailText}>
            Uploaded by: {resource.users?.full_name ?? resource.users?.email ?? "Unknown"}
          </Text>
        </View>

        <View style={styles.modalDetailRow}>
          <FontAwesomeIcon icon={faCalendar} size={16} color="#007AFF" style={styles.modalIcon} />
          <Text style={styles.modalDetailText}>Posted: {timeSince(resource.created_at)}</Text>
        </View>

        {resource.file_url && (
          <TouchableOpacity
            style={styles.openFileButton}
            onPress={() => handleOpenFile(resource.file_url)}
          >
            <Text style={styles.openFileButtonText}>View File</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    padding: 22,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
    maxHeight: '80%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 3,
    flexShrink: 1,
  },
  modalSeparator: {
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginVertical: 10,
    width: '100%',
  },
  modalMessageScrollView: {
    flexShrink: 1,
  },
  modalMessageText: {
    fontSize: 16,
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalIcon: {
    marginRight: 10,
  },
  modalDetailText: {
    fontSize: 14,
    flexShrink: 1,
  },
  openFileButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  openFileButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
