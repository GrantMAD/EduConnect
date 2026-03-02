import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faTimes, faPoll, faCheckCircle, faStar as faSolidStar, 
  faCheckSquare, faAlignLeft, faSquare as faSolidSquare,
  faCircle as faSolidCircle
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PollVoteModal = React.memo(({ visible, onClose, poll, onVote, loading }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [rating, setRating] = useState(0);
  const [openResponse, setOpenResponse] = useState('');

  // Reset state when poll changes or modal opens
  useEffect(() => {
    if (visible) {
      setSelectedOptions([]);
      setRating(0);
      setOpenResponse('');
    }
  }, [visible, poll?.id]);

  if (!poll) return null;

  const handleMultipleToggle = (option) => {
    setSelectedOptions(prev => 
      prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
    );
  };

  const handleSubmit = () => {
    if (poll.type === 'multiple_choice') {
      if (selectedOptions.length === 0) return;
      onVote(poll.id, selectedOptions);
    } else if (poll.type === 'rating') {
      if (rating === 0) return;
      onVote(poll.id, rating.toString());
    } else if (poll.type === 'open_ended') {
      if (!openResponse.trim()) return;
      onVote(poll.id, openResponse.trim());
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

            <Text style={[styles.subText, { color: theme.colors.placeholder }]}>
              {poll.type === 'multiple_choice' ? 'SELECT ONE OR MORE OPTIONS' : 
               poll.type === 'rating' ? 'PROVIDE YOUR RATING' :
               poll.type === 'open_ended' ? 'TYPE YOUR RESPONSE BELOW' :
               'SELECT AN OPTION TO CAST YOUR VOTE'}
            </Text>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.text }]}>Submitting vote...</Text>
              </View>
            ) : (
              <View style={styles.optionsContainer}>
                {/* Single Choice */}
                {(poll.type === 'single_choice' || !poll.type) && poll.options.map((option, idx) => (
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

                {/* Multiple Choice */}
                {poll.type === 'multiple_choice' && (
                  <>
                    {poll.options.map((option, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.optionButton, 
                          { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.card, borderWidth: 1 },
                          selectedOptions.includes(option) && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }
                        ]}
                        onPress={() => handleMultipleToggle(option)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.optionButtonText, { color: theme.colors.text }]}>{option}</Text>
                        {selectedOptions.includes(option) ? (
                          <FontAwesomeIcon icon={faCheckSquare} color={theme.colors.primary} size={20} />
                        ) : (
                          <View style={[styles.squareOutline, { borderColor: theme.colors.cardBorder }]} />
                        )}
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity 
                      style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, selectedOptions.length === 0 && { opacity: 0.5 }]}
                      onPress={handleSubmit}
                      disabled={selectedOptions.length === 0}
                    >
                      <Text style={styles.submitBtnText}>Submit Selection</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Rating */}
                {poll.type === 'rating' && (
                  <View style={styles.ratingBox}>
                    <View style={styles.starsContainer}>
                      {[...Array(poll.settings?.max_rating || 5)].map((_, i) => (
                        <TouchableOpacity key={i} onPress={() => setRating(i + 1)} style={styles.starTouch}>
                          <FontAwesomeIcon 
                            icon={faSolidStar} 
                            size={32} 
                            color={rating >= i + 1 ? '#f59e0b' : theme.colors.placeholder + '40'} 
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity 
                      style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, rating === 0 && { opacity: 0.5 }]}
                      onPress={handleSubmit}
                      disabled={rating === 0}
                    >
                      <Text style={styles.submitBtnText}>Confirm Rating</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Open Ended */}
                {poll.type === 'open_ended' && (
                  <View style={styles.openEndedBox}>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                      placeholder="Type your response here..."
                      placeholderTextColor={theme.colors.placeholder}
                      multiline
                      numberOfLines={4}
                      value={openResponse}
                      onChangeText={setOpenResponse}
                    />
                    <TouchableOpacity 
                      style={[styles.submitBtn, { backgroundColor: theme.colors.primary }, !openResponse.trim() && { opacity: 0.5 }]}
                      onPress={handleSubmit}
                      disabled={!openResponse.trim()}
                    >
                      <Text style={styles.submitBtnText}>Send Feedback</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
    textAlign: 'center',
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
  squareOutline: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
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
  submitBtn: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ratingBox: {
    width: '100%',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  starTouch: {
    padding: 4,
  },
  openEndedBox: {
    width: '100%',
  },
  textArea: {
    width: '100%',
    minHeight: 120,
    borderRadius: 20,
    padding: 16,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
    textAlignVertical: 'top',
  }
});

export default PollVoteModal;
