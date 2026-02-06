import { supabase } from '../lib/supabase';

export const fetchCalendarEvents = async (user, profile) => {
    let classIds = [];

    if (profile?.role === 'admin') {
        const { data: allClasses } = await supabase
            .from('classes')
            .select('id')
            .eq('school_id', profile.school_id);
        classIds = allClasses?.map(c => c.id) || [];
    } else if (profile?.role === 'teacher') {
        const { data: myClasses } = await supabase
            .from('classes')
            .select('id')
            .eq('teacher_id', user.id);
        classIds = myClasses?.map(c => c.id) || [];
    } else {
        // Students & Direct memberships
        const { data: directClasses } = await supabase
            .from('class_members')
            .select('class_id')
            .eq('user_id', user.id);
        classIds = directClasses?.map(c => c.class_id) || [];

        // If parent, also fetch children's classes
        if (profile?.role === 'parent') {
            const { data: relationships } = await supabase
                .from('parent_child_relationships')
                .select('child_id')
                .eq('parent_id', user.id);

            const childIds = relationships?.map(r => r.child_id).filter(Boolean) || [];

            if (childIds.length > 0) {
                const { data: childClasses } = await supabase
                    .from('class_members')
                    .select('class_id')
                    .in('user_id', childIds);

                const childClassIds = childClasses?.map(c => c.class_id) || [];
                classIds = [...new Set([...classIds, ...childClassIds])];
            }
        }
    }

    const allEvents = [];

    // 1. Fetch Class Schedules
    if (classIds.length > 0) {
        const { data: classSchedules, error: classError } = await supabase
            .from('class_schedules')
            .select(`
                *,
                class:classes(id, name, subject)
            `)
            .in('class_id', classIds);

        if (!classError && classSchedules) {
            allEvents.push(...classSchedules.map(s => ({ 
                ...s, 
                eventType: 'class',
                title: s.class?.name || 'Class',
                description: s.description || s.class_info
            })));
        }
    }

    // 2. Fetch PTM Bookings
    const isParent = profile?.role === 'parent';
    let ptmQuery = supabase
        .from('ptm_bookings')
        .select(`
            *,
            slot:ptm_slots!inner(*, teacher:users!teacher_id(full_name)),
            parent:users!parent_id(full_name),
            student:users!student_id(full_name)
        `);

    if (isParent) {
        ptmQuery = ptmQuery.eq('parent_id', user.id);
    } else if (profile?.role === 'teacher') {
        ptmQuery = ptmQuery.eq('slot.teacher_id', user.id);
    }

    const { data: ptmData, error: ptmError } = await ptmQuery;

    if (!ptmError && ptmData) {
        allEvents.push(...ptmData.map(b => ({
            id: b.id,
            start_time: b.slot.start_time,
            end_time: b.slot.end_time,
            title: `PTM: ${isParent ? b.slot.teacher.full_name : b.parent.full_name}`,
            description: `Meeting regarding ${b.student.full_name}`,
            eventType: 'meeting',
            originalData: b
        })));
    }

    // 3. Fetch Homework & Assignments
    if (classIds.length > 0) {
        const [homeworkRes, assignmentsRes] = await Promise.all([
            supabase.from('homework').select('*, class:classes(name, subject)').in('class_id', classIds),
            supabase.from('assignments').select('*, class:classes(name, subject)').in('class_id', classIds)
        ]);

        if (homeworkRes.data) {
            allEvents.push(...homeworkRes.data.map(h => ({
                id: h.id,
                start_time: h.due_date,
                end_time: h.due_date,
                title: `Homework: ${h.subject}`,
                description: h.description,
                eventType: 'homework',
                class: h.class,
                originalData: h
            })));
        }

        if (assignmentsRes.data) {
            allEvents.push(...assignmentsRes.data.map(a => ({
                id: a.id,
                start_time: a.due_date,
                end_time: a.due_date,
                title: `Assignment: ${a.title}`,
                description: a.description,
                eventType: 'assignment',
                class: a.class,
                originalData: a
            })));
        }
    }

    // 4. Fetch Exam Papers
    let examPapers = [];
    if (profile?.role === 'admin') {
        const { data } = await supabase.from('exam_papers').select('*').eq('school_id', profile.school_id);
        examPapers = data || [];
    } else if (profile?.role === 'teacher') {
        const [invigilatingRes, teachingRes] = await Promise.all([
            supabase.from('exam_invigilators').select('paper:exam_papers(*)').eq('teacher_id', user.id),
            classIds.length > 0 
                ? supabase.from('exam_papers').select('*').in('class_id', classIds)
                : Promise.resolve({ data: [] })
        ]);
        
        const invigilatingPapers = invigilatingRes.data?.map(d => d.paper).filter(Boolean) || [];
        const teachingPapers = teachingRes.data || [];
        
        const paperMap = new Map();
        invigilatingPapers.forEach(p => paperMap.set(p.id, p))
        teachingPapers.forEach(p => paperMap.set(p.id, p))
        examPapers = Array.from(paperMap.values());
    } else {
        // Students & Parents
        const studentIds = [user.id];
        if (profile?.role === 'parent') {
            const { data: children } = await supabase.from('parent_child_relationships').select('child_id').eq('parent_id', user.id);
            studentIds.push(...(children?.map(c => c.child_id) || []));
        }

        const { data } = await supabase
            .from('exam_seat_allocations')
            .select('paper:exam_papers(*)')
            .in('student_id', studentIds);
        examPapers = data?.map(d => d.paper).filter(Boolean) || [];
    }

    if (examPapers.length > 0) {
        allEvents.push(...examPapers.map(p => {
            const startStr = `${p.date}T${p.start_time}`;
            const startDate = new Date(startStr);
            let endStr = startStr;

            if (p.duration_minutes && !isNaN(startDate.getTime())) {
                const endDate = new Date(startDate.getTime() + p.duration_minutes * 60000);
                try {
                    endStr = endDate.toISOString();
                } catch (e) {
                    endStr = startStr;
                }
            }

            return {
                id: p.id,
                start_time: startStr,
                end_time: endStr,
                title: `Exam: ${p.subject_name}`,
                description: `Paper Code: ${p.paper_code}`,
                eventType: 'exam',
                originalData: p
            };
        }));
    }

    return allEvents;
};