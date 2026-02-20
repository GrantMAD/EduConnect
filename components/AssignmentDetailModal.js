import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faTimes,
  faCalendarAlt,
  faClipboardList,
  faBook,
  faUser,
  faChalkboardTeacher,
  faExternalLinkAlt,
  faPen,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const AssignmentDetailModal = React.memo(({
  visible,
  onClose,
  assignment,
  currentUserId,
  isEditing,
  setIsEditing,
  onUpdate,
  onDelete,
  onOpenResource
}) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const scrollViewRef = React.useRef(null);

  if (!assignment) return null;

  const handleOnScroll = (event) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const handleScrollTo = (p) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo(p);
    }
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

  const canEdit = currentUserId === assignment.assigned_by;

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
          <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
            <FontAwesomeIcon icon={faClipboardList} size={20} color={theme.colors.primary} />
          </View>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Assignment Details</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
            </TouchableOpacity>
          </View>
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
          <View style={styles.messageWrapper}>
            {isEditing ? (
              <TextInput
                style={[styles.modalTextInput, { color: theme.colors.text, borderColor: theme.colors.cardBorder }]}
                value={assignment.description}
                multiline
                onChangeText={(t) => onUpdate({ ...assignment, description: t })}
              />
            ) : (
              <Text style={[styles.descriptionText, { color: theme.colors.text }]}>
                {assignment.description}
              </Text>
            )}
          </View>

          <View style={[styles.metaCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <View style={styles.metaRow}>
              <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                <FontAwesomeIcon icon={faBook} size={12} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>TITLE</Text>
                {isEditing ? (
                  <TextInput
                    style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14, padding: 0 }}
                    value={assignment.title}
                    onChangeText={(t) => onUpdate({ ...assignment, title: t })}
                  />
                ) : (
                  <Text style={[styles.metaValue, { color: theme.colors.text }]}>{assignment.title}</Text>
                )}
              </View>
            </View>

            <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />

            <View style={styles.metaRow}>
              <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                <FontAwesomeIcon icon={faCalendarAlt} size={12} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>DUE DATE</Text>
                <Text style={[styles.metaValue, { color: theme.colors.text }]}>{formatDate(assignment.due_date)}</Text>
              </View>
            </View>

            {assignment.assigned_by_user && (
              <>
                <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />
                <View style={styles.metaRow}>
                  <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                    <FontAwesomeIcon icon={faUser} size={12} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>ASSIGNED BY</Text>
                    <Text style={[styles.metaValue, { color: theme.colors.text }]}>{assignment.assigned_by_user.full_name}</Text>
                  </View>
                </View>
              </>
            )}

            {assignment.lesson_plans && (
              <>
                <View style={[styles.metaDivider, { backgroundColor: theme.colors.cardBorder }]} />
                <View style={styles.metaRow}>
                  <View style={[styles.metaIcon, { backgroundColor: theme.colors.primary + '10' }]}>
                    <FontAwesomeIcon icon={faChalkboardTeacher} size={12} color={theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.metaLabel, { color: theme.colors.placeholder }]}>RELATED LESSON</Text>
                    <Text style={[styles.metaValue, { color: theme.colors.text }]}>{assignment.lesson_plans.title}</Text>
                    {assignment.lesson_plans.objectives?.length > 0 && (
                      <Text style={{ fontSize: 11, color: theme.colors.placeholder, marginTop: 4 }}>
                        Focus: {assignment.lesson_plans.objectives[0]}
                      </Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>

          {assignment.resources?.length > 0 && (
            <View style={{ marginTop: 24 }}>
              <Text style={[styles.cardSectionLabel, { color: theme.colors.placeholder, marginBottom: 12, marginLeft: 4 }]}>ATTACHED MATERIALS ({assignment.resources.length})</Text>
              {assignment.resources.map((res) => (
                <TouchableOpacity
                  key={res.id}
                  style={[styles.resourceItem, { backgroundColor: '#10b981' + '10', borderColor: '#10b981' + '30', borderWidth: 1 }]}
                  onPress={() => onOpenResource && onOpenResource(res)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resourceTitle, { color: theme.colors.text }]}>{res.title}</Text>
                    <Text style={{ fontSize: 10, color: theme.colors.placeholder, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 }}>Library Resource</Text>
                  </View>
                  <View style={[styles.resourceAction, { backgroundColor: '#10b981' }]}>
                    <FontAwesomeIcon icon={faExternalLinkAlt} size={10} color="#fff" />
                    <Text style={styles.resourceActionText}>OPEN</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {canEdit && onUpdate && onDelete && (
            <View style={[styles.modalButtonContainer, { marginTop: 24 }]}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => (isEditing ? onUpdate(assignment) : setIsEditing(true))}
              >
                <FontAwesomeIcon icon={faPen} size={16} color="#fff" />
                <Text style={styles.modalButtonText}>
                  {isEditing ? 'Save Changes' : 'Edit Assignment'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.error, marginLeft: 12 }]}
                onPress={onDelete}
                disabled={isEditing}
              >
                <FontAwesomeIcon icon={faTrash} size={16} color="#fff" />
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
    letterSpacing: -0.5,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  resourceAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  resourceActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default AssignmentDetailModal;
