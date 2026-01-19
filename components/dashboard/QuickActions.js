import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
    faBullhorn,
    faBookOpen,
    faClipboardList,
    faPoll,
    faShoppingCart,
    faChalkboardTeacher,
    faFootballBall,
    faUsers,
    faChartLine,
    faComments
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import { ActionButtonSkeleton } from '../skeletons/DashboardScreenSkeleton';
import WalkthroughTarget from '../WalkthroughTarget';

const QuickActionButton = React.memo(({ icon, title, onPress, color }) => {
    const { theme } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.btnIconBox, { backgroundColor: color + '15' }]}>
                <FontAwesomeIcon icon={icon} size={16} color={color || theme.colors.primary} />
            </View>
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]} numberOfLines={1}>{title}</Text>
        </TouchableOpacity>
    );
});

const QuickActions = React.memo(({ id, navigation, userRole, loading }) => {
    const { theme } = useTheme();

    if (loading) {
        return (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Operations</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Efficiently manage common administrative tasks.</Text>
                <View style={styles.actionsContainer}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <ActionButtonSkeleton key={i} />)}
                </View>
            </View>
        );
    }

    if (!['admin', 'teacher'].includes(userRole)) {
        return null;
    }

    return (
        <WalkthroughTarget id={id}>
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Operations</Text>
                <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Efficiently manage common administrative tasks.</Text>
                <View style={styles.actionsContainer}>
                    <QuickActionButton
                        icon={faBullhorn}
                        title="Announcement"
                        onPress={() => navigation.navigate('CreateAnnouncement', { fromDashboard: true })}
                        color="#e11d48"
                    />
                    <QuickActionButton
                        icon={faBookOpen}
                        title="New Homework"
                        onPress={() => navigation.navigate('CreateHomework', { fromDashboard: true })}
                        color="#10b981"
                    />
                    <QuickActionButton
                        icon={faClipboardList}
                        title="New Assignment"
                        onPress={() => navigation.navigate('CreateAssignment', { fromDashboard: true })}
                        color="#4f46e5"
                    />
                    <QuickActionButton
                        icon={faPoll}
                        title="Create Poll"
                        onPress={() => navigation.navigate('CreatePoll', { fromDashboard: true })}
                        color="#f59e0b"
                    />
                    <QuickActionButton
                        icon={faShoppingCart}
                        title="List Item"
                        onPress={() => navigation.navigate('CreateMarketplaceItem', { fromDashboard: true })}
                        color="#db2777"
                    />
                    <QuickActionButton
                        icon={faChalkboardTeacher}
                        title="New Session"
                        onPress={() => navigation.navigate('CreateClass', { fromDashboard: true })}
                        color="#3b82f6"
                    />
                    <QuickActionButton
                        icon={faUsers}
                        title="Users"
                        onPress={() => navigation.navigate('UserManagement', { fromDashboard: true })}
                        color="#7c3aed"
                    />
                    <QuickActionButton
                        icon={faComments}
                        title="Chat Hub"
                        onPress={() => navigation.navigate('ChatList')}
                        color="#06b6d4"
                    />
                </View>
            </View>
        </WalkthroughTarget>
    );
});

const styles = StyleSheet.create({
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    sectionDescription: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 20,
    },
    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    actionButton: {
        width: '48.5%',
        marginBottom: 12,
        padding: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    btnIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '800',
        flex: 1,
    },
});

export default QuickActions;
