import { supabase } from '../lib/supabase';

export const fetchPolls = async (schoolId, userId) => {
    try {
        const [pollsResult, userVotesResult] = await Promise.all([
            supabase
                .from('polls')
                .select('id, question, options, type, settings, end_date, created_at, users:created_by(full_name)')
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

        // Fetch all votes for stats
        const { data: allVotes } = await supabase
            .from('poll_votes')
            .select('poll_id, selected_option')
            .in('poll_id', pollsResult.data?.map(p => p.id) || []);

        const pollsWithUserVotes = (pollsResult.data || []).map(poll => {
            const pollVotes = allVotes?.filter(v => v.poll_id === poll.id) || [];
            const totalVotes = pollVotes.length;
            const counts = {};
            let averageRating = 0;
            let openEndedResponses = [];

            if (poll.type === 'rating') {
                const sum = pollVotes.reduce((acc, v) => acc + parseInt(v.selected_option || 0), 0);
                averageRating = totalVotes > 0 ? sum / totalVotes : 0;
                const max = poll.settings?.max_rating || 5;
                for (let i = 1; i <= max; i++) counts[i] = 0;
                pollVotes.forEach(v => {
                    const val = parseInt(v.selected_option);
                    if (counts[val] !== undefined) counts[val]++;
                });
            } else if (poll.type === 'open_ended') {
                openEndedResponses = pollVotes.map(v => v.selected_option).filter(Boolean);
            } else if (poll.type === 'multiple_choice') {
                poll.options.forEach(opt => counts[opt] = 0);
                pollVotes.forEach(v => {
                    try {
                        const selected = JSON.parse(v.selected_option);
                        if (Array.isArray(selected)) {
                            selected.forEach(opt => {
                                if (counts[opt] !== undefined) counts[opt]++;
                            });
                        }
                    } catch (e) {
                        if (counts[v.selected_option] !== undefined) counts[v.selected_option]++;
                    }
                });
            } else {
                poll.options.forEach(opt => counts[opt] = 0);
                pollVotes.forEach(v => {
                    if (counts[v.selected_option] !== undefined) counts[v.selected_option]++;
                });
            }

            return {
                ...poll,
                userVote: userVotesResult.data?.find(v => v.poll_id === poll.id),
                stats: { totalVotes, counts, averageRating, openEndedResponses }
            };
        });

        return pollsWithUserVotes;
    } catch (error) {
        console.error('Error fetching polls in pollService:', error);
        throw error;
    }
};

export const fetchPollVotes = async (pollId) => {
    const { data, error } = await supabase
        .from('poll_votes')
        .select('user_id, selected_option, created_at, users:user_id(full_name, avatar_url, role)')
        .eq('poll_id', pollId);

    if (error) throw error;
    return data || [];
};

export const castVote = async (pollId, userId, option) => {
    const value = typeof option === 'string' ? option : JSON.stringify(option);
    const { data, error } = await supabase.from('poll_votes').insert([
        { poll_id: pollId, user_id: userId, selected_option: value },
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

