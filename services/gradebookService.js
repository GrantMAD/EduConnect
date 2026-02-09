import { supabase } from '../lib/supabase';

export const fetchGradingCategories = async (classId) => {
    const { data, error } = await supabase
        .from('grading_categories')
        .select('*')
        .eq('class_id', classId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const saveGradingCategory = async (categoryData) => {
    const { data, error } = await supabase
        .from('grading_categories')
        .upsert(categoryData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteGradingCategory = async (categoryId) => {
    const { error } = await supabase
        .from('grading_categories')
        .delete()
        .eq('id', categoryId);

    if (error) throw error;
};

export const fetchGradebookData = async (classId) => {
    // 1. Fetch standard student_marks
    const { data: standardMarks, error: marksError } = await supabase
        .from('student_marks')
        .select(`
            *,
            student:users!student_id (id, full_name, avatar_url, email),
            category:grading_categories!category_id (id, name, weight)
        `)
        .eq('class_id', classId)
        .order('assessment_date', { ascending: true });

    if (marksError) throw marksError;

    // 2. Fetch homework/assignment completions that are linked to categories
    // Note: On mobile we might not have the elaborate 'or' query support in same way if using older supabase-js, 
    // but the following is the standard way to match the web logic.
    const { data: homeworkCompletions, error: hwError } = await supabase
        .from('student_completions')
        .select(`
            id, score, total_possible, 
            student:users!student_id (id, full_name, avatar_url, email),
            homework:homework!homework_id (subject, grading_category_id, created_at, created_by),
            assignment:assignments!assignment_id (title, grading_category_id, created_at, assigned_by)
        `)
        .or('homework_id.not.is.null,assignment_id.not.is.null')
        .filter('score', 'not.is.null');

    if (hwError) throw hwError;

    // Filter and transform completions into the same format as standard marks
    // We only want those that belong to THIS class and have a category
    const mappedCompletions = homeworkCompletions
        .filter(c => {
            const hwMatched = c.homework && c.homework.grading_category_id;
            const asgnMatched = c.assignment && c.assignment.grading_category_id;
            // Additional check: Does the homework/assignment belong to this class?
            // Since we can't easily filter by class_id through the join in one step without complex RPC or specialized policy,
            // we'll rely on the grading_category_id which is specific to that class.
            return hwMatched || asgnMatched;
        })
        .map(c => {
            const source = c.homework || c.assignment;
            const catId = source.grading_category_id;

            return {
                id: c.id,
                student_id: c.student.id,
                student: c.student,
                category_id: catId,
                score: c.score,
                total_possible: c.total_possible,
                assessment_name: source.subject || source.title,
                assessment_date: source.created_at,
                is_completion_mark: true
            };
        });

    // Final filtering to ensure categories actually belong to this class (security/correctness)
    // and combining with standard marks
    return [...standardMarks, ...mappedCompletions].sort((a, b) =>
        new Date(a.assessment_date || a.created_at) - new Date(b.assessment_date || b.created_at)
    );
};

export const saveStudentMarks = async (marksData) => {
    const { data, error } = await supabase
        .from('student_marks')
        .upsert(marksData)
        .select();

    if (error) throw error;
    return data;
};

export const calculateWeightedGrade = (studentMarks, categories) => {
    if (!categories || categories.length === 0) return null;

    let totalWeight = 0;
    let weightedSum = 0;

    categories.forEach(category => {
        const categoryMarks = studentMarks.filter(m => m.category_id === category.id);
        if (categoryMarks.length > 0) {
            const categoryAverage = categoryMarks.reduce((sum, mark) => {
                const percentage = (mark.score / mark.total_possible) * 100;
                return sum + percentage;
            }, 0) / categoryMarks.length;

            weightedSum += categoryAverage * (category.weight / 100);
            totalWeight += (category.weight / 100);
        }
    });

    if (totalWeight === 0) return null;
    return (weightedSum / totalWeight).toFixed(1);
};
