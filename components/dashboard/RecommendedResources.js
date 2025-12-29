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
import LinearGradient from 'react-native-linear-gradient';

export default function RecommendedResources({ schoolId, userId, role }) {
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
            <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
        );
    }

    if (recommendations.length === 0) return null;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <FontAwesomeIcon icon={faLightbulb} color="#F59E0B" size={16} />
                    </View>
                    <View>
                        <Text style={[styles.title, { color: theme.colors.text }]}>Recommended for You</Text>
                        <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Top materials in your subjects</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Resources')}>
                    <Text style={[styles.viewAll, { color: theme.colors.primary }]}>View All</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.list}>
                {recommendations.map((resource) => (
                    <TouchableOpacity 
                        key={resource.id}
                        style={[styles.item, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}
                        onPress={() => navigation.navigate('Resources', { openResourceId: resource.id })}
                    >
                        <View style={[styles.itemIcon, { backgroundColor: theme.colors.card }]}>
                            <FontAwesomeIcon icon={getResourceIcon(resource.file_url, !!resource.url)} color={theme.colors.primary} size={18} />
                        </View>
                        <View style={styles.itemContent}>
                            <View style={styles.itemHeader}>
                                <Text style={[styles.itemName, { color: theme.colors.text }]} numberOfLines={1}>
                                    {resource.title}
                                </Text>
                                {resource.score > 5 && (
                                    <View style={styles.trendingBadge}>
                                        <FontAwesomeIcon icon={faStar} color="#F59E0B" size={8} style={{ marginRight: 2 }} />
                                        <Text style={styles.trendingText}>Trending</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.itemFooter}>
                                <Text style={[styles.category, { color: theme.colors.primary }]}>{resource.category || 'General'}</Text>
                                <Text style={styles.dot}>•</Text>
                                <View style={styles.voteContainer}>
                                    <FontAwesomeIcon icon={faThumbsUp} color={theme.colors.placeholder} size={10} style={{ marginRight: 4 }} />
                                    <Text style={[styles.votes, { color: theme.colors.placeholder }]}>{resource.score} Votes</Text>
                                </View>
                            </View>
                        </View>
                        <FontAwesomeIcon icon={faChevronRight} color={theme.colors.border} size={12} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        borderRadius: 24,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '900',
    },
    subtitle: {
        fontSize: 11,
        fontWeight: '600',
    },
    viewAll: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    list: {
        gap: 10,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '700',
        flexShrink: 1,
    },
    trendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    trendingText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#F59E0B',
        textTransform: 'uppercase',
    },
    itemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    category: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    dot: {
        marginHorizontal: 6,
        fontSize: 10,
        color: '#ccc',
    },
    voteContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    votes: {
        fontSize: 10,
        fontWeight: '700',
    },
});
