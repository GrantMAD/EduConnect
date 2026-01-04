import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faPoll, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PollVoteModal = React.memo(({ visible, onClose, poll, onVote, description, loading }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!poll) return null;

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
      <View style={[styles.voteModalContent, { backgroundColor: theme.colors.surface, paddingBottom: Math.max(insets.bottom, 20) }]}>
        <View style={styles.swipeIndicator} />
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={styles.contentContainer}>
            <View style={[styles.iconContainer, { backgroundColor: '#f59e0b' + '15' }]}>
              <FontAwesomeIcon icon={faPoll} size={24} color="#f59e0b" />
            </View>

            <Text style={[styles.questionText, { color: theme.colors.text }]}>{poll.question}</Text>

            <Text style={[styles.subText, { color: theme.colors.placeholder }]}>SELECT AN OPTION TO CAST YOUR VOTE</Text>

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
                    style={[styles.optionButton, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card, borderWidth: 1 }]}
                    onPress={() => onVote(poll.id, option)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionButtonText, { color: theme.colors.text }]}>{option}</Text>
                    <View style={[styles.circle, { borderColor: theme.colors.cardBorder }]}>
                      <View style={styles.circleInner} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  voteModalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  swipeIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#cbd5e1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 32,
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 20,
    marginBottom: 12,
  },
  optionButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PollVoteModal;
