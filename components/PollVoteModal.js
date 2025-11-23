import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPoll, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function PollVoteModal({ visible, onClose, poll, onVote, description, loading }) {
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
        <View style={styles.modalHeader}>
          <View style={styles.headerBar} />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesomeIcon icon={faTimes} size={20} color={theme.colors.placeholder} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <FontAwesomeIcon icon={faPoll} size={32} color={theme.colors.primary} />
            </View>

            <Text style={[styles.questionText, { color: theme.colors.text }]}>{poll.question}</Text>

            <Text style={styles.subText}>Select an option to vote</Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.text }]}>Submitting vote...</Text>
              </View>
            ) : (
              <View style={styles.optionsContainer}>
                {poll.options.map((option, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.optionButton, { borderColor: theme.colors.border, backgroundColor: theme.dark ? '#333' : '#f9f9f9' }]}
                    onPress={() => onVote(poll.id, option)}
                  >
                    <Text style={[styles.optionButtonText, { color: theme.colors.text }]}>{option}</Text>
                    <View style={[styles.circle, { borderColor: theme.colors.placeholder }]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  voteModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 20,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  headerBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 10,
    padding: 5,
  },
  contentContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e6f2ff', // Light blue background
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  questionText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
