import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { 
    faExclamationTriangle, faCalendarCheck, faChevronRight, 
    faClipboardCheck, faUserClock, faBookOpen, faPlus, faGraduationCap 
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ActionRequiredList = ({ actions = [], navigation }) => {
    const { theme, isDarkTheme } = useTheme();

    if (!actions || actions.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: isDarkTheme ? 'rgba(225, 29, 72, 0.2)' : '#ffe4e6', borderColor: isDarkTheme ? 'rgba(225, 29, 72, 0.3)' : '#fecdd3' }]}>
                    <FontAwesomeIcon icon={faExclamationTriangle} size={16} color={isDarkTheme ? '#fb7185' : '#e11d48'} />
                </View>
                <View style={styles.headerText}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Action Required</Text>
                    <Text style={[styles.subtitle, { color: theme.colors.placeholder }]}>Items requiring your immediate attention.</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#e11d48' }]}>
                    <Text style={styles.badgeText}>{actions.length} Pending</Text>
                </View>
            </View>

            <View style={styles.cardContainer}>
                {actions.map((action, index) => {
                    if (action.type === 'attendance') {
                        return <AttendanceCard key={`att-${index}`} action={action} navigation={navigation} theme={theme} isDarkTheme={isDarkTheme} />;
                    } else if (action.type === 'ungraded_homework' || action.type === 'ungraded_assignment') {
                        return <UngradedCard key={`ung-${index}`} action={action} navigation={navigation} theme={theme} isDarkTheme={isDarkTheme} />;
                    } else if (action.type === 'missing_lesson_plan') {
                        return <MissingLessonPlanCard key={`mlp-${index}`} action={action} navigation={navigation} theme={theme} isDarkTheme={isDarkTheme} />;
                    } else if (action.type === 'inactive_exam_session') {
                        return <InactiveExamCard key={`iex-${index}`} action={action} navigation={navigation} theme={theme} isDarkTheme={isDarkTheme} />;
                    }
                    return null;
                })}
            </View>
        </View>
    );
};

const InactiveExamCard = ({ action, navigation, theme, isDarkTheme }) => {
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: isDarkTheme ? 'rgba(79, 70, 229, 0.3)' : '#e0e7ff' }]}>
            <View style={[styles.cardLeftBorder, { backgroundColor: '#4f46e5' }]} />
            
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {action.name}
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>
                            SESSION UNPUBLISHED
                        </Text>
                        <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {action.paperCount} paper{action.paperCount !== 1 ? 's' : ''} hidden from students
                        </Text>
                    </View>
                    <View style={[styles.iconBadge, { backgroundColor: isDarkTheme ? 'rgba(79, 70, 229, 0.1)' : '#eef2ff', borderColor: isDarkTheme ? 'rgba(79, 70, 229, 0.2)' : '#e0e7ff' }]}>
                        <FontAwesomeIcon icon={faGraduationCap} size={16} color={isDarkTheme ? '#818cf8' : '#4f46e5'} />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => navigation.navigate('ExamManagement')}
                    style={[styles.actionButton, { backgroundColor: isAdmin ? '#4f46e5' : '#4b5563' }]}
                    activeOpacity={0.8}
                >
                    <FontAwesomeIcon icon={faClipboardCheck} size={12} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>
                        {isAdmin ? 'Activate Session' : 'View Session (Contact Admin)'}
                    </Text>
                    <FontAwesomeIcon icon={faChevronRight} size={10} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const MissingLessonPlanCard = ({ action, navigation, theme, isDarkTheme }) => {
    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: isDarkTheme ? 'rgba(245, 158, 11, 0.3)' : '#fef3c7' }]}>
            <View style={[styles.cardLeftBorder, { backgroundColor: '#f59e0b' }]} />
            
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {action.className}
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>
                            CURRICULUM MISSING
                        </Text>
                        <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            No lesson plans for {action.subject}
                        </Text>
                    </View>
                    <View style={[styles.iconBadge, { backgroundColor: isDarkTheme ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', borderColor: isDarkTheme ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
                        <FontAwesomeIcon icon={faBookOpen} size={16} color={isDarkTheme ? '#fbbf24' : '#d97706'} />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => navigation.navigate('StudentClassDashboard', { classId: action.classId, initialTab: 'lessons' })}
                    style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
                    activeOpacity={0.8}
                >
                    <FontAwesomeIcon icon={faPlus} size={12} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>Start Planning</Text>
                    <FontAwesomeIcon icon={faChevronRight} size={10} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const AttendanceCard = ({ action, navigation, theme, isDarkTheme }) => {
    const alertDate = action.date ? new Date(action.date) : new Date();

    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: isDarkTheme ? 'rgba(225, 29, 72, 0.3)' : '#ffe4e6' }]}>
            <View style={[styles.cardLeftBorder, { backgroundColor: '#e11d48' }]} />
            
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {action.className || 'Unknown Class'}
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>
                            MISSING ATTENDANCE
                        </Text>
                    </View>
                    <View style={[styles.dateBadge, { backgroundColor: isDarkTheme ? 'rgba(225, 29, 72, 0.1)' : '#fff1f2', borderColor: isDarkTheme ? 'rgba(225, 29, 72, 0.2)' : '#ffe4e6' }]}>
                        <Text style={[styles.dateText, { color: isDarkTheme ? '#fb7185' : '#be123c' }]}>
                            {alertDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </Text>
                        <Text style={[styles.dayText, { color: isDarkTheme ? 'rgba(251, 113, 133, 0.6)' : 'rgba(190, 18, 60, 0.6)' }]}>
                            {alertDate.toLocaleDateString(undefined, { weekday: 'long' })}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => navigation.navigate('StudentClassDashboard', { classId: action.class_id, initialTab: 'students', date: action.date })}
                    style={[styles.actionButton, { backgroundColor: '#e11d48' }]}
                    activeOpacity={0.8}
                >
                    <FontAwesomeIcon icon={faCalendarCheck} size={12} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>Mark Attendance</Text>
                    <FontAwesomeIcon icon={faChevronRight} size={10} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const UngradedCard = ({ action, navigation, theme, isDarkTheme }) => {
    const isHomework = action.type === 'ungraded_homework';
    
    return (
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: isDarkTheme ? 'rgba(245, 158, 11, 0.3)' : '#fef3c7' }]}>
            <View style={[styles.cardLeftBorder, { backgroundColor: '#f59e0b' }]} />
            
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={[styles.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {action.studentName || 'Student'}
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: theme.colors.placeholder }]}>
                            UNGRADED {isHomework ? 'HOMEWORK' : 'ASSIGNMENT'}
                        </Text>
                        <Text style={[styles.itemTitle, { color: theme.colors.text }]} numberOfLines={1}>
                            {action.title}
                        </Text>
                    </View>
                    <View style={[styles.iconBadge, { backgroundColor: isDarkTheme ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', borderColor: isDarkTheme ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7' }]}>
                        <FontAwesomeIcon icon={faUserClock} size={16} color={isDarkTheme ? '#fbbf24' : '#d97706'} />
                    </View>
                </View>

                <TouchableOpacity
                    onPress={() => {
                        // Navigate to StudentClassDashboard -> Homework/Assignment Tab
                        if (action.classId) {
                            navigation.navigate('StudentClassDashboard', { 
                                classId: action.classId, 
                                initialTab: isHomework ? 'homework' : 'assignments',
                                manageItem: action.itemId 
                            });
                        }
                    }}
                    style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
                    activeOpacity={0.8}
                >
                    <FontAwesomeIcon icon={faClipboardCheck} size={12} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.actionButtonText}>Grade Now</Text>
                    <FontAwesomeIcon icon={faChevronRight} size={10} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    iconContainer: {
        padding: 8,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    cardContainer: {
        gap: 16,
    },
    card: {
        borderRadius: 12,
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 12,
    },
    cardLeftBorder: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 6,
    },
    cardContent: {
        padding: 12,
        paddingLeft: 18, // Account for left border
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '900',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    itemTitle: {
        fontSize: 11,
        marginTop: 2,
        opacity: 0.8,
    },
    dateBadge: {
        padding: 6,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'flex-end',
        minWidth: 50,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '900',
    },
    dayText: {
        fontSize: 8,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    iconBadge: {
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '900',
    }
});

export default ActionRequiredList;
