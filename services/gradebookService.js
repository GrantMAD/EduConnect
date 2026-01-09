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
    const { data, error } = await supabase
        .from('student_marks')
        .select(`
            *,
            student:users!student_id (
                id,
                full_name,
                avatar_url,
                email
            ),
            category:grading_categories!category_id (
                id,
                name,
                weight
            )
        `)
        .eq('class_id', classId)
        .order('assessment_date', { ascending: true });

    if (error) throw error;
    return data || [];
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
