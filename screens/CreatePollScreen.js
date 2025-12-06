import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useTheme } from '../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faMinus, faQuestionCircle, faListOl, faCalendar, faArrowLeft, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';
import { useGamification } from '../context/GamificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreatePollScreen({ navigation, route }) {
  const { fromDashboard } = route.params || {};
  const gamificationData = useGamification();
  const { awardXP = () => { } } = gamificationData || {};
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { schoolId } = useSchool();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleOptionChange = (text, index) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleCreatePoll = async () => {
    if (!question.trim() || options.some(opt => !opt.trim())) {
      Alert.alert('Error', 'Please fill out the question and all options.');
      return;
    }

    if (!endDate) {
      Alert.alert('Error', 'Please select an end date for the poll.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const pollData = {
        question,
        options,
        end_date: endDate,
        school_id: schoolId,
        created_by: user.id,
        is_active: true,
      };

      const { data: newPoll, error } = await supabase
        .from('polls')
        .insert([pollData])
        .select()
        .single();

      if (error) throw error;

      // Notification Logic
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, notification_preferences')
        .eq('school_id', schoolId);

      if (!usersError) {
        const recipients = users.filter(u => {
          // Exclude the creator
          if (u.id === user.id) return false;
          // Check notification preferences
          const prefs = u.notification_preferences;
          // Assuming there's a specific preference for 'polls', or falling back to a general one?
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
          await supabase.from('notifications').insert(notifications);
        }
      }



      awardXP('content_creation', 15);
      Alert.alert('Success', 'Poll created successfully! +15 XP');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating poll:', error);
      Alert.alert('Error', 'Failed to create poll. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <FontAwesomeIcon icon={faArrowLeft} size={20} color="#007AFF" />
        <Text style={styles.backButtonText}>Back to Polls</Text>
      </TouchableOpacity>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: theme.colors.text }]}>Create New Poll</Text>
      </View>

      <Text style={[styles.description, { color: theme.colors.placeholder }]}>
        Engage your school community by creating a poll.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={styles.inputContainer}>
          <FontAwesomeIcon icon={faQuestionCircle} size={20} color={theme.colors.primary} style={styles.icon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.colors.text }]}>Question</Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}
              placeholder="What would you like to ask?"
              placeholderTextColor={theme.colors.placeholder}
              value={question}
              onChangeText={setQuestion}
              multiline
            />
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <FontAwesomeIcon icon={faListOl} size={20} color={theme.colors.primary} style={styles.icon} />
          <Text style={[styles.label, { color: theme.colors.text, marginBottom: 0 }]}>Options</Text>
        </View>

        {options.map((option, index) => (
          <View key={index} style={styles.optionContainer}>
            <TextInput
              style={[styles.optionInput, { color: theme.colors.text, borderColor: theme.colors.inputBorder, backgroundColor: theme.colors.inputBackground }]}
              placeholder={`Option ${index + 1}`}
              placeholderTextColor={theme.colors.placeholder}
              value={option}
              onChangeText={(text) => handleOptionChange(text, index)}
            />
            {options.length > 2 && (
              <TouchableOpacity onPress={() => removeOption(index)} style={[styles.removeOptionButton, { backgroundColor: theme.colors.error }]}>
                <FontAwesomeIcon icon={faMinus} size={12} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={[styles.addOptionButton, { borderColor: theme.colors.primary }]} onPress={addOption}>
          <FontAwesomeIcon icon={faPlus} size={16} color={theme.colors.primary} />
          <Text style={[styles.addOptionButtonText, { color: theme.colors.primary }]}>Add Option</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <FontAwesomeIcon icon={faCalendar} size={20} color={theme.colors.primary} style={styles.icon} />
          <Text style={[styles.label, { color: theme.colors.text, marginBottom: 0 }]}>End Date</Text>
        </View>

        <Calendar
          onDayPress={(day) => setEndDate(day.dateString)}
          markedDates={{
            [endDate]: { selected: true, marked: true, selectedColor: theme.colors.primary },
          }}
          theme={{
            backgroundColor: theme.colors.surface,
            calendarBackground: theme.colors.surface,
            textSectionTitleColor: theme.colors.text,
            selectedDayBackgroundColor: theme.colors.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: theme.colors.primary,
            dayTextColor: theme.colors.text,
            textDisabledColor: theme.colors.placeholder,
            dotColor: theme.colors.primary,
            selectedDotColor: '#ffffff',
            arrowColor: theme.colors.primary,
            monthTextColor: theme.colors.text,
            indicatorColor: theme.colors.primary,
          }}
          style={styles.calendar}
        />
        {endDate ? (
          <View style={[styles.selectedDateCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
            <Text style={[styles.selectedDateText, { color: theme.colors.text }]}>Selected End Date: {endDate}</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreatePoll}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Text style={styles.createButtonText}>Creating poll...</Text>
        ) : (
          <>
            <FontAwesomeIcon icon={faCheckCircle} size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.createButtonText}>Create Poll</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
    marginLeft: 10,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginRight: 12,
  },
  removeOptionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  addOptionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  createButton: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  calendar: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedDateCard: {
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
