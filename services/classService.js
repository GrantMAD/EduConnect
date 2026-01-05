import { supabase } from '../lib/supabase';

export const fetchAllClasses = async (schoolId) => {
    if (!schoolId) return [];
    
    const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('school_id', schoolId);
        
    if (error) throw error;
    return data || [];
};

export const fetchTodaySchedules = async (schoolId, userId, role) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    let query = supabase
        .from('class_schedules')
        .select('*, class:classes(*)')
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

    if (role === 'student' || role === 'parent') {
        let targetIds = [userId];
        if (role === 'parent') {
            const { data: rels } = await supabase.from('parent_child_relationships').select('child_id').eq('parent_id', userId);
            targetIds = rels?.map(r => r.child_id) || [];
        }
        const { data: members } = await supabase.from('class_members').select('class_id').in('user_id', targetIds);
        const classIds = members?.map(m => m.class_id) || [];
        if (classIds.length > 0) {
            query = query.in('class_id', classIds);
        } else {
            return [];
        }
    } else if (role === 'teacher') {
        query = query.eq('class.teacher_id', userId);
    } else {
        query = query.eq('class.school_id', schoolId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};
export const fetchClassMembers = async (classId) => {
    const { data, error } = await supabase
        .from('class_members')
        .select('*, users(id, full_name, email, avatar_url, role)')
        .eq('class_id', classId);
    if (error) throw error;
    return data || [];
};

export const fetchClassIds = async (userId, role, schoolId) => {
    let classIds = [];

    if (role === 'teacher' || role === 'admin') {
        const { data: allClasses, error: allClassesError } = await supabase
            .from('classes')
            .select('id')
            .eq('school_id', schoolId);
        if (allClassesError) throw allClassesError;
        classIds = allClasses.map(c => c.id);
    } else {
        const { data: directClasses, error: directClassesError } = await supabase
            .from('class_members')
            .select('class_id')
            .eq('user_id', userId);
        if (directClassesError) throw directClassesError;
        classIds = directClasses.map(c => c.class_id);

        if (role === 'parent') {
            const { data: relationships, error: relError } = await supabase
                .from('parent_child_relationships')
                .select('child_id')
                .eq('parent_id', userId);
            if (relError) throw relError;

            const childIds = relationships.map(rel => rel.child_id);

            if (childIds.length > 0) {
                const { data: childrenClasses, error: childrenClassesError } = await supabase
                    .from('class_members')
                    .select('class_id')
                    .in('user_id', childIds);
                if (childrenClassesError) throw childrenClassesError;

                const childrenClassIds = childrenClasses.map(c => c.class_id);
                classIds = [...new Set([...classIds, ...childrenClassIds])];
            }
        }
    }
    return classIds;
};

export const fetchClassSchedules = async (classIds) => {
    if (!classIds || classIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from('class_schedules')
        .select('*, class:classes(id, name, subject)')
        .in('class_id', classIds)
        .order('start_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
};

export const disassociateTeacherFromClasses = async (userId, schoolId) => {
    const { error } = await supabase
        .from('classes')
        .update({ teacher_id: null })
        .eq('teacher_id', userId)
        .eq('school_id', schoolId);

    if (error) throw error;
    return true;
};

export const fetchClassInfo = async (classId) => {
    const { data, error } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();
    
    if (error) throw error;
    return data;
};

export const createClass = async (classData) => {
    const { data, error } = await supabase
        .from('classes')
        .insert(classData)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const createClassMembers = async (members) => {
    const { data, error } = await supabase
        .from('class_members')
        .insert(members)
        .select();
    
    if (error) throw error;
    return data || [];
};

export const createClassSchedules = async (schedules) => {
    const { data, error } = await supabase
        .from('class_schedules')
        .insert(schedules)
        .select();
    
    if (error) throw error;
    return data || [];
};

export const fetchUserMemberships = async (userId) => {
    const { data, error } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
};

export const fetchClubsBySchool = async (schoolId) => {
    const { data, error } = await supabase
        .from('classes')
        .select('*, teacher:users(email, full_name)')
        .eq('subject', 'Extracurricular')
        .eq('school_id', schoolId);
    
    if (error) throw error;
    return data || [];
};

export const fetchClassMemberships = async (userId) => {
    const { data, error } = await supabase
        .from('class_members')
        .select('id, attendance, class_id, classes (id, name, teacher:users(full_name))')
        .eq('user_id', userId);
    
    if (error) throw error;
    return data || [];
};

export const fetchClassSchedulesForAttendance = async (classIds) => {
    const { data, error } = await supabase
        .from('class_schedules')
        .select('class_id, start_time')
        .in('class_id', classIds)
        .lte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });
    
    if (error) throw error;
    return data || [];
};

export const fetchClassesByTeacher = async (teacherId) => {
    const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', teacherId);
    if (error) throw error;
    return data || [];
};

export const getClassesBySchoolQuery = ({ schoolId, teacherId = null }) => {
    let query = supabase
        .from('classes')
        .select('id, name, subject, teacher_id, teacher:users!teacher_id(full_name)') 
        .eq('school_id', schoolId);

    if (teacherId) {
        query = query.eq('teacher_id', teacherId);
    }

    return query;
};

export const updateClass = async (classId, classData) => {
    const { data, error } = await supabase
        .from('classes')
        .update(classData)
        .eq('id', classId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const deleteClassSchedules = async (classId) => {
    const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('class_id', classId);
    
    if (error) throw error;
    return true;
};

export const removeClassMembers = async (classId, userIds) => {
    const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('class_id', classId)
        .in('user_id', userIds);
    
    if (error) throw error;
    return true;
};

export const removeMemberFromClass = async (classId, userId) => {
    const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('class_id', classId)
        .eq('user_id', userId);
    
    if (error) throw error;
    return true;
};

export const updateClassMemberIds = async (classId, userIds) => {
    const { error } = await supabase
        .from('classes')
        .update({ users: userIds })
        .eq('id', classId);
    
    if (error) throw error;
    return true;
};

export const addMemberToClass = async (memberData) => {
    const { data, error } = await supabase
        .from('class_members')
        .insert([memberData])
        .select();
    
    if (error) throw error;
    return data[0];
};

export const updateAttendance = async (memberId, attendance) => {
    const { data, error } = await supabase
        .from('class_members')
        .update({ attendance })
        .eq('id', memberId)
        .select();
    
    if (error) throw error;
    return data[0];
};

export const updateClassSchedule = async (scheduleId, scheduleData) => {
    const { data, error } = await supabase
        .from('class_schedules')
        .update(scheduleData)
        .eq('id', scheduleId)
        .select();
    
    if (error) throw error;
    return data[0];
};

export const fetchStudentCompletions = async (idField, itemId) => {
    const { data, error } = await supabase
        .from('student_completions')
        .select('student_id')
        .eq(idField, itemId);
    
    if (error) throw error;
    return data?.map(c => c.student_id) || [];
};

export const deleteStudentCompletion = async (studentId, idField, itemId) => {
    const { error } = await supabase
        .from('student_completions')
        .delete()
        .eq('student_id', studentId)
        .eq(idField, itemId);
    
    if (error) throw error;
    return true;
};

export const addStudentCompletion = async (studentId, idField, itemId) => {
    const { data, error } = await supabase
        .from('student_completions')
        .insert({
            student_id: studentId,
            [idField]: itemId
        })
        .select();
    
    if (error) throw error;
    return data[0];
};

export const fetchTeachersOfStudents = async (studentIds) => {
    if (!studentIds || studentIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from('class_members')
        .select(`
            class_id,
            classes!inner(
                id, name,
                teacher:users!teacher_id(id, full_name, email, avatar_url)
            )
        `)
        .in('user_id', studentIds);
    
    if (error) throw error;
    
    const uniqueTeachers = [];
    const teacherIds = new Set();
    data?.forEach(item => {
        const teacher = item.classes?.teacher;
        if (teacher && !teacherIds.has(teacher.id)) {
            teacherIds.add(teacher.id);
            uniqueTeachers.push(teacher);
        }
    });
    return uniqueTeachers;
};

export const fetchStudentSubjects = async (userId) => {
    const { data, error } = await supabase
        .from('class_members')
        .select('classes(subject)')
        .eq('user_id', userId);
    
    if (error) throw error;
    return data?.map(m => m.classes?.subject).filter(Boolean) || [];
};

export const fetchChildrenSubjects = async (childIds) => {
    if (!childIds || childIds.length === 0) return [];
    
    const { data, error } = await supabase
        .from('class_members')
        .select('classes(subject)')
        .in('user_id', childIds);
    
    if (error) throw error;
    return data?.map(m => m.classes?.subject).filter(Boolean) || [];
};

export const fetchExistingMembersIds = async (classId, role = 'student') => {
    const { data } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId)
        .eq('role', role);
    return data?.map(m => m.user_id) || [];
};

export const fetchClassMembersIdsService = async (classId) => {
    const { data, error } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId);
    
    if (error) throw error;
    return data?.map(m => m.user_id) || [];
};



