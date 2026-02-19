import { supabase } from '../lib/supabase';
import { fetchInactiveExamSessions } from './examService';

export const getDashboardOverview = async ({ schoolId, userId, role }) => {
    const normalizedRole = role?.toLowerCase();
    const isAdmin = normalizedRole === 'admin';
    
    // 1. Fetch basic stats and profile-related counts in parallel (Only for Admin)
    const [statsData, clubsCount, totalClassesCount, linkCount] = isAdmin ? await Promise.all([
        getDashboardStats(schoolId),
        fetchClubsCount(schoolId),
        fetchTotalClassesCount(schoolId),
        fetchParentChildLinkCount(schoolId)
    ]) : [null, 0, 0, 0];

    // 2. Fetch action items (alerts) in parallel if applicable (Admin and Teacher)
    let actionItems = [];
    if (['teacher', 'admin'].includes(normalizedRole)) {
        const [attendanceAlerts, ungradedAlerts, lessonAlerts, inactiveExamAlerts] = await Promise.all([
            fetchMissingAttendance({ userId, role, schoolId }),
            fetchUngradedSubmissions({ userId, role, schoolId }),
            fetchClassesWithoutLessons({ userId, role }),
            fetchInactiveExamSessions({ userId, role, schoolId })
        ]);

        actionItems = [
            ...(attendanceAlerts || []).map(a => ({ ...a, type: 'attendance' })),
            ...(ungradedAlerts || []),
            ...(lessonAlerts || []),
            ...(inactiveExamAlerts || [])
        ].filter(item => {
            if (normalizedRole === 'admin' && (item.type === 'attendance' || item.type === 'missing_lesson_plan')) {
                return false;
            }
            return true;
        });
    }

    return {
        stats: {
            totalUsers: statsData?.totalUsers || 0,
            adminCount: statsData?.adminCount || 0,
            teacherCount: statsData?.teacherCount || 0,
            studentCount: statsData?.studentCount || 0,
            parentCount: statsData?.parentCount || 0,
            classCount: Math.max(0, (totalClassesCount || 0) - (clubsCount || 0)),
            clubCount: clubsCount || 0,
            assignmentCount: statsData?.assignmentCount || 0,
            pollCount: statsData?.pollCount || 0,
            parentChildLinkCount: linkCount
        },
        actionItems
    };
};

export const getDashboardStats = async (schoolId) => {
    const { data, error } = await supabase.rpc('get_dashboard_stats', {
        target_school_id: schoolId
    });

    if (error) throw error;
    return data;
};

export const dailyCheckIn = async (userId) => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('daily_check_ins')
        .upsert({
            user_id: userId,
            check_in_date: today,
            xp_awarded: true
        }, { onConflict: 'user_id, check_in_date', ignoreDuplicates: true })
        .select();

    if (error) throw error;
    return data;
};

export const fetchParentChildLinkCount = async (schoolId) => {
    const { count, error } = await supabase
        .from('parent_child_relationships')
        .select('*, parent:users!parent_id!inner(school_id)', { count: 'exact', head: true })
        .eq('parent.school_id', schoolId);

    if (error) throw error;
    return count || 0;
};

export const fetchClubsCount = async (schoolId) => {
    const { count, error } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('subject', 'Extracurricular');

    if (error) throw error;
    return count || 0;
};

export const fetchTotalClassesCount = async (schoolId) => {
    const { count, error } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);

    if (error) throw error;
    return count || 0;
};

export const fetchMissingAttendance = async ({ userId, role, schoolId }) => {
    try {
        if (!userId || !role || !schoolId) return [];

        const normalizedRole = role.toLowerCase();
        if (!['teacher', 'admin'].includes(normalizedRole)) {
            console.log('Role not authorized:', normalizedRole);
            return [];
        }

        // Strict attendance check REMOVED (column missing)

        // 2. Fetch past schedules (LAST 7 DAYS)
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        const startOfWindow = sevenDaysAgo.toISOString(); // 7 days ago
        const endOfTime = new Date().toISOString(); // Current time

        let query = supabase
            .from('class_schedules')
            .select(`
                id,
                class_id,
                start_time,
                end_time,
                classes!inner (
                    id,
                    name,
                    teacher_id,
                    school_id
                )
            `)
            .eq('classes.school_id', schoolId)
            .lt('start_time', endOfTime) // Must be in the past
            .gte('start_time', startOfWindow) // Check last 7 days
            .order('start_time', { ascending: false });

        if (normalizedRole === 'teacher') {
            query = query.eq('classes.teacher_id', userId);
        }

        const { data: schedules, error: scheduleError } = await query;
        if (scheduleError) throw scheduleError;

        if (!schedules || schedules.length === 0) return [];

        // 3. Check for existing attendance logs
        const { data: attendanceLogs, error: logsError } = await supabase
            .from('attendance_records')
            .select('class_id, date')
            .in('class_id', schedules.map(s => s.class_id))
            .gte('date', startOfWindow.split('T')[0]); // Check logs for window

        if (logsError) throw logsError;

        const attendedSessions = new Set(
            attendanceLogs?.map(log => `${log.class_id}-${log.date}`) || []
        );

        // 4. Filter missing
        const missing = schedules.filter(schedule => {
            const date = schedule.start_time.split('T')[0];
            return !attendedSessions.has(`${schedule.class_id}-${date}`);
        }).map(s => ({
            id: s.id,
            class_id: s.class_id,
            className: s.classes.name,
            startTime: s.start_time,
            endTime: s.end_time,
            date: s.start_time.split('T')[0]
        }));

        return missing;

    } catch (error) {
        console.error('Error fetching missing attendance:', error);
        return [];
    }
};

export const fetchUngradedSubmissions = async ({ userId, role, schoolId }) => {
    try {
        if (!userId || !role || !schoolId) return [];

        const normalizedRole = role.toLowerCase();
        if (normalizedRole !== 'teacher') return [];

        // Fetch ungraded completions for teacher's homework and assignments
        const [homeworkCompletions, assignmentCompletions] = await Promise.all([
            supabase
                .from('student_completions')
                .select(`
                    id,
                    completed_at,
                    homework:homework!inner(
                        id, 
                        subject, 
                        created_by,
                        class_id
                    ),
                    student:users!student_id(full_name)
                `)
                .eq('homework.created_by', userId)
                .is('score', null),
            supabase
                .from('student_completions')
                .select(`
                    id,
                    completed_at,
                    assignment:assignments!inner(
                        id, 
                        title, 
                        assigned_by,
                        class_id
                    ),
                    student:users!student_id(full_name)
                `)
                .eq('assignment.assigned_by', userId)
                .is('score', null)
        ]);

        if (homeworkCompletions.error) console.error("Homework Query Error:", homeworkCompletions.error);
        if (assignmentCompletions.error) console.error("Assignment Query Error:", assignmentCompletions.error);

        const allUngraded = [
            ...(homeworkCompletions.data || []).map(c => ({
                id: c.id,
                type: 'ungraded_homework',
                itemId: c.homework.id,
                classId: c.homework.class_id,
                title: c.homework.subject,
                studentName: c.student?.full_name,
                createdAt: c.completed_at
            })),
            ...(assignmentCompletions.data || []).map(c => ({
                id: c.id,
                type: 'ungraded_assignment',
                itemId: c.assignment.id,
                classId: c.assignment.class_id,
                title: c.assignment.title,
                studentName: c.student?.full_name,
                createdAt: c.completed_at
            }))
        ];

        return allUngraded.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('Error fetching ungraded submissions:', error);
        return [];
    }
};

export const fetchClassesWithoutLessons = async ({ userId, role }) => {
    try {
        if (!userId) return [];
        if (role?.toLowerCase() !== 'teacher') return [];

        // 1. Fetch teacher's academic classes (exclude extracurricular)
        const { data: myClasses, error: classError } = await supabase
            .from('classes')
            .select('id, name, subject')
            .eq('teacher_id', userId)
            .neq('subject', 'Extracurricular');

        if (classError) throw classError;
        if (!myClasses || myClasses.length === 0) return [];

        const classIds = myClasses.map(c => c.id);

        // 2. Check for existence of lesson plans for these classes
        const { data: lessonPlans, error: lessonError } = await supabase
            .from('lesson_plans')
            .select('class_id')
            .in('class_id', classIds);

        if (lessonError) throw lessonError;

        const classesWithLessons = new Set(lessonPlans?.map(lp => lp.class_id) || []);

        // 3. Filter classes that have 0 lessons
        const missing = myClasses.filter(c => !classesWithLessons.has(c.id));

        return missing.map(c => ({
            id: c.id,
            type: 'missing_lesson_plan',
            className: c.name,
            classId: c.id,
            subject: c.subject
        }));
    } catch (error) {
        console.error("fetchClassesWithoutLessons Exception:", error);
        return [];
    }
}
