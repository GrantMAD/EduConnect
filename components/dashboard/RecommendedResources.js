import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faLightbulb, faThumbsUp, faChevronRight, faFileAlt,
    faGlobe, faFilePdf, faFileImage, faFileVideo,
    faFileWord, faFilePowerpoint, faStar
} from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import WalkthroughTarget from '../WalkthroughTarget';

const RecommendedResources = React.memo(({ id, schoolId, userId, role }) => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (schoolId && userId) {
            fetchRecommendations();
        }
    }, [schoolId, userId]);

    const fetchRecommendations = async () => {
        setLoading(true);
        try {
            // 1. Determine target subjects based on role
            let subjects = [];
            if (role === 'student') {
                const { data: classMembers } = await supabase
                    .from('class_members')
                    .select('classes(subject)')
                    .eq('user_id', userId);
                subjects = classMembers?.map(m => m.classes?.subject).filter(Boolean) || [];
            } else if (role === 'parent') {
                const { data: relationships } = await supabase
                    .from('parent_child_relationships')
                    .select('child_id')
                    .eq('parent_id', userId);

                const childIds = relationships?.map(r => r.child_id) || [];
                if (childIds.length > 0) {
                    const { data: classMembers } = await supabase
                        .from('class_members')
                        .select('classes(subject)')
                        .in('user_id', childIds);
                    subjects = classMembers?.map(m => m.classes?.subject).filter(Boolean) || [];
                }
            }

            const uniqueSubjects = [...new Set(subjects)];

            // 2. Fetch resources in those subjects
            let query = supabase
                .from('resources')
                .select('*, users(full_name)')
                .eq('school_id', schoolId)
                .eq('is_personal', false);

            if (uniqueSubjects.length > 0) {
                query = query.in('category', uniqueSubjects);
            }

            const { data: resources, error } = await query.limit(20);
            if (error) throw error;

            if (resources && resources.length > 0) {
                const resourceIds = resources.map(r => r.id);
                const { data: votes } = await supabase
                    .from('resource_votes')
                    .select('resource_id, vote')
                    .in('resource_id', resourceIds);

                // Calculate scores
                const scoredResources = resources.map(res => {
                    const resVotes = votes?.filter(v => v.resource_id === res.id) || [];
                    const netVotes = resVotes.reduce((acc, v) => acc + v.vote, 0);
                    return { ...res, score: netVotes };
                });

                // Sort by score and take top 3
                const topResources = scoredResources
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3);

                setRecommendations(topResources);
            } else {
                setRecommendations([]); // Ensure it's empty array
            }
        } catch (err) {
            console.error('Error fetching recommendations:', err);
        } finally {
            setLoading(false);
        }
    };

    const getResourceIcon = (fileUrl, hasUrl) => {
        if (hasUrl) return faGlobe;
        if (!fileUrl) return faFileAlt;
        const lowerUrl = fileUrl.toLowerCase();
        if (lowerUrl.endsWith('.pdf')) return faFilePdf;
        if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/)) return faFileImage;
        if (lowerUrl.match(/\.(mp4|webm|ogg)$/)) return faFileVideo;
        if (lowerUrl.match(/\.(doc|docx)$/)) return faFileWord;
        if (lowerUrl.match(/\.(ppt|pptx)$/)) return faFilePowerpoint;
        return faFileAlt;
    };

    if (loading) {
        return (
            <WalkthroughTarget id={id}>
                <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
            </WalkthroughTarget>
        );
    }

    if (recommendations.length === 0) {
        return (
            <WalkthroughTarget id={id}>
                <View style={[styles.container, { backgroundColor: theme.colors.card, alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }]}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface, marginBottom: 12 }]}>
                        <FontAwesomeIcon icon={faLightbulb} color={theme.colors.placeholder} size={20} />
                    </View>
                    <Text style={[styles.title, { color: theme.colors.textSecondary, fontSize: 14 }]}>No recommendations yet</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.placeholder, textAlign: 'center', marginTop: 4 }]}>
                        Join classes to see recommended learning materials here.
                    </Text>
                </View>
            </WalkthroughTarget>
        );
    }

    return (
        <WalkthroughTarget id={id}>
            <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: '#f59e0b' + '15' }]}>
                            <FontAwesomeIcon icon={faLightbulb} color="#f59e0b" size={16} />
                        </View>
                        <View>
                            <Text style={[styles.title, { color: theme.colors.text }]}>Study Insights</Text>
                            <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>TOP MATERIALS IN YOUR SUBJECTS</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => navigation.navigate('Resources')} activeOpacity={0.7}>
                        <Text style={[styles.viewAll, { color: theme.colors.primary }]}>VIEW ALL</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.list}>
                    {recommendations.map((resource) => (
                        <TouchableOpacity
                            key={resource.id}
                            style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
                            onPress={() => navigation.navigate('Resources', { openResourceId: resource.id })}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.itemIcon, { backgroundColor: theme.colors.card }]}>
                                <FontAwesomeIcon icon={getResourceIcon(resource.file_url, !!resource.url)} color={theme.colors.primary} size={16} />
                            </View>
                            <View style={styles.itemContent}>
                                <View style={styles.itemHeader}>
                                    <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={1}>
                                        {resource.title}
                                    </Text>
                                    {resource.score > 5 && (
                                        <View style={[styles.trendingBadge, { backgroundColor: '#f59e0b' + '15' }]}>
                                            <Text style={[styles.trendingText, { color: '#f59e0b' }]}>TRENDING</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.itemFooter}>
                                    <Text style={[styles.category, { color: theme.colors.primary }]}>{resource.category?.toUpperCase() || 'GENERAL'}</Text>
                                    <Text style={styles.dot}>•</Text>
                                    <View style={styles.voteContainer}>
                                        <Text style={[styles.votes, { color: theme.colors.placeholder }]}>{resource.score} VOTES</Text>
                                    </View>
                                </View>
                            </View>
                            <FontAwesomeIcon icon={faChevronRight} color={theme.colors.cardBorder} size={10} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </WalkthroughTarget>
    );
});

const styles = StyleSheet.create({
    container: {
        padding: 24,
        borderRadius: 32,
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    viewAll: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    list: {
        gap: 12,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '800',
        flexShrink: 1,
    },
    trendingBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    trendingText: {
        fontSize: 7,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    itemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    category: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    dot: {
        marginHorizontal: 8,
        fontSize: 10,
        color: '#cbd5e1',
    },
    voteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    votes: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});

export default RecommendedResources;
