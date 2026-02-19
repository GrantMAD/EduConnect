import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faLightbulb, faThumbsUp, faChevronRight, faFileAlt,
    faGlobe, faFilePdf, faFileImage, faFileVideo,
    faFileWord, faFilePowerpoint, faStar
} from '@fortawesome/free-solid-svg-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import WalkthroughTarget from '../WalkthroughTarget';
import { SkeletonPiece } from '../skeletons/DashboardScreenSkeleton';

// Import services
import { fetchParentChildren } from '../../services/userService';
import { fetchStudentSubjects, fetchChildrenSubjects } from '../../services/classService';
import { fetchResourcesWithVotes } from '../../services/resourceService';

const RecommendedResources = React.memo(({ id, schoolId, userId, role, loading: externalLoading }) => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const [recommendations, setRecommendations] = useState([]);
    const [internalLoading, setInternalLoading] = useState(true);

    const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

    useEffect(() => {
        if (schoolId && userId) {
            fetchRecommendations();
        }
    }, [schoolId, userId]);

    const fetchRecommendations = async () => {
        setInternalLoading(true);
        try {
            // 1. Determine target subjects based on role
            let subjects = [];
            if (role === 'student') {
                subjects = await fetchStudentSubjects(userId);
            } else if (role === 'parent') {
                const childIds = await fetchParentChildren(userId);
                if (childIds.length > 0) {
                    subjects = await fetchChildrenSubjects(childIds);
                }
            }

            const uniqueSubjects = [...new Set(subjects)];

            // 2. Fetch resources in those subjects
            const resourcesWithVotes = await fetchResourcesWithVotes({
                schoolId,
                activeTab: 'public', // Recommended are usually public
                userId
            });

            let filteredResources = resourcesWithVotes;
            if (uniqueSubjects.length > 0) {
                filteredResources = resourcesWithVotes.filter(r => uniqueSubjects.includes(r.category));
            }

            // Sort by score and take top 3
            // In fetchResourcesWithVotes, we calculate upvotes/downvotes
            const scoredResources = filteredResources.map(res => ({
                ...res,
                score: (res.upvotes || 0) - (res.downvotes || 0)
            }));

            const topResources = scoredResources
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            setRecommendations(topResources);
        } catch (err) {
            console.error('Error fetching recommendations:', err);
        } finally {
            setInternalLoading(false);
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

    if (isLoading) {
        return (
            <WalkthroughTarget id={id}>
                <View style={[styles.container, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                    <View style={styles.header}>
                        <SkeletonPiece style={{ width: 120, height: 20, borderRadius: 4 }} />
                    </View>
                    <View style={styles.list}>
                        {[1, 2].map(i => (
                            <SkeletonPiece key={i} style={{ width: '100%', height: 72, borderRadius: 20, marginBottom: 12 }} />
                        ))}
                    </View>
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
