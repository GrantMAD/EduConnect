import { supabase } from '../lib/supabase';

export const fetchResources = async (schoolId, classIds = []) => {
    let query = supabase
        .from('resources')
        .select('*, author:users(full_name)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

    if (classIds.length > 0) {
        query = query.or(`class_id.is.null,class_id.in.(${classIds.join(',')})`);
    } else {
        query = query.is('class_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const fetchResourceView = async (userId, resourceId) => {
    const { data, error } = await supabase
        .from('resource_views')
        .select('xp_awarded')
        .eq('user_id', userId)
        .eq('resource_id', resourceId)
        .maybeSingle();
    
    if (error) throw error;
    return data;
};

export const trackResourceView = async (userId, resourceId) => {
    const { data, error } = await supabase
        .from('resource_views')
        .insert({
            user_id: userId,
            resource_id: resourceId,
            xp_awarded: true
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
};

export const createResource = async (resourceData) => {
    const { data, error } = await supabase
        .from('resources')
        .insert([resourceData])
        .select();
    
    if (error) throw error;
    return data[0];
};

export const updateResource = async (id, resourceData) => {
    const { data, error } = await supabase
        .from('resources')
        .update(resourceData)
        .eq('id', id)
        .select();
    
    if (error) throw error;
    return data[0];
};

export const deleteResource = async (id) => {
    const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);
    
    if (error) throw error;
    return true;
};

export const uploadResourceFile = async (filePath, fileBody) => {
    const { data, error } = await supabase.storage
        .from('resources')
        .upload(filePath, fileBody);
    
    if (error) throw error;
    return data;
};

export const getResourceUrl = (filePath) => {
    const { data } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);
    return data.publicUrl;
};

export const voteResource = async (resourceId, userId, voteValue) => {
    const { data, error } = await supabase
        .from('resource_votes')
        .upsert(
            { resource_id: resourceId, user_id: userId, vote: voteValue },
            { onConflict: 'resource_id,user_id' }
        )
        .select();
    
    if (error) throw error;
    return data[0];
};

export const fetchResourceVotes = async (resourceId) => {
    const { data, error } = await supabase
        .from('resource_votes')
        .select('vote,user_id')
        .eq('resource_id', resourceId);
    
    if (error) throw error;
    return data || [];
};

export const fetchResourceBookmarks = async (userId) => {

    const { data, error } = await supabase

        .from('resource_bookmarks')

        .select('resource_id')

        .eq('user_id', userId);

    

    if (error) throw error;

    return data || [];

};



export const addBookmark = async (userId, resourceId) => {

    const { data, error } = await supabase

        .from('resource_bookmarks')

        .insert({ user_id: userId, resource_id: resourceId })

        .select();

    

    if (error) throw error;

    return data[0];

};



export const removeBookmark = async (userId, resourceId) => {

    const { error } = await supabase

        .from('resource_bookmarks')

        .delete()

        .eq('user_id', userId)

        .eq('resource_id', resourceId);

    

    if (error) throw error;

    return true;

};



export const fetchResourcesWithVotes = async ({ schoolId, activeTab, userId, category }) => {
    let query = supabase
        .from('resources')
        .select(`
            *,
            users (full_name, email)
        `);

    if (activeTab === 'personal') {
        query = query.eq('is_personal', true).eq('uploaded_by', userId);
    } else {
        query = query.eq('school_id', schoolId).eq('is_personal', false);
    }

    if (category && category !== 'All') {
        query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const resourcesWithVotes = await Promise.all(
        data.map(async (resource) => {
            const { data: votes } = await supabase
                .from('resource_votes')
                .select('vote')
                .eq('resource_id', resource.id);

            const upvotes = votes?.filter(v => v.vote === 1).length || 0;
            const downvotes = votes?.filter(v => v.vote === -1).length || 0;

            return { ...resource, upvotes, downvotes };
        })
    );

    return resourcesWithVotes;
};




