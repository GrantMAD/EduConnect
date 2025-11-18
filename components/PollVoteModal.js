import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPoll } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function PollVoteModal({ visible, onClose, poll, onVote, description }) {
  const { theme } = useTheme();

  if (!poll) return null;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.5}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[styles.voteModalContent, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <FontAwesomeIcon icon={faPoll} size={26} color={theme.colors.primary} />
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{poll.question}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {description && (
            <Text style={[styles.modalDescription, { color: theme.colors.text }]}>{description}</Text>
          )}
          <View style={styles.optionsContainer}>
            {poll.options.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.optionButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => onVote(poll.id, option)}
              >
                <Text style={styles.optionButtonText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  voteModalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
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
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginTop: 10,
    marginBottom: 20,
  },
  modalCloseButton: {
    padding: 5,
  },
  optionsContainer: {
    paddingVertical: 20,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  optionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
