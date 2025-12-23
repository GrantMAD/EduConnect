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

export default function CreatePTMSlotsModal({ isOpen, onClose, onRefresh }) {
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
      title="Set Availability"
      icon={faCalendarAlt}
    >
      <ScrollView style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.placeholder }]}>SESSION DATE</Text>
        <TouchableOpacity
          style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: theme.colors.text }}>{date.toLocaleDateString()}</Text>
          <FontAwesomeIcon icon={faCalendarAlt} color={theme.colors.placeholder} size={16} />
        </TouchableOpacity>
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
            <Text style={[styles.label, { color: theme.colors.placeholder }]}>START TIME</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={{ color: theme.colors.text }}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <FontAwesomeIcon icon={faClock} color={theme.colors.placeholder} size={16} />
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
            <Text style={[styles.label, { color: theme.colors.placeholder }]}>END TIME</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={{ color: theme.colors.text }}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              <FontAwesomeIcon icon={faClock} color={theme.colors.placeholder} size={16} />
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
            <Text style={[styles.label, { color: theme.colors.placeholder }]}>SLOT DURATION</Text>
            <View style={[styles.pickerContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
              <Picker
                selectedValue={duration}
                onValueChange={(v) => setDuration(v)}
                style={{ color: theme.colors.text }}
                dropdownIconColor={theme.colors.text}
              >
                <Picker.Item label="10 Min" value={10} />
                <Picker.Item label="15 Min" value={15} />
                <Picker.Item label="20 Min" value={20} />
                <Picker.Item label="30 Min" value={30} />
              </Picker>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.label, { color: theme.colors.placeholder }]}>MEETING TYPE</Text>
            <View style={[styles.pickerContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
              <Picker
                selectedValue={meetingType}
                onValueChange={(v) => setMeetingType(v)}
                style={{ color: theme.colors.text }}
                dropdownIconColor={theme.colors.text}
              >
                <Picker.Item label="In Person" value="in_person" />
                <Picker.Item label="Video" value="video" />
                <Picker.Item label="Phone" value="phone" />
              </Picker>
            </View>
          </View>
        </View>

        <Text style={[styles.label, { color: theme.colors.placeholder }]}>LOCATION / LINK</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder, color: theme.colors.text }]}
          placeholder={meetingType === 'video' ? 'Enter meeting URL' : 'e.g. Room 402'}
          placeholderTextColor={theme.colors.placeholder}
          value={location}
          onChangeText={setLocation}
        />

        <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10' }]}>
          <FontAwesomeIcon icon={faInfoCircle} color={theme.colors.primary} size={14} style={{ marginTop: 2 }} />
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            This will generate back-to-back slots for the selected timeframe.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <FontAwesomeIcon icon={faPlus} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Generate Slots</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </StandardBottomModal>
  );
}

const styles = StyleSheet.create({
  form: { padding: 16 },
  label: { fontSize: 10, fontWeight: 'bold', marginBottom: 8, letterSpacing: 1 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pickerContainer: { height: 50, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  infoBox: { flexDirection: 'row', padding: 12, borderRadius: 12, marginBottom: 20, gap: 8 },
  infoText: { fontSize: 12, lineHeight: 18, flex: 1 },
  submitBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
