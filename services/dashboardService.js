import { supabase } from '../lib/supabase';

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
        
        export const getTeachersEngagementAudit = async (schoolId) => {
            const { data: teacherList, error: teacherError } = await supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('school_id', schoolId)
                .eq('role', 'teacher');
        
            if (teacherError) throw teacherError;
        
            if (!teacherList || teacherList.length === 0) {
                return [];
            }
        
            const teacherIds = teacherList.map(t => t.id);
        
            const [announcements, resources, classes] = await Promise.all([
                supabase.from('announcements').select('posted_by').in('posted_by', teacherIds),
                supabase.from('resources').select('uploaded_by').in('uploaded_by', teacherIds),
                supabase.from('classes').select('teacher_id').in('teacher_id', teacherIds)
            ]);
        
                const auditData = teacherList.map(teacher => {
                    const announcementCount = announcements.data?.filter(a => a.posted_by === teacher.id).length || 0;
                    const resourceCount = resources.data?.filter(r => r.uploaded_by === teacher.id).length || 0;
                    const classCount = classes.data?.filter(c => c.teacher_id === teacher.id).length || 0;
                    
                    return {
                        ...teacher,
                        announcements: announcementCount,
                        resources: resourceCount,
                        classes: classCount,
                        total: announcementCount + resourceCount + classCount
                    };
                });
            
                return auditData;
            };
            
            export const getRecentActivities = async (schoolId) => {
                const [announcements, polls, homework, assignments] = await Promise.all([
                    supabase.from('announcements').select('id, title, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(4),
                    supabase.from('polls').select('id, question, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(4),
                    supabase.from('homework').select('id, subject, description, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(4),
                    supabase.from('assignments').select('id, title, description, created_at').eq('school_id', schoolId).order('created_at', { ascending: false }).limit(4)
                ]);
            
                return {
                    announcements: announcements.data || [],
                    polls: polls.data || [],
                    homework: homework.data || [],
                    assignments: assignments.data || []
                };
            };
                    
