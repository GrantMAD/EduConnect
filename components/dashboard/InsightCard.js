import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClipboardList, faUsers, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

const InsightCard = ({ insight, profile, onAction }) => {
    const { theme } = useTheme();

    if (!insight) return null;

    const { tasks } = insight;
    const isParent = profile?.role === 'parent';
    const focusIcon = isParent ? faUsers : faClipboardList;

    const getTaskString = () => {
        const parts = [];
        if (tasks.homework > 0) parts.push(`${tasks.homework} Homework`);
        if (tasks.assignment > 0) parts.push(`${tasks.assignment} Assignment${tasks.assignment > 1 ? 's' : ''}`);
        if (tasks.exams > 0) parts.push(`${tasks.exams} Exam${tasks.exams > 1 ? 's' : ''}`);

        if (parts.length === 0) return '0 Tasks due today';
        return parts.join(', ') + ' due today';
    };

    const getTitle = () => {
        if (tasks.dueToday === 0) return "You're all caught up!";
        if (isParent) return "Children's Daily Agenda";
        return "Today's Agenda";
    };

    const getSubtitle = () => {
        if (tasks.dueToday === 0) return "No pending tasks for today. Great job!";
        return getTaskString();
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onAction}
            style={styles.container}
        >
            <LinearGradient
                colors={['#4f46e5', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.card, { borderColor: theme.colors.cardBorder }]}
            >
                <View style={styles.content}>
                    {/* Focus Icon Section */}
                    <View style={styles.iconContainer}>
                        <View style={styles.iconWrapper}>
                            <FontAwesomeIcon
                                icon={focusIcon}
                                size={28}
                                color="#fff"
                            />
                        </View>
                        {tasks.dueToday > 0 && (
                            <View style={[styles.badge, { borderColor: theme.colors.background }]}>
                                <Text style={styles.badgeText}>{tasks.dueToday}</Text>
                            </View>
                        )}
                    </View>

                    {/* Text Section */}
                    <View style={styles.textSection}>
                        <Text style={styles.title}>{getTitle()}</Text>
                        <Text style={styles.subtitle}>{getSubtitle()}</Text>
                    </View>

                    {/* Action Arrow */}
                    <View style={styles.actionArrow}>
                        <FontAwesomeIcon icon={faChevronRight} size={14} color="rgba(255,255,255,0.7)" />
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    card: {
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        position: 'relative',
        marginRight: 16,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#ef4444',
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
    },
    textSection: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '600',
    },
    actionArrow: {
        marginLeft: 8,
    }
});

export default InsightCard;
