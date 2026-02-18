import { supabase } from '../lib/supabase';

export const fetchAssignments = async ({ userId, userRole, schoolId, childIds = [] }) => {
    try {
        let selectStr = '*, assigned_by_user:users!assigned_by(full_name, email), lesson_plans(id, title, objectives), assignment_resources(resources(*))';
        if (userRole === 'student' || userRole === 'parent') {
            selectStr += ', student_completions(id, student_id, score, total_possible)';
        }

        let query = supabase.from('assignments').select(selectStr);

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

        const { data, error } = await query.order('due_date', { ascending: true });
        if (error) throw error;

        // Format the nested junction data into a flat array of resources
        return data?.map(item => ({
            ...item,
            resources: item.assignment_resources?.map(ar => ar.resources).filter(Boolean) || []
        })) || [];
    } catch (error) {
        console.error('Error in assignmentService.fetchAssignments:', error);
        throw error;
    }
};

export const fetchAssignmentsByClass = async (classId) => {
    const { data, error } = await supabase
        .from('assignments')
        .select('*, assigned_by_user:users!assigned_by(full_name, email), student_completions(id, student_id, score, total_possible)')
        .eq('class_id', classId)
        .order('due_date', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const updateAssignment = async (id, assignmentData) => {
    const { resourceIds, ...rest } = assignmentData;
    const { data, error } = await supabase
        .from('assignments')
        .update(rest)
        .eq('id', id)
        .select();

    if (error) throw error;

    if (resourceIds) {
        await supabase.from('assignment_resources').delete().eq('assignment_id', id);
        if (resourceIds.length > 0) {
            const links = resourceIds.map(rid => ({ assignment_id: id, resource_id: rid }));
            await supabase.from('assignment_resources').insert(links);
        }
    }

    return data[0];
};

export const deleteAssignment = async (id) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
    return true;
};

export const fetchUpcomingAssignments = async (classIds, limit = 1) => {
    if (!classIds || classIds.length === 0) return { data: [], count: 0 };
    const now = new Date().toISOString();
    const { data, count, error } = await supabase
        .from('assignments')
        .select('due_date', { count: 'exact' })
        .in('class_id', classIds)
        .gt('due_date', now)
        .order('due_date', { ascending: true })
        .limit(limit);

    if (error) throw error;
    return { data, count };
};

export const fetchUpcomingAssignmentsBulk = async (classIds) => {
    if (!classIds || classIds.length === 0) return [];
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('assignments')
        .select('id, class_id, due_date')
        .in('class_id', classIds)
        .gt('due_date', now)
        .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const createAssignment = async (assignmentData) => {
    const { resourceIds, ...rest } = assignmentData;
    const { data, error } = await supabase
        .from('assignments')
        .insert([rest])
        .select()
        .single();

    if (error) throw error;

    if (resourceIds && resourceIds.length > 0) {
        const links = resourceIds.map(rid => ({ assignment_id: data.id, resource_id: rid }));
        await supabase.from('assignment_resources').insert(links);
    }

    return data;
};

export const uploadAssignmentFile = async (filePath, fileBody, mimeType) => {
    const { data, error } = await supabase.storage
        .from('assignments')
        .upload(filePath, fileBody, {
            contentType: mimeType,
            upsert: false,
        });

    if (error) throw error;
    return data;
};

export const getAssignmentFileUrl = (filePath) => {
    const { data } = supabase.storage
        .from('assignments')
        .getPublicUrl(filePath);
    return data?.publicUrl;
};
