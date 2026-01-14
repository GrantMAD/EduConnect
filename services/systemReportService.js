import { supabase } from '../lib/supabase';

export const createSystemReport = async (reportData) => {
    const { data, error } = await supabase
        .from('system_reports')
        .insert([reportData])
        .select()
        .single();

    if (error) throw error;
    return data;
};
