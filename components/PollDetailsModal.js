import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faChartBar, faUsers, faClock, faUser } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function PollDetailsModal({ visible, poll, onClose }) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [voteStats, setVoteStats] = useState({});
    const [totalVotes, setTotalVotes] = useState(0);
    const [voters, setVoters] = useState([]);

    useEffect(() => {
        if (visible && poll) {
            fetchPollVotes();
        }
    }, [visible, poll]);

    const fetchPollVotes = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('poll_votes')
                .select('*, users(id, full_name, avatar_url, role, email)')
                .eq('poll_id', poll.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const stats = {};
            // Initialize stats with 0 for all options
            if (poll.options && Array.isArray(poll.options)) {
                poll.options.forEach(option => {
                    stats[option] = 0;
                });
            }

            // Count votes
            data.forEach(vote => {
                if (stats[vote.selected_option] !== undefined) {
                    stats[vote.selected_option]++;
                }
            });

            setVoteStats(stats);
            setTotalVotes(data.length);
            setVoters(data);
        } catch (error) {
            console.error('Error fetching poll votes:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return '#FF3B30';
            case 'teacher': return '#34C759';
            case 'student': return '#5856D6';
            case 'parent': return '#FF9500';
            default: return '#8E8E93';
        }
    };

    if (!poll) return null;

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faChartBar} size={24} color="#FF9500" />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Poll Details</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.question, { color: theme.colors.text }]}>
                        {poll.question}
                    </Text>

                    <View style={styles.metaContainer}>
                        <View style={styles.metaItem}>
                            <FontAwesomeIcon icon={faClock} size={14} color={theme.colors.placeholder} />
                            <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                Ends: {formatDate(poll.end_date)}
                            </Text>
                        </View>
                        {poll.target_roles && (
                            <View style={styles.metaItem}>
                                <FontAwesomeIcon icon={faUsers} size={14} color={theme.colors.placeholder} />
                                <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                    Target: {poll.target_roles.join(', ')}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Results ({totalVotes} votes)
                    </Text>

                    {loading ? (
                        <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <>
                            <View style={styles.optionsContainer}>
                                {poll.options && poll.options.map((option, index) => {
                                    const count = voteStats[option] || 0;
                                    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                                    return (
                                        <View key={index} style={styles.optionItem}>
                                            <View style={styles.optionHeader}>
                                                <Text style={[styles.optionText, { color: theme.colors.text }]}>
                                                    {option}
                                                </Text>
                                                <Text style={[styles.percentageText, { color: theme.colors.text }]}>
                                                    {percentage}% ({count})
                                                </Text>
                                            </View>
                                            <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.cardBorder }]}>
                                                <View
                                                    style={[
                                                        styles.progressBarFill,
                                                        {
                                                            width: `${percentage}%`,
                                                            backgroundColor: '#FF9500'
                                                        }
                                                    ]}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {voters.length > 0 && (
                                <View style={styles.votersSection}>
                                    <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>
                                        Voters
                                    </Text>
                                    {voters.map((vote) => (
                                        <View key={vote.id} style={[styles.voterCard, { backgroundColor: theme.colors.cardBackground, borderColor: theme.colors.cardBorder }]}>
                                            <View style={styles.voterInfo}>
                                                {vote.users?.avatar_url ? (
                                                    <Image source={{ uri: vote.users.avatar_url }} style={styles.avatar} />
                                                ) : (
                                                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.cardBorder }]}>
                                                        <FontAwesomeIcon icon={faUser} size={16} color={theme.colors.placeholder} />
                                                    </View>
                                                )}
                                                <View style={styles.voterDetails}>
                                                    <Text style={[styles.voterName, { color: theme.colors.text }]}>
                                                        {vote.users?.full_name || 'Unknown User'}
                                                    </Text>
                                                    {vote.users?.email && (
                                                        <Text style={[styles.voterEmail, { color: theme.colors.placeholder }]}>
                                                            {vote.users.email}
                                                        </Text>
                                                    )}
                                                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(vote.users?.role) }]}>
                                                        <Text style={styles.roleText}>
                                                            {vote.users?.role ? vote.users.role.charAt(0).toUpperCase() + vote.users.role.slice(1) : 'User'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={[styles.voteBadge, { backgroundColor: theme.colors.cardBorder }]}>
                                                <Text style={[styles.voteText, { color: theme.colors.text }]}>
                                                    {vote.selected_option}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: '80%',
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 15,
        flex: 1,
    },
    closeButton: {
        padding: 5,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    question: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
        lineHeight: 26,
    },
    metaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
        gap: 15,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 15,
    },
    optionsContainer: {
        gap: 15,
    },
    optionItem: {
        marginBottom: 5,
    },
    optionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    optionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    percentageText: {
        fontSize: 14,
        fontWeight: '600',
    },
    progressBarBackground: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    votersSection: {
        marginTop: 10,
    },
    voterCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    voterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    voterDetails: {
        justifyContent: 'center',
    },
    voterName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    voterEmail: {
        fontSize: 12,
        marginBottom: 4,
    },
    roleBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    roleText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
    voteBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginLeft: 10,
    },
    voteText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
