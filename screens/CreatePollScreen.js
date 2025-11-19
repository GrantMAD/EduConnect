import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useSchool } from '../context/SchoolContext';
import { useTheme } from '../context/ThemeContext';
import { Picker } from '@react-native-picker/picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faPlus, faMinus, faQuestionCircle, faListOl, faUsers, faCalendar } from '@fortawesome/free-solid-svg-icons';
import { Calendar } from 'react-native-calendars';

export default function CreatePollScreen({ navigation }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [targetRoles, setTargetRoles] = useState(['all']);
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { schoolId } = useSchool();
  const { theme } = useTheme();

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
      alert('Please fill out the question and all options.');
      return;
    }

    if (!endDate) {
      alert('Please select an end date for the poll.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const pollData = {
        question,
        options,
        created_by: user.id,
        school_id: schoolId,
        target_roles: targetRoles,
        end_date: new Date(endDate).toISOString(),
      };

      // Insert the poll
      const { data: insertedPoll, error: pollError } = await supabase.from('polls').insert([pollData]).select();

      if (pollError) throw pollError;

      const newPoll = insertedPoll[0];

      // Fetch users to notify based on target_roles
      let usersQuery = supabase
        .from('users')
        .select('id')
        .eq('school_id', schoolId)
        .neq('id', user.id); // Don't notify the creator

      // Filter by roles if not 'all'
      if (!targetRoles.includes('all')) {
        usersQuery = usersQuery.in('role', targetRoles);
      }

      const { data: usersToNotify, error: usersError } = await usersQuery;

      if (usersError) {
        console.error('Error fetching users to notify:', usersError);
      } else if (usersToNotify && usersToNotify.length > 0) {
        // Create notifications for all target users
        const notifications = usersToNotify.map(targetUser => ({
          user_id: targetUser.id,
          type: 'new_poll',
          title: 'New Poll Available',
          message: `A new poll has been created: "${question}"`,
          data: { poll_id: newPoll.id },
          is_read: false,
        }));

        const { error: notifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error creating notifications:', notifError);
        }
      }

      navigation.navigate('Polls', { pollCreated: true });
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={[styles.header, { color: theme.colors.text }]}>Create a New Poll</Text>
      <Text style={[styles.description, { color: theme.colors.text }]}>
        Create a poll to gather opinions from the school community.
      </Text>

      <View style={styles.inputContainer}>
        <FontAwesomeIcon icon={faQuestionCircle} size={20} color={theme.colors.primary} style={styles.icon} />
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Poll Question"
          placeholderTextColor={theme.colors.placeholder}
          value={question}
          onChangeText={setQuestion}
        />
      </View>

      <Text style={[styles.label, { color: theme.colors.text }]}>Options</Text>
      <Text style={[styles.labelDescription, { color: theme.colors.text }]}>
        Provide at least two options for your poll.
      </Text>
      {options.map((option, index) => (
        <View key={index} style={styles.optionContainer}>
          <FontAwesomeIcon icon={faListOl} size={20} color={theme.colors.primary} style={styles.icon} />
          <TextInput
            style={[styles.optionInput, { backgroundColor: theme.colors.inputBackground, color: theme.colors.text, borderColor: theme.colors.border }]}
            placeholder={`Option ${index + 1}`}
            placeholderTextColor={theme.colors.placeholder}
            value={option}
            onChangeText={(text) => handleOptionChange(text, index)}
          />
          {options.length > 2 && (
            <TouchableOpacity onPress={() => removeOption(index)}>
              <View style={[styles.removeOptionButton, { backgroundColor: theme.colors.error }]}>
                <FontAwesomeIcon icon={faMinus} size={16} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      ))}
      <TouchableOpacity style={styles.addOptionButton} onPress={addOption}>
        <FontAwesomeIcon icon={faPlus} size={16} color={theme.colors.primary} />
        <Text style={[styles.addOptionButtonText, { color: theme.colors.primary }]}>Add Option</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: theme.colors.text }]}>Visible to:</Text>
      <Text style={[styles.labelDescription, { color: theme.colors.text }]}>
        Select which user roles can see and participate in this poll.
      </Text>
      <View style={[styles.pickerContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }]}>
        <FontAwesomeIcon icon={faUsers} size={20} color={theme.colors.primary} style={styles.icon} />
        <Picker
          selectedValue={targetRoles.join(',')}
          onValueChange={(itemValue) => setTargetRoles(itemValue.split(','))}
          style={[styles.picker, { color: theme.colors.text }]}
        >
          <Picker.Item label="All Users" value="all" />
          <Picker.Item label="Teachers" value="teacher" />
          <Picker.Item label="Parents" value="parent" />
          <Picker.Item label="Students" value="student" />
        </Picker>
      </View>

      <Text style={[styles.label, { color: theme.colors.text }]}>Poll End Date:</Text>
      <Text style={[styles.labelDescription, { color: theme.colors.text }]}>
        Select when this poll should close and stop accepting votes.
      </Text>
      <Calendar
        minDate={new Date().toISOString().split('T')[0]}
        onDayPress={(day) => {
          setEndDate(day.dateString);
        }}
        markedDates={{
          [endDate]: { selected: true, marked: true, selectedColor: theme.colors.primary },
        }}
        style={styles.calendar}
        theme={{
          backgroundColor: theme.colors.background,
          calendarBackground: theme.colors.background,
          dayTextColor: theme.colors.text,
          textDisabledColor: theme.colors.placeholder,
          monthTextColor: theme.colors.text,
          textSectionTitleColor: theme.colors.text,
          selectedDayBackgroundColor: theme.colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: theme.colors.primary,
          arrowColor: theme.colors.primary,
          dotColor: theme.colors.primary,
        }}
      />
      {endDate ? (
        <View style={styles.selectedDateCard}>
          <Text style={[styles.selectedDateText, { color: theme.colors.text }]}>Selected End Date: {endDate}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreatePoll}
        disabled={isSubmitting}
      >
        <Text style={styles.createButtonText}>{isSubmitting ? 'Creating poll...' : 'Create Poll'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
  },
  icon: {
    marginRight: 12,
    marginLeft: 8,
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  labelDescription: {
    fontSize: 14,
    marginBottom: 16,
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
    padding: 16,
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
    borderColor: '#007AFF',
    marginBottom: 24,
  },
  addOptionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 24,
  },
  picker: {
    flex: 1,
  },
  createButton: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  calendar: {
    marginBottom: 10,
  },
  selectedDateCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
