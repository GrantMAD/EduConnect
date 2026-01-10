import { supabase } from '../lib/supabase';

// --- SESSIONS ---

export const fetchExamSessions = async (schoolId) => {
    const { data, error } = await supabase
        .from('exam_sessions')
        .select('*, exam_papers(id, subject_name, paper_code, date, start_time, notifications_sent, exam_seat_allocations(count), exam_invigilators(count))')
        .eq('school_id', schoolId)
        .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const fetchExamSession = async (sessionId) => {
    const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (error) throw error;
    return data;
};

export const createExamSession = async (sessionData) => {
    const { data, error } = await supabase
        .from('exam_sessions')
        .insert(sessionData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateExamSession = async (id, updates) => {
    const { data, error } = await supabase
        .from('exam_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteExamSession = async (id) => {
    const { error } = await supabase
        .from('exam_sessions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- VENUES ---

export const fetchExamVenues = async (schoolId) => {
    const { data, error } = await supabase
        .from('exam_venues')
        .select('*')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const fetchVenue = async (venueId) => {
    const { data, error } = await supabase
        .from('exam_venues')
        .select('*')
        .eq('id', venueId)
        .single();

    if (error) throw error;
    return data;
};

export const createExamVenue = async (venueData) => {
    const { data, error } = await supabase
        .from('exam_venues')
        .insert(venueData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateExamVenue = async (id, updates) => {
    const { data, error } = await supabase
        .from('exam_venues')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteExamVenue = async (id) => {
    const { error } = await supabase
        .from('exam_venues')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- PAPERS ---

export const fetchExamPapers = async (sessionId) => {
    const { data, error } = await supabase
        .from('exam_papers')
        .select('*, exam_seat_allocations(count), exam_invigilators(count), notifications_sent')
        .eq('session_id', sessionId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const createExamPaper = async (paperData) => {
    const { data, error } = await supabase
        .from('exam_papers')
        .insert(paperData)
        .select()
        .single();

    if (error) throw error;

    // Reset session notification flag when a new paper is added
    await supabase
        .from('exam_sessions')
        .update({ notifications_sent: false })
        .eq('id', paperData.session_id);

    return data;
};

export const updateExamPaper = async (id, updates) => {
    const { data, error } = await supabase
        .from('exam_papers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteExamPaper = async (id) => {
    const { error } = await supabase
        .from('exam_papers')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- SEAT ALLOCATIONS ---

export const fetchSeatAllocations = async (paperId) => {
    const { data, error } = await supabase
        .from('exam_seat_allocations')
        .select('*, student:users(id, full_name, email, number, avatar_url)')
        .eq('paper_id', paperId);

    if (error) throw error;
    return data || [];
};

export const fetchStudentExamSchedule = async (studentId) => {
    const { data, error } = await supabase
        .from('exam_seat_allocations')
        .select(`
            *,
            paper:exam_papers (
                *,
                session:exam_sessions (name, is_active)
            ),
            venue:exam_venues (name)
        `)
        .eq('student_id', studentId);

    if (error) throw error;

    // Filter out allocations where paper join failed or session is inactive
    const validAllocations = (data || [])
        .filter(a => a.paper && a.paper.session?.is_active)
        .map(a => ({
            ...a.paper,
            venue_name: a.venue?.name,
            seat_label: a.seat_label,
            allocation_status: a.status
        }));

    // Sort by date and time in Javascript to avoid complex Rpc/Foreign key sorting issues
    return validAllocations.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.start_time}`);
        const dateB = new Date(`${b.date}T${b.start_time}`);
        return dateA - dateB;
    });
};

export const allocateSeat = async (allocationData) => {
    const { data, error } = await supabase
        .from('exam_seat_allocations')
        .insert(allocationData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const bulkAllocateSeats = async (allocations) => {
    const { data, error } = await supabase
        .from('exam_seat_allocations')
        .insert(allocations)
        .select();

    if (error) throw error;
    return data;
};

/**
 * Auto-allocates seats for ALL papers in a session to a specific venue.
 */
export const autoAllocateSession = async (sessionId, venueId, schoolId, targetGrade) => {
    // 1. Fetch Venue Details
    const { data: venue, error: venueError } = await supabase
        .from('exam_venues')
        .select('*')
        .eq('id', venueId)
        .single();
    if (venueError) throw new Error(`Venue error: ${venueError.message}`);

    // 2. Fetch All Papers for Session
    const { data: papers, error: papersError } = await supabase
        .from('exam_papers')
        .select('id')
        .eq('session_id', sessionId);
    if (papersError) throw new Error(`Papers error: ${papersError.message}`);
    if (papers.length === 0) throw new Error("No papers found in this session.");

    // 3. Fetch Eligible Students
    let query = supabase.from('users').select('id, grade, full_name').eq('school_id', schoolId).eq('role', 'student');
    
    const { data: allStudents, error: studentsError } = await query;
    if (studentsError) throw new Error(`Students error: ${studentsError.message}`);

    let eligibleStudents = allStudents;
    if (targetGrade && targetGrade.trim() !== "") {
        const normalizedTarget = targetGrade.trim().toLowerCase();
        eligibleStudents = allStudents.filter(s => 
            s.grade && s.grade.trim().toLowerCase() === normalizedTarget
        );
    }

    if (eligibleStudents.length === 0) throw new Error("No eligible students found.");
    if (eligibleStudents.length > venue.capacity) throw new Error(`Venue capacity (${venue.capacity}) is less than student count (${eligibleStudents.length}).`);

    const allAllocations = [];

    // 4. Loop through each paper and generate allocations
    for (const paper of papers) {
        // Fetch existing allocations for this paper to avoid duplicates
        const { data: existing } = await supabase
            .from('exam_seat_allocations')
            .select('student_id, seat_label')
            .eq('paper_id', paper.id);

        const existingStudentIds = new Set(existing?.map(a => a.student_id) || []);
        const occupiedSeats = new Set(existing?.map(a => a.seat_label) || []);
        const studentsToAllocate = eligibleStudents.filter(s => !existingStudentIds.has(s.id));

        let studentIdx = 0;
        // Fill venue row by row
        for (let r = 1; r <= venue.rows; r++) {
            for (let c = 1; c <= venue.columns; c++) {
                if (studentIdx >= studentsToAllocate.length) break;

                const seatLabel = `${String.fromCharCode(64 + r)}-${c}`; // A-1
                
                // Skip if seat is already taken in this paper
                if (occupiedSeats.has(seatLabel)) continue;

                const student = studentsToAllocate[studentIdx];

                allAllocations.push({
                    paper_id: paper.id,
                    student_id: student.id,
                    venue_id: venueId,
                    seat_row: r,
                    seat_col: c,
                    seat_label: seatLabel,
                    status: 'scheduled'
                });
                studentIdx++;
            }
        }
    }

    if (allAllocations.length === 0) return 0;

    // 5. Bulk Insert
    const { error: insertError } = await supabase
        .from('exam_seat_allocations')
        .insert(allAllocations);

    if (insertError) throw insertError;
    return allAllocations.length;
};

/**
 * Auto-allocates seats for a SPECIFIC paper.
 */
export const autoAllocatePaper = async (paperId, venueId, schoolId, targetGrade) => {
    // 1. Fetch Venue Details
    const { data: venue, error: venueError } = await supabase
        .from('exam_venues')
        .select('*')
        .eq('id', venueId)
        .single();
    if (venueError) throw new Error(`Venue error: ${venueError.message}`);

    // 2. Fetch Existing Allocations for this paper
    const { data: existing, error: existingError } = await supabase
        .from('exam_seat_allocations')
        .select('student_id, seat_label')
        .eq('paper_id', paperId);
    if (existingError) throw existingError;

    const allocatedStudentIds = new Set(existing?.map(a => a.student_id) || []);
    const occupiedSeats = new Set(existing?.map(a => a.seat_label) || []);

    // 3. Fetch Eligible Students
    const { data: allStudents, error: studentsError } = await supabase
        .from('users')
        .select('id, grade, full_name')
        .eq('school_id', schoolId)
        .eq('role', 'student');
    if (studentsError) throw new Error(`Students error: ${studentsError.message}`);

    let eligibleStudents = allStudents;
    if (targetGrade && targetGrade.trim() !== "") {
        const normalizedTarget = targetGrade.trim().toLowerCase();
        eligibleStudents = allStudents.filter(s => 
            s.grade && s.grade.trim().toLowerCase() === normalizedTarget
        );
    }

    const unallocatedStudents = eligibleStudents.filter(s => !allocatedStudentIds.has(s.id));
    if (unallocatedStudents.length === 0) throw new Error("All eligible students are already allocated for this paper.");

    const newAllocations = [];
    let studentIdx = 0;

    // 4. Generate seats based on Venue Capacity/Grid
    for (let r = 1; r <= venue.rows; r++) {
        for (let c = 1; c <= venue.columns; c++) {
            if (studentIdx >= unallocatedStudents.length) break;

            const seatLabel = `${String.fromCharCode(64 + r)}-${c}`;
            
            // Skip if seat is already taken in this paper
            if (occupiedSeats.has(seatLabel)) continue;

            newAllocations.push({
                paper_id: paperId,
                student_id: unallocatedStudents[studentIdx].id,
                venue_id: venueId,
                seat_row: r,
                seat_col: c,
                seat_label: seatLabel,
                status: 'scheduled'
            });
            studentIdx++;
        }
    }

    if (newAllocations.length === 0) throw new Error("No available seats in this venue.");

    const { error: insertError } = await supabase
        .from('exam_seat_allocations')
        .insert(newAllocations);

    if (insertError) throw insertError;
    return newAllocations.length;
};

export const clearPaperAllocations = async (paperId) => {
    const { error } = await supabase
        .from('exam_seat_allocations')
        .delete()
        .eq('paper_id', paperId);

    if (error) throw error;
};

export const clearSessionAllocations = async (sessionId) => {
    // We need to find all papers in the session and delete their allocations
    // Or we can delete from exam_seat_allocations where paper_id in (select id from exam_papers where session_id = ...)
    // But Supabase JS doesn't support subquery delete easily directly like that without RLS or specific setup usually.
    // Easiest is to fetch paper IDs then delete.
    
    const { data: papers, error: papersError } = await supabase
        .from('exam_papers')
        .select('id')
        .eq('session_id', sessionId);
    
    if (papersError) throw papersError;
    
    const paperIds = papers.map(p => p.id);
    
    if (paperIds.length > 0) {
        const { error } = await supabase
            .from('exam_seat_allocations')
            .delete()
            .in('paper_id', paperIds);
            
        if (error) throw error;
    }
};

// --- INVIGILATORS ---

export const fetchInvigilators = async (paperId) => {
    const { data, error } = await supabase
        .from('exam_invigilators')
        .select('*, teacher:users(id, full_name, email)')
        .eq('paper_id', paperId);

    if (error) throw error;
    return data || [];
};

export const assignInvigilator = async (invigilatorData) => {
    const { data, error } = await supabase
        .from('exam_invigilators')
        .insert(invigilatorData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const removeInvigilator = async (id) => {
    const { error } = await supabase
        .from('exam_invigilators')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- NOTIFICATIONS ---

export const notifySessionStudents = async (sessionId, sessionName) => {
    // 1. Get all papers for this session
    const { data: papers, error: papersError } = await supabase
        .from('exam_papers')
        .select('id')
        .eq('session_id', sessionId);

    if (papersError) throw papersError;

    const paperIds = papers.map(p => p.id);
    if (paperIds.length === 0) {
        return { count: 0, message: 'No papers found for this session.' };
    }

    // 2. Get students allocated to these papers
    const { data: allocations, error: allocError } = await supabase
        .from('exam_seat_allocations')
        .select('student_id, student:users(full_name)')
        .in('paper_id', paperIds);

    if (allocError) throw allocError;

    // Get unique students map (id -> full_name)
    const studentMap = new Map();
    allocations.forEach(a => {
        if (a.student) studentMap.set(a.student_id, a.student.full_name);
    });
    const studentIds = Array.from(studentMap.keys());

    if (studentIds.length === 0) {
        return { count: 0, message: 'No students are allocated for this session yet.' };
    }

    // 3. Create notifications for STUDENTS
    const notifications = studentIds.map(studentId => ({
        user_id: studentId,
        type: 'exam_schedule',
        title: 'Exam Schedule Published',
        message: `The schedule for ${sessionName} is now available. Check your 'My Exams' section.`,
        is_read: false,
        created_at: new Date().toISOString()
    }));

    // 4. Fetch PARENTS of these students
    const { data: relationships, error: relError } = await supabase
        .from('parent_child_relationships')
        .select('parent_id, child_id')
        .in('child_id', studentIds);

    if (!relError && relationships) {
        relationships.forEach(rel => {
            const childName = studentMap.get(rel.child_id);
            notifications.push({
                user_id: rel.parent_id,
                type: 'announcement',
                title: `Exam Schedule: ${childName}`,
                message: `The exam schedule for ${childName} (${sessionName}) has been published.`,
                is_read: false,
                created_at: new Date().toISOString()
            });
        });
    }

    const { error: notifyError } = await supabase
        .from('notifications')
        .insert(notifications);

    if (notifyError) throw notifyError;

    // 5. Update Papers and Session status
    // Mark these specific papers as notified
    const { error: updatePapersError } = await supabase
        .from('exam_papers')
        .update({ notifications_sent: true })
        .in('id', paperIds);

    if (updatePapersError) throw updatePapersError;

    // Mark session as notified
    const { error: updateError } = await supabase
        .from('exam_sessions')
        .update({ notifications_sent: true })
        .eq('id', sessionId);

    if (updateError) throw updateError;

    return { count: studentIds.length, parents: relationships?.length || 0 };
};

