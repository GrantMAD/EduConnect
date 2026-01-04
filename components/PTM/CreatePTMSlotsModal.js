import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faPlus,
  faInfoCircle,
  faMapMarkerAlt,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import StandardBottomModal from '../StandardBottomModal';

const CreatePTMSlotsModal = React.memo(({ isOpen, onClose, onRefresh }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const { showToast } = useToast();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const getAuthData = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setUser(authUser);
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
          setProfile(profileData);
        }
      };
      getAuthData();
    }
  }, [isOpen]);

  // Form State
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(new Date().getHours() + 3)));
  const [duration, setDuration] = useState(15);
  const [meetingType, setMeetingType] = useState('in_person');
  const [location, setLocation] = useState('');

  // Picker visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSubmit = async () => {
    if (!date || !profile?.school_id) {
      showToast('Profile data is still loading or incomplete.', 'error');
      return;
    }
    setLoading(true);

    try {
      const generatedSlots = [];
      const dateStr = date.toISOString().split('T')[0];

      const startDateTime = new Date(dateStr + 'T' + startTime.toTimeString().split(' ')[0]);
      const endDateTime = new Date(dateStr + 'T' + endTime.toTimeString().split(' ')[0]);

      let current = new Date(startDateTime);
      const end = new Date(endDateTime);

      while (current < end) {
        const next = new Date(current.getTime() + duration * 60000);
        if (next > end) break;

        generatedSlots.push({
          school_id: profile.school_id,
          teacher_id: user.id,
          start_time: current.toISOString(),
          end_time: next.toISOString(),
          meeting_type: meetingType,
          location: location,
          is_booked: false
        });
        current = next;
      }

      if (generatedSlots.length === 0) {
        throw new Error('No slots could be generated with current settings.');
      }

      const { error } = await supabase.from('ptm_slots').insert(generatedSlots);
      if (error) {
        if (error.code === '23P01') {
          throw new Error('One or more slots overlap with your existing schedule.');
        }
        throw error;
      }

      showToast(`Successfully created ${generatedSlots.length} slots!`, 'success');
      onRefresh();
      onClose();
    } catch (error) {
      showToast(error.message || 'Failed to create slots.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const onStartChange = (event, selectedTime) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedTime) setStartTime(selectedTime);
  };

  const onEndChange = (event, selectedTime) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedTime) setEndTime(selectedTime);
  };

  return (
    <StandardBottomModal
      visible={isOpen}
      onClose={onClose}
      title="Availability Matrix"
      icon={faCalendarAlt}
    >
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: '#94a3b8' }]}>SESSION DATE</Text>
          <TouchableOpacity
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, { color: theme.colors.text }]}>{date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}</Text>
            <FontAwesomeIcon icon={faCalendarAlt} color={theme.colors.placeholder} size={14} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.label, { color: '#94a3b8' }]}>START</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.inputText, { color: theme.colors.text }]}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <FontAwesomeIcon icon={faClock} color={theme.colors.placeholder} size={14} />
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={startTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onStartChange}
              />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.label, { color: '#94a3b8' }]}>END</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
              onPress={() => setShowEndPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.inputText, { color: theme.colors.text }]}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <FontAwesomeIcon icon={faClock} color={theme.colors.placeholder} size={14} />
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={endTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onEndChange}
              />
            )}
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={[styles.label, { color: '#94a3b8' }]}>DURATION</Text>
            <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <Picker
                selectedValue={duration}
                onValueChange={(v) => setDuration(v)}
                style={{ color: theme.colors.text }}
                dropdownIconColor={theme.colors.text}
              >
                <Picker.Item label="15 Min Slots" value={15} />
                <Picker.Item label="20 Min Slots" value={20} />
                <Picker.Item label="30 Min Slots" value={30} />
              </Picker>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.label, { color: '#94a3b8' }]}>FORMAT</Text>
            <View style={[styles.pickerContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
              <Picker
                selectedValue={meetingType}
                onValueChange={(v) => setMeetingType(v)}
                style={{ color: theme.colors.text }}
                dropdownIconColor={theme.colors.text}
              >
                <Picker.Item label="In-Person" value="in_person" />
                <Picker.Item label="Video Call" value="video" />
                <Picker.Item label="Phone Call" value="phone" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: '#94a3b8' }]}>LOCATION / URL</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1, color: theme.colors.text }]}
            placeholder={meetingType === 'video' ? 'https://meet.google.com/...' : 'e.g. Science Lab'}
            placeholderTextColor={theme.colors.placeholder}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10' }]}>
          <FontAwesomeIcon icon={faInfoCircle} color={theme.colors.primary} size={14} style={{ marginTop: 2 }} />
          <Text style={[styles.infoText, { color: theme.colors.primary }]}>
            Slots will be generated back-to-back within the selected timeframe.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
          activeOpacity={0.8}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.submitBtnText}>GENERATE SLOTS</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </StandardBottomModal>
  );
});

const styles = StyleSheet.create({
  form: { padding: 16 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 9, fontWeight: '900', marginBottom: 8, letterSpacing: 1.5 },
  input: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: { fontSize: 14, fontWeight: '800' },
  textInput: { height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pickerContainer: { height: 56, borderRadius: 16, justifyContent: 'center' },
  infoBox: { flexDirection: 'row', padding: 16, borderRadius: 20, marginBottom: 24, gap: 12 },
  infoText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40
  },
  submitBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 }
});

export default CreatePTMSlotsModal;
