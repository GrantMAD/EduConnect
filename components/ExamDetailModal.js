import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faClock,
  faGraduationCap,
  faMapMarkerAlt,
  faChair,
  faInfoCircle,
  faFileSignature
} from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const ExamDetailModal = React.memo(({
  visible,
  onClose,
  exam
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const scrollViewRef = React.useRef(null);

  if (!exam) return null;

  const handleOnScroll = (event) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const handleScrollTo = (p) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo(p);
    }
  };

  const examData = exam.originalData || exam;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      scrollTo={handleScrollTo}
      scrollOffset={scrollOffset}
      scrollOffsetMax={400}
      propagateSwipe={true}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropOpacity={0.4}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.swipeIndicator} />
        
        <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
          <View style={[styles.iconBox, { backgroundColor: '#f43f5e' + '15' }]}>
            <FontAwesomeIcon icon={faGraduationCap} size={20} color="#f43f5e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Examination Details</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.placeholder }]}>{examData.subject_name}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          onScroll={handleOnScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom, 24)
          }}
        >
          <View style={[styles.infoGrid]}>
            <View style={[styles.gridCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <View style={[styles.gridIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                <FontAwesomeIcon icon={faFileSignature} size={14} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.gridLabel, { color: theme.colors.placeholder }]}>PAPER CODE</Text>
                <Text style={[styles.gridValue, { color: theme.colors.text }]}>{examData.paper_code}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.gridCard, { flex: 1, marginRight: 8, backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={[styles.gridIcon, { backgroundColor: '#10b981' + '10' }]}>
                  <FontAwesomeIcon icon={faCalendarAlt} size={14} color="#10b981" />
                </View>
                <View>
                  <Text style={[styles.gridLabel, { color: theme.colors.placeholder }]}>DATE</Text>
                  <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                    {new Date(examData.date || exam.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <View style={[styles.gridCard, { flex: 1, marginLeft: 8, backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={[styles.gridIcon, { backgroundColor: '#f59e0b' + '10' }]}>
                  <FontAwesomeIcon icon={faClock} size={14} color="#f59e0b" />
                </View>
                <View>
                  <Text style={[styles.gridLabel, { color: theme.colors.placeholder }]}>TIME</Text>
                  <Text style={[styles.gridValue, { color: theme.colors.text }]}>
                    {examData.start_time?.slice(0, 5) || new Date(exam.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            </View>

            {examData.venue_name && (
              <View style={[styles.gridCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={[styles.gridIcon, { backgroundColor: '#0d9488' + '10' }]}>
                  <FontAwesomeIcon icon={faMapMarkerAlt} size={14} color="#0d9488" />
                </View>
                <View>
                  <Text style={[styles.gridLabel, { color: theme.colors.placeholder }]}>VENUE</Text>
                  <Text style={[styles.gridValue, { color: theme.colors.text }]}>{examData.venue_name}</Text>
                </View>
              </View>
            )}

            {examData.seat_label && (
              <View style={[styles.gridCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={[styles.gridIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                  <FontAwesomeIcon icon={faChair} size={14} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.gridLabel, { color: theme.colors.placeholder }]}>ASSIGNED SEAT</Text>
                  <Text style={[styles.gridValue, { color: theme.colors.text }]}>{examData.seat_label}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={[styles.noteBox, { backgroundColor: theme.colors.primary + '05', borderColor: theme.colors.primary + '20', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <FontAwesomeIcon icon={faInfoCircle} size={14} color={theme.colors.primary} />
              <Text style={[styles.noteTitle, { color: theme.colors.primary, marginLeft: 8 }]}>EXAM INSTRUCTIONS</Text>
            </View>
            <Text style={[styles.noteText, { color: theme.colors.text }]}>
              Please arrive at the venue at least 15 minutes before the scheduled start time. Ensure you have your candidate ID card and required stationery.
            </Text>
          </View>
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
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  infoGrid: {
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  gridLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
  },
  noteBox: {
    padding: 20,
    borderRadius: 20,
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
});

export default ExamDetailModal;
