import { supabase } from '../lib/supabase';

export const fetchPTMSlots = async (schoolId, teacherId = null) => {
    let query = supabase
        .from('ptm_slots')
        .select('*, teacher:users!teacher_id(full_name)')
        .eq('school_id', schoolId)
        .order('start_time', { ascending: true });

    if (teacherId) {
        query = query.eq('teacher_id', teacherId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const createPTMSlots = async (slots) => {
    const { data, error } = await supabase
        .from('ptm_slots')
        .insert(slots)
        .select();
    
    if (error) throw error;
    return data || [];
};

export const deletePTMSlot = async (slotId) => {
    const { error } = await supabase
        .from('ptm_slots')
        .delete()
        .eq('id', slotId);
    
    if (error) throw error;
    return true;
};

export const fetchPTMBookings = async (userId, role) => {
    let query = supabase
        .from('ptm_bookings')
        .select('*, slot:ptm_slots(*, teacher:users!teacher_id(full_name)), parent:users!parent_id(full_name), student:users!student_id(full_name)');

    if (role === 'teacher') {
        // Bookings where the teacher's slots are booked
        // Need to filter by slot.teacher_id which is complex in Supabase JS
        // Might need a join or separate fetch
    } else if (role === 'parent') {
        query = query.eq('parent_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const bookPTMSlot = async (bookingData) => {
    // 1. Create booking
    const { data, error } = await supabase
        .from('ptm_bookings')
        .insert([bookingData])
        .select();
    
    if (error) throw error;

    // 2. Mark slot as booked
    await supabase
        .from('ptm_slots')
        .update({ is_booked: true })
        .eq('id', bookingData.slot_id);

    return data[0];
};

export const cancelPTMBooking = async (bookingId, slotId) => {
    const { error } = await supabase
        .from('ptm_bookings')
        .delete()
        .eq('id', bookingId);
    
    if (error) throw error;

    if (slotId) {
        await supabase
            .from('ptm_slots')
            .update({ is_booked: false })
            .eq('id', slotId);
    }
    
    return true;
};

export const fetchTodayPTMBookings = async (userId, role) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    let query = supabase
        .from('ptm_bookings')
        .select('*, slot:ptm_slots!inner(*)');

    if (role === 'parent') {
        query = query
            .eq('parent_id', userId)
            .gte('slot.start_time', startOfDay)
            .lte('slot.start_time', endOfDay);
    } else if (role === 'teacher') {
        query = query
            .eq('slot.teacher_id', userId)
            .gte('slot.start_time', startOfDay)
            .lte('slot.start_time', endOfDay);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const fetchTeacherSlots = async (teacherId) => {
    const { data, error } = await supabase
        .from('ptm_slots')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('start_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
};

export const fetchTeacherPTMBookings = async (teacherId) => {
    const { data, error } = await supabase
        .from('ptm_bookings')
        .select(`
            *,
            slot:ptm_slots(*),
            parent:users!parent_id(full_name, email, avatar_url),
            student:users!student_id(full_name, avatar_url)
        `)
        .eq('ptm_slots.teacher_id', teacherId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const fetchParentPTMBookings = async (parentId) => {
    const { data, error } = await supabase
        .from('ptm_bookings')
        .select(`
            *,
            slot:ptm_slots(*, teacher:users!teacher_id(full_name, email, avatar_url)),
            student:users!student_id(full_name, avatar_url)
        `)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
};

export const fetchPTMBookingBySlotId = async (slotId) => {
    const { data, error } = await supabase
        .from('ptm_bookings')
        .select('parent_id, student:users!student_id(full_name)')
        .eq('slot_id', slotId)
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const fetchAvailableTeacherSlots = async (teacherId) => {
    const { data, error } = await supabase
        .from('ptm_slots')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('is_booked', false)
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
};

