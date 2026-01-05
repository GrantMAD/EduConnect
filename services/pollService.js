import { supabase } from '../lib/supabase';

export const fetchPolls = async (schoolId, userId) => {
    try {
        const [pollsResult, userVotesResult] = await Promise.all([
            supabase
                .from('polls')
                .select('id, question, options, end_date, created_at, users:created_by(full_name)')
                .eq('school_id', schoolId)
                .order('created_at', { ascending: false })
                .limit(50),

            userId ? supabase
                .from('poll_votes')
                .select('poll_id, selected_option')
                .eq('user_id', userId)
                : Promise.resolve({ data: [], error: null })
        ]);

        if (pollsResult.error) throw pollsResult.error;

        const pollsWithUserVotes = (pollsResult.data || []).map(poll => ({
            ...poll,
            poll_votes: userVotesResult.data?.filter(v => v.poll_id === poll.id) || []
        }));

        return pollsWithUserVotes;
    } catch (error) {
        console.error('Error fetching polls in pollService:', error);
        throw error;
    }
};

export const fetchPollVotes = async (pollId) => {
    const { data, error } = await supabase
        .from('poll_votes')
        .select('user_id, selected_option')
        .eq('poll_id', pollId);

    if (error) throw error;
    return data || [];
};

export const castVote = async (pollId, userId, option) => {
    const { data, error } = await supabase.from('poll_votes').insert([
        { poll_id: pollId, user_id: userId, selected_option: option },
    ]).select();

    if (error) throw error;
    return data[0];
};

export const createPoll = async (pollData) => {
    const { data, error } = await supabase
        .from('polls')
        .insert([pollData])
        .select();
    
    if (error) throw error;
    return data[0];
};

export const deletePollsByUser = async (userId) => {
    const { error } = await supabase
        .from('polls')
        .delete()
        .eq('created_by', userId);
    
    if (error) throw error;
    return true;
};

