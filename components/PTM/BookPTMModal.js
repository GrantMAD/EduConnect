import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faCalendarAlt,
  faClock,
  faCheck,
  faInfoCircle,
  faUser,
  faStickyNote,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import StandardBottomModal from '../StandardBottomModal';

const defaultUserImage = require('../../assets/user.png');

export default function BookPTMModal({ isOpen, onClose, teacher, onRefresh }) {
  const [user, setUser] = useState(null);
  const { showToast } = useToast();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const getUser = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);
      };
      getUser();
    }
  }, [isOpen]);

  // Data State
  const [slots, setSlots] = useState([]);
  const [children, setChildren] = useState([]);

  // Selection State
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && teacher && user) {
      fetchInitialData();
    }
  }, [isOpen, teacher, user]);

  const fetchInitialData = async () => {
    setFetchingSlots(true);
    try {
      // 1. Fetch children
      const { data: relData } = await supabase
        .from('parent_child_relationships')
        .select('child:users!child_id(id, full_name, email, avatar_url)')
        .eq('parent_id', user.id);

      const childrenList = relData?.map(r => r.child) || [];
      setChildren(childrenList);
      if (childrenList.length > 0) setSelectedChildId(childrenList[0].id);

      // 2. Fetch available slots for this teacher
      const { data: slotsData } = await supabase
        .from('ptm_slots')
        .select('*')
        .eq('teacher_id', teacher.id)
        .eq('is_booked', false)
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      setSlots(slotsData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingSlots(false);
    }
  };

  const handleBook = async () => {
    if (!selectedSlotId || !selectedChildId) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('ptm_bookings')
        .insert([{
          slot_id: selectedSlotId,
          parent_id: user.id,
          student_id: selectedChildId,
          notes: notes,
          status: 'scheduled'
        }]);

      if (error) throw error;

      showToast('Meeting booked successfully!', 'success');

      // Notify teacher
      await supabase.from('notifications').insert([{
        user_id: teacher.id,
        type: 'new_ptm_booking',
        title: 'New Meeting Booked',
        message: `A parent has booked a meeting with you for their child.`,
        related_user_id: user.id,
        is_read: false
      }]);

      onRefresh();
      onClose();
    } catch (error) {
      showToast('Failed to book meeting. The slot might have just been taken.', 'error');
      fetchInitialData();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !teacher) return null;

  return (
    <StandardBottomModal
      visible={isOpen}
      onClose={onClose}
      title={`Book with ${teacher.full_name}`}
      icon={faCalendarAlt}
    >
      <ScrollView style={styles.content}>
        {/* Child Selection */}
        <Text style={[styles.sectionTitle, { color: theme.colors.placeholder }]}>1. SELECT STUDENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childScroll}>
          {children.map(child => (
            <TouchableOpacity
              key={child.id}
              onPress={() => setSelectedChildId(child.id)}
              style={[
                styles.childCard,
                { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
                selectedChildId === child.id && { borderColor: theme.colors.primary, borderWidth: 2 }
              ]}
            >
              <Image
                source={child.avatar_url ? { uri: child.avatar_url } : defaultUserImage}
                style={styles.childAvatar}
              />
              <Text style={[styles.childName, { color: theme.colors.text }]} numberOfLines={1}>{child.full_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slot Selection */}
        <Text style={[styles.sectionTitle, { color: theme.colors.placeholder }]}>2. CHOOSE TIME SLOT</Text>
        {fetchingSlots ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 20 }} />
        ) : slots.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.colors.inputBackground }]}>
            <Text style={{ color: theme.colors.placeholder }}>No available slots for this teacher.</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map(slot => (
              <TouchableOpacity
                key={slot.id}
                onPress={() => setSelectedSlotId(slot.id)}
                style={[
                  styles.slotBtn,
                  { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder },
                  selectedSlotId === slot.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                ]}
              >
                <Text style={[styles.slotDate, { color: selectedSlotId === slot.id ? '#fff' : theme.colors.placeholder }]}>
                  {new Date(slot.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text style={[styles.slotTime, { color: selectedSlotId === slot.id ? '#fff' : theme.colors.text }]}>
                  {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Notes */}
        <Text style={[styles.sectionTitle, { color: theme.colors.placeholder }]}>3. ADDITIONAL NOTES</Text>
        <View style={[styles.notesContainer, { backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.cardBorder }]}>
          <FontAwesomeIcon icon={faStickyNote} color={theme.colors.placeholder} size={16} style={styles.notesIcon} />
          <TextInput
            style={[styles.notesInput, { color: theme.colors.text }]}
            placeholder="What would you like to discuss?"
            placeholderTextColor={theme.colors.placeholder}
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <TouchableOpacity
          onPress={handleBook}
          disabled={loading || !selectedSlotId || !selectedChildId}
          style={[styles.submitBtn, { backgroundColor: theme.colors.primary, opacity: (loading || !selectedSlotId || !selectedChildId) ? 0.6 : 1 }]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <FontAwesomeIcon icon={faCheck} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </StandardBottomModal>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  childScroll: { marginBottom: 24 },
  childCard: {
    width: 100,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginRight: 12
  },
  childAvatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
  childName: { fontSize: 12, fontWeight: 'bold' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  slotBtn: {
    width: '31%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10
  },
  slotDate: { fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  slotTime: { fontSize: 13, fontWeight: 'bold' },
  emptyBox: { padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
  notesContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 32,
    alignItems: 'flex-start'
  },
  notesIcon: { marginTop: 4, marginRight: 8 },
  notesInput: { flex: 1, fontSize: 14, textAlignVertical: 'top' },
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
