import { supabase } from '../lib/supabase';

export const fetchSchoolById = async (schoolId) => {
    const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();
    
    if (error) throw error;
    return data;
};

export const updateSchool = async (schoolId, schoolData) => {
    const { data, error } = await supabase
        .from('schools')
        .update(schoolData)
        .eq('id', schoolId)
        .select();
    
    if (error) throw error;
    return data[0];
};

export const createSchool = async (schoolData) => {
    const { data, error } = await supabase
        .from('schools')
        .insert([schoolData])
        .select();
    
    if (error) throw error;
    return data[0];
};

export const removeUserFromSchool = async (schoolId, userId) => {
    const { data: schoolData, error: schoolFetchError } = await supabase
        .from('schools')
        .select('users')
        .eq('id', schoolId)
        .single();

    if (schoolFetchError) throw schoolFetchError;

    if (schoolData?.users) {
        const updatedUsers = schoolData.users.filter(id => id !== userId);
        const { error: updateSchoolError } = await supabase
            .from('schools')
            .update({ users: updatedUsers })
            .eq('id', schoolId);

        if (updateSchoolError) throw updateSchoolError;
    }
    return true;
};


export const uploadSchoolLogo = async (filePath, fileBody) => {
    const { data, error } = await supabase.storage
        .from('school_logos')
        .upload(filePath, fileBody);
    
    if (error) throw error;
    return data;
};

export const getSchoolLogoUrl = (filePath) => {
    const { data } = supabase.storage
        .from('school_logos')
        .getPublicUrl(filePath);
    return data.publicUrl;
};

export const searchSchools = async (searchTerm) => {
    const { data, error } = await supabase
        .from('schools')
        .select('id, name, created_by, logo_url, address')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);
    
    if (error) throw error;
    return data || [];
};

export const fetchSchoolNameById = async (schoolId) => {
    const { data, error } = await supabase
        .from('schools')
        .select('name, created_by')
        .eq('id', schoolId)
        .single();
    
    if (error) throw error;
    return data;
};
