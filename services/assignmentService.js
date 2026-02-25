import { supabase } from '../lib/supabase';

export const fetchAssignments = async ({ userId, userRole, schoolId, childIds = [], class_id, page = 1, pageSize = 10 }) => {
    try {
        let selectStr = '*, assigned_by_user:users!assigned_by(full_name, email), lesson_plans(id, title, objectives), assignment_resources(resources(*))';
        if (userRole === 'student' || userRole === 'parent') {
            selectStr += ', student_completions(id, student_id, score, total_possible)';
        }

        let query = supabase.from('assignments').select(selectStr, { count: 'exact' });

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
            resources: item.assignment_resources?.map(ar => ar.resources).filter(Boolean) || []
        })) || [];

        return { data: formattedData, count: count || 0 };
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
export const fetchTodayTaskProgress = async ({ userId, role, schoolId }) => {
    if (!userId) return { completed: 0, total: 0, pendingHomework: 0, pendingAssignment: 0 };

    const now = new Date();
    const normalizedRole = role?.toLowerCase();

    // Native isSameDay comparison
    const isSameDayNative = (date1, date2) => {
        return date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate();
    };

    // Calculate a safe search range (+/- 1 day) to handle any UTC shifts from DB
    const startRange = new Date(now);
    startRange.setDate(now.getDate() - 1);
    const endRange = new Date(now);
    endRange.setDate(now.getDate() + 1);

    try {
        let hwQuery = supabase.from('homework').select('id, due_date, class_id, student_completions(id, student_id)');
        let asgQuery = supabase.from('assignments').select('id, due_date, class_id, student_completions(id, student_id)');
        let exmQuery = supabase.from('exam_sessions').select('id, date');

        let parentChildIds = [];
        let classMembersMappings = [];

        if (normalizedRole === 'student' || normalizedRole === 'parent') {
            let userIds = [userId];
            if (normalizedRole === 'parent') {
                const { data: links } = await supabase.from('parent_child_relationships').select('child_id').eq('parent_id', userId);
                parentChildIds = links?.map(l => l.child_id) || [];
                userIds = parentChildIds;
            }

            if (userIds.length === 0) return { completed: 0, total: 0, pendingHomework: 0, pendingAssignment: 0, pendingExam: 0 };

            const { data: members } = await supabase.from('class_members').select('user_id, class_id').in('user_id', userIds);
            classMembersMappings = members || []; // Store for parent logic
            const classIds = [...new Set(classMembersMappings.map(m => m.class_id) || [])];
            if (classIds.length === 0) return { completed: 0, total: 0, pendingHomework: 0, pendingAssignment: 0, pendingExam: 0 };

            hwQuery = hwQuery.in('class_id', classIds);
            asgQuery = asgQuery.in('class_id', classIds);

            // For exams, we need to check sessions linked to these classes
            const { data: sessionLinks } = await supabase.from('exam_papers').select('session_id').in('class_id', classIds);
            const sessionIds = [...new Set(sessionLinks?.map(s => s.session_id) || [])];
            if (sessionIds.length > 0) {
                exmQuery = exmQuery.in('id', sessionIds);
            } else {
                exmQuery = null;
            }
        } else if (normalizedRole === 'teacher') {
            hwQuery = hwQuery.eq('created_by', userId);
            asgQuery = asgQuery.eq('assigned_by', userId);
            exmQuery = exmQuery.eq('created_by', userId);
        } else if (normalizedRole === 'admin' && schoolId) {
            hwQuery = hwQuery.eq('school_id', schoolId);
            asgQuery = supabase.from('assignments')
                .select('id, due_date, class_id, student_completions(id, student_id), classes!inner(school_id)')
                .eq('classes.school_id', schoolId);
            exmQuery = exmQuery.eq('school_id', schoolId);
        } else {
            return { completed: 0, total: 0, pendingHomework: 0, pendingAssignment: 0, pendingExam: 0 };
        }

        const queries = [
            hwQuery.gte('due_date', startRange.toISOString()).lte('due_date', endRange.toISOString()),
            asgQuery.gte('due_date', startRange.toISOString()).lte('due_date', endRange.toISOString())
        ];
        if (exmQuery) {
            queries.push(exmQuery.gte('date', startRange.toISOString()).lte('date', endRange.toISOString()));
        }

        const [hwRes, asgRes, exmRes] = await Promise.all(queries);

        const homeworkToday = (hwRes.data || []).filter(t => isSameDayNative(new Date(t.due_date), now));
        const assignmentsToday = (asgRes.data || []).filter(t => isSameDayNative(new Date(t.due_date), now));
        const examsToday = (exmRes?.data || []).filter(t => isSameDayNative(new Date(t.date), now));
        const allToday = [...homeworkToday, ...assignmentsToday, ...examsToday];

        let completedCount = 0;
        let pendingHomework = homeworkToday.length;
        let pendingAssignment = assignmentsToday.length;
        let pendingExam = examsToday.length;

        if (normalizedRole === 'student') {
            completedCount = allToday.filter(t =>
                t.student_completions?.some(c => c.student_id === userId)
            ).length;

            pendingHomework = homeworkToday.filter(t => !t.student_completions?.some(c => c.student_id === userId)).length;
            pendingAssignment = assignmentsToday.filter(t => !t.student_completions?.some(c => c.student_id === userId)).length;
            // Exams are just scheduled events, usually not "completed" in the same tracking way as tasks here
        } else if (normalizedRole === 'parent') {
            // For parents, a task is pending if ANY of their children in that class haven't completed it
            pendingHomework = homeworkToday.filter(t => {
                const childrenInThisClass = classMembersMappings.filter(m => m.class_id === t.class_id && parentChildIds.includes(m.user_id)).map(m => m.user_id) || [];
                const completedByChildren = t.student_completions?.filter(c => childrenInThisClass.includes(c.student_id)) || [];
                return completedByChildren.length < childrenInThisClass.length;
            }).length;

            pendingAssignment = assignmentsToday.filter(t => {
                const childrenInThisClass = classMembersMappings.filter(m => m.class_id === t.class_id && parentChildIds.includes(m.user_id)).map(m => m.user_id) || [];
                const completedByChildren = t.student_completions?.filter(c => childrenInThisClass.includes(c.student_id)) || [];
                return completedByChildren.length < childrenInThisClass.length;
            }).length;
        }

        return {
            completed: completedCount,
            total: allToday.length,
            pendingHomework,
            pendingAssignment,
            pendingExam
        };
    } catch (error) {
        console.error('Error in fetchTodayTaskProgress:', error);
        return { completed: 0, total: 0, pendingHomework: 0, pendingAssignment: 0 };
    }
};
export const fetchAssignmentById = async (id) => {
    const { data, error } = await supabase
        .from('assignments')
        .select('*, assigned_by_user:users!assigned_by(full_name, avatar_url), lesson_plans(id, title, objectives), assignment_resources(resources(*))')
        .eq('id', id)
        .single();

    if (error) throw error;

    // Format resources
    return {
        ...data,
        resources: data.assignment_resources?.map(ar => ar.resources).filter(Boolean) || []
    };
};
