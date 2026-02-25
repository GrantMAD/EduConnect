import { supabase } from '../lib/supabase';

export const fetchHomework = async ({ userId, userRole, schoolId, childIds = [], class_id, page = 1, pageSize = 10 }) => {
    try {
        let selectStr = '*, created_by_user:users!created_by(full_name, email), lesson_plans(id, title, objectives), homework_resources(resources(*))';
        if (userRole === 'student' || userRole === 'parent') {
            selectStr += ', student_completions(id, student_id, score, total_possible)';
        }

        let query = supabase.from('homework').select(selectStr, { count: 'exact' });

        if (class_id) {
            query = query.eq('class_id', class_id);
        }

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
                    return { data: [], count: 0 };
                }
            } else {
                return { data: [], count: 0 };
            }
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query
            .order('due_date', { ascending: true })
            .range(from, to);

        if (error) throw error;

        // Format the nested junction data into a flat array of resources
        const formattedData = data?.map(item => ({
            ...item,
            resources: item.homework_resources?.map(hr => hr.resources).filter(Boolean) || []
        })) || [];

        return { data: formattedData, count: count || 0 };
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
    const { resourceIds, ...rest } = homeworkData;
    const { data, error } = await supabase
        .from('homework')
        .update(rest)
        .eq('id', id)
        .select();

    if (error) throw error;

    if (resourceIds) {
        await supabase.from('homework_resources').delete().eq('homework_id', id);
        if (resourceIds.length > 0) {
            const links = resourceIds.map(rid => ({ homework_id: id, resource_id: rid }));
            await supabase.from('homework_resources').insert(links);
        }
    }

    return data[0];
};

export const deleteHomework = async (id) => {
    const { error } = await supabase.from('homework').delete().eq('id', id);
    if (error) throw error;
    return true;
};

export const createHomework = async (homeworkData) => {
    const { resourceIds, ...rest } = homeworkData;
    const { data, error } = await supabase
        .from('homework')
        .insert([rest])
        .select()
        .single();

    if (error) throw error;

    if (resourceIds && resourceIds.length > 0) {
        const links = resourceIds.map(rid => ({ homework_id: data.id, resource_id: rid }));
        await supabase.from('homework_resources').insert(links);
    }

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

export const fetchUpcomingHomeworkBulk = async (classIds) => {
    if (!classIds || classIds.length === 0) return [];
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('homework')
        .select('id, class_id, due_date')
        .in('class_id', classIds)
        .gt('due_date', now)
        .order('due_date', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const fetchHomeworkById = async (id) => {
    const { data, error } = await supabase
        .from('homework')
        .select('*, created_by_user:users!created_by(full_name, avatar_url), lesson_plans(id, title, objectives), homework_resources(resources(*))')
        .eq('id', id)
        .single();

    if (error) throw error;

    // Format resources
    return {
        ...data,
        resources: data.homework_resources?.map(hr => hr.resources).filter(Boolean) || []
    };
};
