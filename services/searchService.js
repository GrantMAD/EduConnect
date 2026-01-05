import { supabase } from '../lib/supabase';

export const searchEverything = async ({ schoolId, query, filters = {} }) => {
    const term = `%${query}%`;
    const searchTasks = [];

    if (!schoolId) return [];

    if (filters.all || filters.announcements) {
        searchTasks.push(
            supabase
                .from('announcements')
                .select('id, title, message, created_at')
                .eq('school_id', schoolId)
                .ilike('title', term)
                .limit(10)
                .then(res => (res.data || []).map(item => ({ ...item, type: 'announcement' })))
        );
    }

    if (filters.all || filters.homework) {
        searchTasks.push(
            supabase
                .from('homework')
                .select('id, subject, description, due_date')
                .eq('school_id', schoolId)
                .ilike('subject', term)
                .limit(10)
                .then(res => (res.data || []).map(item => ({ ...item, type: 'homework', title: item.subject })))
        );
    }

    if (filters.all || filters.assignments) {
        searchTasks.push(
            supabase
                .from('assignments')
                .select('id, title, description, due_date')
                .eq('school_id', schoolId)
                .ilike('title', term)
                .limit(10)
                .then(res => (res.data || []).map(item => ({ ...item, type: 'assignment' })))
        );
    }

    if (filters.all || filters.resources) {
        searchTasks.push(
            supabase
                .from('resources')
                .select('id, title, description, category')
                .eq('school_id', schoolId)
                .ilike('title', term)
                .limit(10)
                .then(res => (res.data || []).map(item => ({ ...item, type: 'resource' })))
        );
    }

    if (filters.all || filters.users) {
        searchTasks.push(
            supabase
                .from('users')
                .select('id, full_name, email, role, avatar_url')
                .eq('school_id', schoolId)
                .ilike('full_name', term)
                .limit(10)
                .then(res => (res.data || []).map(item => ({ ...item, type: 'user', title: item.full_name })))
        );
    }

    if (filters.all || filters.classes) {
        searchTasks.push(
            supabase
                .from('classes')
                .select('id, name')
                .eq('school_id', schoolId)
                .ilike('name', term)
                .limit(10)
                .then(res => (res.data || []).map(item => ({ ...item, type: 'class', title: item.name })))
        );
    }

    const allResults = await Promise.all(searchTasks);
    return allResults.flat();
};
