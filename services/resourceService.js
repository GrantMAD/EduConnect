import { supabase } from '../lib/supabase';

export const fetchResources = async (schoolId, classIds = [], strict = false) => {
    let query = supabase
        .from('resources')
        .select('*, author:users(full_name), class_resources(class_id)')
        .eq('school_id', schoolId)
        .eq('is_personal', false)
        .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    if (!data) return [];

    // If specific classes are requested
    if (classIds.length > 0) {
        return data.filter(resource => {
            const linkedClassIds = resource.class_resources?.map(cr => cr.class_id) || [];
            
            // If strict, only show if linked to one of the provided classes
            if (strict) {
                return linkedClassIds.some(cid => classIds.includes(cid));
            }

            // If not strict (Global View), show if it has NO links (Global) OR matches provided IDs
            if (linkedClassIds.length === 0) return true;
            return linkedClassIds.some(cid => classIds.includes(cid));
        });
    }

    // Default: Only show Global (no links)
    return data.filter(resource => !resource.class_resources || resource.class_resources.length === 0);
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



export const fetchResourcesWithVotes = async ({ schoolId, activeTab, userId, category, profile, classIds = [] }) => {
    let query = supabase
        .from('resources')
        .select(`
            *,
            users (full_name, email),
            class_resources(class_id, classes(name))
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

    let filteredData = data;

    // Filter for students/parents: Show Global (no class links) OR resources linked to their classes
    if (activeTab !== 'personal' && (profile?.role === 'student' || profile?.role === 'parent')) {
        filteredData = data.filter(resource => {
            const linkedClassIds = resource.class_resources?.map(cr => cr.class_id) || [];
            // Global = no links in class_resources
            if (linkedClassIds.length === 0) return true;
            // Targeted = check if any link matches user's classes
            return linkedClassIds.some(cid => classIds.includes(cid));
        });
    }

    const resourcesWithVotes = await Promise.all(
        filteredData.map(async (resource) => {
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




