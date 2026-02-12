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
    const { data: completions, error: hwError } = await supabase
        .from('student_completions')
        .select(`
            id, score, total_possible, 
            student:users!student_id (id, full_name, avatar_url, email),
            homework:homework!homework_id (subject, grading_category_id, created_at, class_id),
            assignment:assignments!assignment_id (title, grading_category_id, created_at, class_id)
        `)
        .filter('score', 'not.is.null');

    if (hwError) throw hwError;

    // Filter and transform completions into the same format as standard marks
    const mappedCompletions = completions
        .filter(c => {
            const item = c.homework || c.assignment;
            return item && item.grading_category_id && item.class_id === classId;
        })
        .map(c => {
            const source = c.homework || c.assignment;
            return {
                id: c.id,
                student_id: c.student.id,
                student: c.student,
                category_id: source.grading_category_id,
                score: c.score,
                total_possible: c.total_possible,
                assessment_name: source.subject || source.title,
                assessment_date: source.created_at,
                is_completion_mark: true
            };
        });

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
