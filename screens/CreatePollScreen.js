import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { useSchool } from '../context/SchoolContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
  faPlus, faMinus, faCalendar, faCheckCircle, 
  faChevronLeft, faPoll, faDotCircle, faCheckSquare, 
  faStar, faAlignLeft 
} from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';
import { useGamification } from '../context/GamificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../services/authService';
import { createPoll as createPollService } from '../services/pollService';
import { fetchUsersBySchoolWithPreferences } from '../services/userService';
import { sendBatchNotifications } from '../services/notificationService';

const { width } = Dimensions.get('window');

const CreatePollScreen = ({ navigation, route }) => {
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const { showToast } = useToast();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('single_choice');
  const [settings, setSettings] = useState({ max_rating: 5 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const pollTypes = [
    { id: 'single_choice', label: 'Single', icon: faDotCircle },
    { id: 'multiple_choice', label: 'Multiple', icon: faCheckSquare },
    { id: 'rating', label: 'Rating', icon: faStar },
    { id: 'open_ended', label: 'Open', icon: faAlignLeft }
  ];

  const handleOptionChange = useCallback((text, index) => {
    setOptions(prevOptions => {
      const newOptions = [...prevOptions];
      newOptions[index] = text;
      return newOptions;
    });
  }, []);

  const addOption = useCallback(() => {
    setOptions(prevOptions => [...prevOptions, '']);
  }, []);

  const removeOption = useCallback((index) => {
    setOptions(prevOptions => {
      const newOptions = [...prevOptions];
      newOptions.splice(index, 1);
      return newOptions;
    });
  }, []);

  const handleCreatePoll = useCallback(async () => {
    if (!question.trim()) {
      showToast('Please enter a poll question.', 'error');
      return;
    }

    if (['single_choice', 'multiple_choice'].includes(type) && options.some(opt => !opt.trim())) {
      showToast('Please fill out all options.', 'error');
      return;
    }

    if (!endDate) {
      showToast('Please select an end date for the poll.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const authUser = await getCurrentUser();
      if (!authUser) throw new Error('User not authenticated');

      const pollData = {
        question,
        options: ['single_choice', 'multiple_choice'].includes(type) ? options : [],
        type,
        settings: type === 'rating' ? settings : {},
        end_date: endDate,
        school_id: schoolId,
        created_by: authUser.id,
        is_active: true,
      };

      const newPoll = await createPollService(pollData);

      const users = await fetchUsersBySchoolWithPreferences(schoolId);
      if (users) {
        const recipients = users.filter(u => {
          if (u.id === authUser.id) return false;
          const prefs = u.notification_preferences;
          return !prefs || prefs.polls !== false;
        });

        const notifications = recipients.map(u => ({
          user_id: u.id,
          type: 'new_poll',
          title: 'New Poll Available',
          message: `A new poll has been created: "${question}"`,
          data: { poll_id: newPoll.id }
        }));

        if (notifications.length > 0) {
          await sendBatchNotifications(notifications);
        }
      }

      awardXP('content_creation', 15);
      showToast('Poll created successfully! +15 XP', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating poll:', error);
      showToast('Failed to create poll. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [question, options, type, settings, endDate, schoolId, awardXP, navigation, showToast]);

  const handleDayPress = useCallback((day) => setEndDate(day.dateString), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#4f46e5', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroContainer}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonHero}>
                <FontAwesomeIcon icon={faChevronLeft} size={18} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.heroTitle}>New Poll</Text>
            </View>
            <Text style={styles.heroDescription}>
              Engage your school community with custom poll types.
            </Text>
          </View>
          <View style={styles.iconBoxHero}>
            <FontAwesomeIcon icon={faPoll} size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 + insets.bottom }} showsVerticalScrollIndicator={false}>
        
        {/* Type Selector */}
        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <Text style={styles.cardSectionLabel}>POLL TYPE</Text>
          <View style={styles.typeGrid}>
            {pollTypes.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => setType(t.id)}
                style={[
                  styles.typeItem,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 },
                  type === t.id && { borderColor: theme.colors.primary, borderWidth: 2, backgroundColor: theme.colors.primary + '10' }
                ]}
              >
                <FontAwesomeIcon icon={t.icon} size={18} color={type === t.id ? theme.colors.primary : theme.colors.placeholder} />
                <Text style={[styles.typeLabel, { color: type === t.id ? theme.colors.primary : theme.colors.text }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
          <Text style={styles.cardSectionLabel}>POLL QUESTION</Text>
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>QUESTION</Text>
              <Text style={styles.charCount}>{question.length}/200</Text>
            </View>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, minHeight: 80, paddingHorizontal: 0, paddingTop: 0 }]}>
              <TextInput
                style={[styles.input, { color: theme.colors.text, height: '100%', width: '100%', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, includeFontPadding: false }]}
                placeholder="What would you like to ask?"
                placeholderTextColor={theme.colors.placeholder}
                value={question}
                onChangeText={setQuestion}
                multiline
                textAlignVertical="top"
                autoCorrect={false}
                underlineColorAndroid="transparent"
                blurOnSubmit={false}
                maxLength={200}
              />
            </View>
          </View>
        </View>

        {/* Options for Choice Polls */}
        {['single_choice', 'multiple_choice'].includes(type) && (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
            <Text style={styles.cardSectionLabel}>VOTING OPTIONS</Text>
            {options.map((option, index) => (
              <View key={index} style={styles.optionItem}>
                <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1, flex: 1 }]}>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={theme.colors.placeholder}
                    value={option}
                    onChangeText={(text) => handleOptionChange(text, index)}
                    maxLength={50}
                  />
                </View>
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => removeOption(index)} style={[styles.removeBtn, { backgroundColor: '#fff1f2' }]}>
                    <FontAwesomeIcon icon={faMinus} size={12} color="#e11d48" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={[styles.addOptionBtn, { borderColor: theme.colors.primary, borderWidth: 1, borderStyle: 'dashed' }]} onPress={addOption}>
              <FontAwesomeIcon icon={faPlus} size={14} color={theme.colors.primary} />
              <Text style={[styles.addOptionText, { color: theme.colors.primary }]}>ADD OPTION</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Rating Settings */}
        {type === 'rating' && (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
            <Text style={styles.cardSectionLabel}>RATING SETTINGS</Text>
            <View style={styles.settingsGrid}>
              {[5, 10].map(val => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setSettings({ ...settings, max_rating: val })}
                  style={[
                    styles.settingToggle,
                    { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 },
                    settings.max_rating === val && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primary + '10' }
                  ]}
                >
                  <Text style={[styles.settingLabel, { color: settings.max_rating === val ? theme.colors.primary : theme.colors.text }]}>1 to {val} Stars</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Open-Ended Info */}
        {type === 'open_ended' && (
          <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30', borderWidth: 1, marginTop: 20 }]}>
            <FontAwesomeIcon icon={faAlignLeft} size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              Participants will provide their own free-text responses to your question.
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, marginTop: 20 }]}>
          <Text style={styles.cardSectionLabel}>POLL DURATION</Text>
          <Calendar
            onDayPress={handleDayPress}
            hideExtraDays={true}
            markedDates={{
              [endDate]: { selected: true, marked: true, selectedColor: theme.colors.primary },
            }}
            theme={{
              backgroundColor: theme.colors.card,
              calendarBackground: theme.colors.card,
              textSectionTitleColor: theme.colors.text,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: '#fff',
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.placeholder,
              dotColor: theme.colors.primary,
              arrowColor: theme.colors.primary,
              monthTextColor: theme.colors.text,
            }}
            style={styles.calendar}
          />
          {endDate ? (
            <View style={[styles.datePreview, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.datePreviewText, { color: theme.colors.text }]}>ENDS ON: {new Date(endDate).toLocaleDateString()}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.createBtnContainer, { marginTop: 30 }]}
          onPress={handleCreatePoll}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createBtn}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesomeIcon icon={faCheckCircle} size={18} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.createBtnText}>Create Poll</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default React.memo(CreatePollScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroContainer: {
    padding: 24,
    paddingTop: 40,
    elevation: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -1,
  },
  heroDescription: {
    color: '#e0e7ff',
    fontSize: 14,
    fontWeight: '500',
  },
  backButtonHero: { marginRight: 12 },
  iconBoxHero: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: { padding: 24, borderRadius: 32, elevation: 0 },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  typeGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginTop: 10 
  },
  typeItem: { 
    width: '48%', 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10
  },
  typeLabel: { fontSize: 12, fontWeight: '800' },
  inputGroup: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  inputLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  charCount: { fontSize: 10, fontWeight: '700', color: '#cbd5e1' },
  inputWrapper: { borderRadius: 16, paddingHorizontal: 16, height: 56, justifyContent: 'center' },
  input: { fontSize: 15, fontWeight: '600', flex: 1 },
  optionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  removeBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 16, marginTop: 8 },
  addOptionText: { fontSize: 11, fontWeight: '900', marginLeft: 8, letterSpacing: 1 },
  settingsGrid: { flexDirection: 'row', gap: 12 },
  settingToggle: { flex: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '800' },
  infoBox: { padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  calendar: { borderRadius: 16, overflow: 'hidden' },
  datePreview: { padding: 12, borderRadius: 12, marginTop: 12, alignItems: 'center' },
  datePreviewText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  createBtnContainer: { marginBottom: 20 },
  createBtn: { height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
});