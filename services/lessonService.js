import { supabase } from '../lib/supabase';

export const fetchLessonTopics = async (classId) => {
    const { data, error } = await supabase
        .from('lesson_topics')
        .select('*')
        .eq('class_id', classId)
        .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const saveLessonTopic = async (topicData) => {
    const { data, error } = await supabase
        .from('lesson_topics')
        .upsert(topicData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteLessonTopic = async (topicId) => {
    const { error } = await supabase
        .from('lesson_topics')
        .delete()
        .eq('id', topicId);

    if (error) throw error;
};

export const fetchLessonPlans = async (classId, role = 'student') => {
    let query = supabase
        .from('lesson_plans')
        .select(`
            *,
            topic:lesson_topics(id, name)
        `)
        .eq('class_id', classId);

    if (role === 'student' || role === 'parent') {
        query = query.in('status', ['published', 'completed']);
    }

    const { data, error } = await query.order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const saveLessonPlan = async (planData) => {
    const { data, error } = await supabase
        .from('lesson_plans')
        .upsert(planData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteLessonPlan = async (planId) => {
    const { error } = await supabase
        .from('lesson_plans')
        .delete()
        .eq('id', planId);

    if (error) throw error;
};

export const fetchUpcomingLessons = async (classIds) => {
    if (!classIds || classIds.length === 0) return [];

    const { data, error } = await supabase
        .from('lesson_plans')
        .select(`
            *,
            class:classes(id, name)
        `)
        .in('class_id', classIds)
        .in('status', ['published', 'completed'])
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(5);

    if (error) throw error;
    return data || [];
};
