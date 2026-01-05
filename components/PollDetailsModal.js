import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faChartBar, faUsers, faClock, faUser } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

// Import services
import { fetchPollVotes } from '../services/pollService';

const PollDetailsModal = React.memo(({ visible, poll, onClose }) => {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [voteStats, setVoteStats] = useState({});
    const [totalVotes, setTotalVotes] = useState(0);
    const [voters, setVoters] = useState([]);

    useEffect(() => {
        if (visible && poll) {
            fetchPollVotesData();
        }
    }, [visible, poll]);

    const fetchPollVotesData = async () => {
        setLoading(true);
        try {
            const data = await fetchPollVotes(poll.id);

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
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.4}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: '#f59e0b' + '15' }]}>
                        <FontAwesomeIcon icon={faChartBar} size={18} color="#f59e0b" />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Poll Results</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.question, { color: theme.colors.text }]}>
                        {poll.question}
                    </Text>

                    <View style={styles.metaContainer}>
                        <View style={[styles.metaItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                            <FontAwesomeIcon icon={faClock} size={10} color={theme.colors.placeholder} />
                            <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                ENDS {new Date(poll.end_date).toLocaleDateString().toUpperCase()}
                            </Text>
                        </View>
                        {poll.target_roles && (
                            <View style={[styles.metaItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                <FontAwesomeIcon icon={faUsers} size={10} color={theme.colors.placeholder} />
                                <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                    {poll.target_roles.join(', ').toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        STATISTICS ({totalVotes} VOTES)
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
                                                    {percentage}%
                                                </Text>
                                            </View>
                                            <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.cardBorder }]}>
                                                <View
                                                    style={[
                                                        styles.progressBarFill,
                                                        {
                                                            width: `${percentage}%`,
                                                            backgroundColor: '#f59e0b'
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
                                    <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 32 }]}>
                                        PARTICIPANTS
                                    </Text>
                                    {voters.map((vote) => (
                                        <View key={vote.id} style={[styles.voterCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                                            <View style={styles.voterInfo}>
                                                {vote.users?.avatar_url ? (
                                                    <Image source={{ uri: vote.users.avatar_url }} style={styles.avatar} />
                                                ) : (
                                                    <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.background }]}>
                                                        <FontAwesomeIcon icon={faUser} size={14} color={theme.colors.placeholder} />
                                                    </View>
                                                )}
                                                <View style={styles.voterDetails}>
                                                    <Text style={[styles.voterName, { color: theme.colors.text }]}>
                                                        {vote.users?.full_name || 'Anonymous User'}
                                                    </Text>
                                                    <View style={[styles.roleBadge, { backgroundColor: getRoleColor(vote.users?.role) + '15' }]}>
                                                        <Text style={[styles.roleText, { color: getRoleColor(vote.users?.role) }]}>
                                                            {vote.users?.role?.toUpperCase() || 'USER'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                            <View style={[styles.voteBadge, { backgroundColor: theme.colors.primary + '10' }]}>
                                                <Text style={[styles.voteText, { color: theme.colors.primary }]}>
                                                    {vote.selected_option.toUpperCase()}
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
});

const styles = StyleSheet.create({
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 40,
        maxHeight: '85%',
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        flex: 1,
        letterSpacing: -0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingVertical: 24,
    },
    question: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 16,
        lineHeight: 26,
    },
    metaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 32,
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    metaText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 20,
        letterSpacing: 1.5,
        color: '#94a3b8',
    },
    optionsContainer: {
        gap: 16,
    },
    optionItem: {
        marginBottom: 8,
    },
    optionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '700',
    },
    percentageText: {
        fontSize: 13,
        fontWeight: '800',
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
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    voterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 14,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    voterDetails: {
        justifyContent: 'center',
    },
    voterName: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    roleText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    voteBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginLeft: 10,
    },
    voteText: {
        fontSize: 10,
        fontWeight: '900',
    },
});

export default PollDetailsModal;
