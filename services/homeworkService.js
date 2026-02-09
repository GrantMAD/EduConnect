import { supabase } from '../lib/supabase';

export const fetchHomework = async ({ userId, userRole, schoolId, childIds = [] }) => {
    try {
        let selectStr = '*, created_by_user:users!created_by(full_name, email)';
        if (userRole === 'student' || userRole === 'parent') {
            selectStr += ', student_completions(id, student_id, score, total_possible)';
        }

        let query = supabase.from('homework').select(selectStr);

        if (userRole === 'student') {
            query = query.filter('student_completions.student_id', 'eq', userId);
        } else if (userRole === 'parent' && childIds.length > 0) {
            query = query.filter('student_completions.student_id', 'in', `(${childIds.join(',')})`);
        }

        if (userRole === 'student' || userRole === 'parent') {
            const targetUsers = userRole === 'student' ? [userId] : childIds;
            if (targetUsers.length > 0) {
                const { data: members } = await supabase
                    .from('class_members')
                    .select('class_id')
                    .in('user_id', targetUsers);

                const classIds = [...new Set(members?.map(m => m.class_id) || [])];
                if (classIds.length > 0) {
                    query = query.in('class_id', classIds);
                } else {
                    return [];
                }
            } else {
                return [];
            }
        }

        const { data, error } = await query.order('due_date', { ascending: true }).limit(50);
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in homeworkService.fetchHomework:', error);
        throw error;
    }
};

export const fetchHomeworkByClass = async (classId) => {
    const { data, error } = await supabase
        .from('homework')
        .select('*, created_by_user:users!created_by(full_name, email)')
        .eq('class_id', classId)
        .order('due_date', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const updateHomework = async (id, homeworkData) => {
    const { data, error } = await supabase
        .from('homework')
        .update(homeworkData)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data[0];
};

export const deleteHomework = async (id) => {
    const { error } = await supabase.from('homework').delete().eq('id', id);
    if (error) throw error;
    return true;
};

export const createHomework = async (homeworkData) => {
    const { data, error } = await supabase
        .from('homework')
        .insert([homeworkData])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const fetchHomeworkSchedules = async (classId) => {
    const { data, error } = await supabase
        .from('class_schedules')
        .select('id, start_time, title')
        .eq('class_id', classId);

    if (error) throw error;
    return data || [];
};

export const fetchUpcomingHomework = async (classIds, limit = 1) => {
    if (!classIds || classIds.length === 0) return { data: [], count: 0 };
    const now = new Date().toISOString();
    const { data, count, error } = await supabase
        .from('homework')
        .select('due_date', { count: 'exact' })
        .in('class_id', classIds)
        .gt('due_date', now)
        .order('due_date', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return { data, count };
};
