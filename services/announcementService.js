import { supabase } from '../lib/supabase';

export const fetchAnnouncements = async (classId) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, author:users(full_name)')
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getAnnouncementsQuery = ({ schoolId, userRole, userClasses, from, to }) => {
  let query = supabase.from('announcements')
    .select('*, author:users(full_name), class:classes(name)')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (userRole === 'admin') {
    // Admin sees all
  } else if (['teacher', 'student', 'parent'].includes(userRole)) {
    if (userClasses && userClasses.length > 0) {
      query = query.or(`class_id.is.null,class_id.in.(${userClasses.join(',')})`);
    } else {
      query = query.is('class_id', null);
    }
  } else {
    query = query.is('class_id', null);
  }

  return query;
};

export const createAnnouncement = async (announcementData) => {
  const { add_to_calendar, event_date, event_start_time, event_end_time, ...data } = announcementData;

  // 1. Create the announcement
  const { data: createdAnnouncement, error } = await supabase
    .from('announcements')
    .insert([data])
    .select();

  if (error) throw error;
  const finalAnnouncement = createdAnnouncement[0];

  // 2. Create calendar event if requested
  if (add_to_calendar && event_date) {
    try {
      await supabase.from('events').insert([{
        title: data.title,
        description: data.message,
        date: event_date,
        start_time: event_start_time,
        end_time: event_end_time,
        school_id: data.school_id,
        created_by: data.posted_by,
        class_id: data.class_id,
        announcement_id: finalAnnouncement.id
      }]);
    } catch (eventError) {
      console.error('Error creating linked calendar event:', eventError);
      // We don't throw here to ensure the announcement remains created
    }
  }

  return finalAnnouncement;
};

export const updateAnnouncement = async (id, announcementData) => {
  const { data, error } = await supabase
    .from('announcements')
    .update(announcementData)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteAnnouncement = async (id) => {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

export const getAnnouncementsByPostedBy = async (userId) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, author:users(full_name), class:classes(name)')
    .eq('posted_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const deleteAnnouncementsByUser = async (userId) => {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('posted_by', userId);

  if (error) throw error;
  return true;
};
