import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Share, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUser, faCalendar, faBullhorn, faCopy, faShareAlt } from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const timeSince = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
};

export default function AnnouncementDetailModal({ visible, onClose, announcement }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { showToast } = useToast();
  if (!announcement) return null;

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(announcement.message);
    showToast('Announcement copied!', 'success');
  };

  const shareAnnouncement = async () => {
    try {
      await Share.share({
        title: announcement.title,
        message: `${announcement.title}\n\n${announcement.message}`,
      });
    } catch (error) {
      showToast('Error sharing announcement', 'error');
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      propagateSwipe={true}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.4}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.swipeIndicator} />
        
        <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
          <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
            <FontAwesomeIcon icon={faBullhorn} size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{announcement.title}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={shareAnnouncement} style={styles.actionBtn}>
                <FontAwesomeIcon icon={faShareAlt} size={18} color={theme.colors.placeholder} />
            </TouchableOpacity>
            <TouchableOpacity onPress={copyToClipboard} style={styles.actionBtn}>
                <FontAwesomeIcon icon={faCopy} size={18} color={theme.colors.placeholder} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ 
            paddingTop: 24, 
            paddingBottom: Math.max(insets.bottom, 24) 
          }}
        >
          <View style={styles.messageWrapper}>
            <Text style={[styles.descriptionText, { color: theme.colors.text }]}>{announcement.message}</Text>
          </View>

          <View style={[styles.metaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <View style={styles.metaRow}>
              <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                <FontAwesomeIcon icon={faUser} size={12} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>POSTED BY</Text>
                <Text style={[styles.metaValue, { color: theme.colors.text }]}>{announcement.author?.full_name ?? "Administrator"}</Text>
              </View>
            </View>
            <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />
            <View style={styles.metaRow}>
              <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                <FontAwesomeIcon icon={faCalendar} size={12} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>TIMESTAMP</Text>
                <Text style={[styles.metaValue, { color: theme.colors.text }]}>{timeSince(announcement.created_at)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
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
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
  },
  headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  actionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  closeBtn: {
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
  },
  messageWrapper: {
    marginBottom: 32,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '600',
  },
  metaCard: {
    borderRadius: 24,
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metaLabel: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
      marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  metaDivider: {
    height: 1,
    marginVertical: 16,
    marginLeft: 48,
  },
});