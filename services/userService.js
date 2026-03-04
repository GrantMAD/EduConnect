import { supabase } from '../lib/supabase';

export const getUserProfile = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select(`
            id, full_name, email, role, avatar_url, country, number, school_id, 
            has_seen_welcome_modal, notification_preferences, school_request_status,
            school:schools!school_id(id, name, school_type, student_account_min_grade)
        `)
        .eq('id', userId)
        .maybeSingle();

    if (error) throw error;
    return data;
};

export const fetchUsersBySchoolWithPreferences = async (schoolId) => {
    const { data, error } = await supabase
        .from('users')
        .select('id, notification_preferences, role')
        .eq('school_id', schoolId);

    if (error) throw error;
    return data || [];
};

export const fetchClassMembersIds = async (classId, role = 'student') => {
    const { data, error } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId)
        .eq('role', role);

    if (error) throw error;
    return data?.map(m => m.user_id) || [];
};

export const fetchParentsOfStudents = async (studentIds) => {
    if (!studentIds || studentIds.length === 0) return [];

    const { data, error } = await supabase
        .from('parent_child_relationships')
        .select('parent_id')
        .in('child_id', studentIds);

    if (error) throw error;
    return data?.map(p => p.parent_id) || [];
};

export const fetchUsersByIdsWithPreferences = async (userIds) => {
    if (!userIds || userIds.length === 0) return [];

    const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, notification_preferences, role')
        .in('id', userIds);

    if (error) throw error;
    return data || [];
};

export const fetchUserClasses = async (userId, role) => {
    if (!userId) return [];

    try {
        let associatedClassIds = [];

        const { data: memberClasses, error: memberError } = await supabase
            .from('class_members')
            .select('class_id')
            .eq('user_id', userId);

        if (memberError) throw memberError;
        if (memberClasses) {
            associatedClassIds.push(...memberClasses.map(m => m.class_id));
        }

        if (role === 'parent') {
            const { data: children, error: childrenError } = await supabase
                .from('parent_child_relationships')
                .select('child_id')
                .eq('parent_id', userId);

            if (childrenError) throw childrenError;

            if (children && children.length > 0) {
                const childIds = children.map(c => c.child_id);
                const { data: childClasses, error: childClassesError } = await supabase
                    .from('class_members')
                    .select('class_id')
                    .in('user_id', childIds);

                if (childClassesError) throw childClassesError;
                if (childClasses) {
                    associatedClassIds.push(...childClasses.map(m => m.class_id));
                }
            }
        }

        return [...new Set(associatedClassIds)];
    } catch (error) {
        console.error('Error fetching user classes in userService:', error.message);
        throw error;
    }
};

export const fetchParentChildren = async (parentId) => {
    const { data, error } = await supabase
        .from('parent_child_relationships')
        .select('child_id')
        .eq('parent_id', parentId);

    if (error) throw error;
    return data?.map(r => r.child_id) || [];
};

export const fetchParentChildrenDetails = async (parentId) => {
    const { data, error } = await supabase
        .from('parent_child_relationships')
        .select('child:users!child_id(id, full_name, email, avatar_url)')
        .eq('parent_id', parentId);

    if (error) throw error;
    return data?.map(r => r.child) || [];
};

export const fetchUsersBySchool = async (schoolId, filters = {}) => {
    let query = supabase
        .from('users')
        .select('*')
        .eq('school_id', schoolId);

    if (filters.role) {
        query = query.eq('role', filters.role);
    }

    const { data, error } = await query.order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const updateUserRole = async (userId, role) => {
    const { data, error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)
        .select();

    if (error) throw error;
    return data[0];
};

export const leaveSchool = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .update({ school_id: null })
        .eq('id', userId)
        .select();

    if (error) throw error;
    return data[0];
};

export const disassociateClassMembers = async (userId) => {
    const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('user_id', userId);

    if (error) throw error;
    return true;
};

export const createParentChildRelationship = async (parentId, childId) => {

    const { data, error } = await supabase

        .from('parent_child_relationships')

        .insert({ parent_id: parentId, child_id: childId })

        .select();



    if (error) throw error;

    return data[0];

};



export const updateParentChildRequest = async (parentId, childId, status) => {

    const { data, error } = await supabase

        .from('parent_child_requests')

        .update({ status })

        .eq('child_id', childId)

        .eq('parent_id', parentId)

        .eq('status', 'pending')

        .select();



    if (error) throw error;

    return data;

};

export const fetchTemplates = async (userId, type) => {
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', userId)
        .eq('type', type)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const createTemplate = async (templateData) => {
    const { data, error } = await supabase
        .from('templates')
        .insert([templateData])
        .select();

    if (error) throw error;
    return data[0];
};

export const deleteTemplate = async (templateId) => {
    const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

    if (error) throw error;
    return true;
};

export const fetchParentsOfStudentsRpc = async (studentIds) => {
    const { data, error } = await supabase
        .rpc('get_parents_of_students', { p_student_ids: studentIds });

    if (error) throw error;
    return data || [];
};

export const fetchAllParentsWithChildren = async () => {
    const { data: relationships, error } = await supabase
        .from('parent_child_relationships')
        .select('parent:users!parent_id(id, full_name, email, avatar_url), child:users!child_id(id, full_name, email, avatar_url)');

    if (error) throw error;

    const parentMap = {};
    relationships?.forEach(rel => {
        if (!parentMap[rel.parent.id]) parentMap[rel.parent.id] = { parent: rel.parent, children: [] };
        parentMap[rel.parent.id].children.push(rel.child);
    });
    return Object.values(parentMap);
};

export const fetchStudentMarks = async (studentId, classIds) => {
    // 1. Fetch standard student_marks
    const { data: standardMarks, error: marksError } = await supabase
        .from('student_marks')
        .select('*, category:grading_categories(id, name, weight)')
        .eq('student_id', studentId)
        .in('class_id', classIds)
        .order('assessment_date', { ascending: false });

    if (marksError) throw marksError;

    // 2. Fetch graded student_completions
    const { data: completions, error: compError } = await supabase
        .from('student_completions')
        .select(`
            id, score, total_possible, student_id,
            homework:homework!homework_id (subject, grading_category_id, created_at, class_id),
            assignment:assignments!assignment_id (title, grading_category_id, created_at, class_id)
        `)
        .eq('student_id', studentId)
        .filter('score', 'not.is.null');

    if (compError) throw compError;

    // Filter and transform completions
    const mappedCompletions = completions
        .filter(c => {
            const item = c.homework || c.assignment;
            return item && item.grading_category_id && classIds.includes(item.class_id);
        })
        .map(c => {
            const source = c.homework || c.assignment;
            return {
                id: c.id,
                student_id: studentId,
                category_id: source.grading_category_id,
                score: c.score,
                total_possible: c.total_possible,
                assessment_name: source.subject || source.title,
                assessment_date: source.created_at,
                is_completion_mark: true,
                mark: `${Math.round((c.score / c.total_possible) * 100)}%`
            };
        });

    return [...standardMarks, ...mappedCompletions].sort((a, b) =>
        new Date(b.assessment_date || b.created_at) - new Date(a.assessment_date || a.created_at)
    );
};

export const updateSchoolId = async (userId, schoolId) => {
    const { data, error } = await supabase
        .from('users')
        .update({ school_id: schoolId })
        .eq('id', userId)
        .select();

    if (error) throw error;
    return data[0];
};

export const fetchThemePreference = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('theme_preference')
        .eq('id', userId)
        .maybeSingle();

    if (error) throw error;
    return data?.theme_preference;
};

export const updateThemePreference = async (userId, theme) => {
    const { error } = await supabase
        .from('users')
        .update({ theme_preference: theme })
        .eq('id', userId);

    if (error) throw error;
    return true;
};

export const updatePushToken = async (userId, token) => {
    const { error } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);

    if (error) throw error;
    return true;
};

export const fetchNotificationPreferences = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', userId)
        .maybeSingle();

    if (error) throw error;
    return data?.notification_preferences;
};

export const fetchClassMembersUserIds = async (classId) => {
    const { data, error } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId);

    if (error) throw error;
    return data || [];
};

export const updateNotificationPreferences = async (userId, preferences) => {
    const { error } = await supabase
        .from('users')
        .update({ notification_preferences: preferences })
        .eq('id', userId);

    if (error) throw error;
    return true;
};

export const markWelcomeModalAsSeen = async (userId) => {
    const { error } = await supabase
        .from('users')
        .update({ has_seen_welcome_modal: true })
        .eq('id', userId);

    if (error) throw error;
    return true;
};

export const saveStudentMarks = async (marks) => {
    const { data, error } = await supabase
        .from('student_marks')
        .insert(marks)
        .select();

    if (error) throw error;
    return data || [];
};

export const updateStudentMark = async (markId, markData) => {
    const { data, error } = await supabase
        .from('student_marks')
        .update(markData)
        .eq('id', markId)
        .select();

    if (error) throw error;
    return data[0];
};

export const deleteStudentMark = async (markId) => {
    const { error } = await supabase
        .from('student_marks')
        .delete()
        .eq('id', markId);

    if (error) throw error;
    return true;
};

export const fetchStudentCompletionCount = async (studentId) => {
    const { count, error } = await supabase
        .from('student_completions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId);

    if (error) throw error;
    return count || 0;
};

export const fetchStudentMarksSimple = async (studentId, limit = 10) => {
    const { data, error } = await supabase
        .from('student_marks')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
};

export const getUsersBySchoolQuery = ({ schoolId, searchQuery, from, to }) => {
    let query = supabase
        .from('users')
        .select('*')
        .eq('school_id', schoolId);

    if (searchQuery) {
        query = query.ilike('full_name', `%${searchQuery}%`);
    }

    query = query
        .order('role', { ascending: true })
        .order('full_name', { ascending: true })
        .range(from, to);

    return query;
};

export const updateSchoolRequestStatus = async (userId, status, schoolId = null) => {
    const { data, error } = await supabase
        .from('users')
        .update({
            school_request_status: status,
            requested_school_id: schoolId,
        })
        .eq('id', userId)
        .select();

    if (error) throw error;
    return data[0];
};

export const uploadAvatar = async (filePath, fileBody) => {
    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileBody, { cacheControl: '3600', upsert: true });

    if (error) throw error;
    return data;
};

export const getAvatarUrl = (filePath) => {
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data?.publicUrl;
};

export const updateUserProfile = async (userId, updateData) => {
    const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select();

    if (error) throw error;
    return data[0];
};



