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

const QuickActionButton = ({ icon, title, onPress, color }) => {
    const { theme } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={onPress}
        >
            <FontAwesomeIcon icon={icon} size={20} color={color || theme.colors.primary} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>{title}</Text>
        </TouchableOpacity>
    );
};

const QuickActions = ({ navigation, userRole }) => {
    const { theme } = useTheme();

    if (!['admin', 'teacher'].includes(userRole)) {
        return null;
    }

    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
            <Text style={[styles.sectionDescription, { color: theme.colors.placeholder }]}>Access common tasks and shortcuts.</Text>
            <View style={styles.actionsContainer}>
                <QuickActionButton
                    icon={faBullhorn}
                    title="New Announcement"
                    onPress={() => navigation.navigate('CreateAnnouncement', { fromDashboard: true })}
                    color="#FF3B30"
                />
                <QuickActionButton
                    icon={faBookOpen}
                    title="New Homework"
                    onPress={() => navigation.navigate('CreateHomework', { fromDashboard: true })}
                    color="#34C759"
                />
                <QuickActionButton
                    icon={faClipboardList}
                    title="New Assignment"
                    onPress={() => navigation.navigate('CreateAssignment', { fromDashboard: true })}
                    color="#5856D6"
                />
                <QuickActionButton
                    icon={faPoll}
                    title="New Poll"
                    onPress={() => navigation.navigate('CreatePoll', { fromDashboard: true })}
                    color="#FF9500"
                />
                <QuickActionButton
                    icon={faShoppingCart}
                    title="List Item"
                    onPress={() => navigation.navigate('CreateMarketplaceItem', { fromDashboard: true })}
                    color="#FF2D55"
                />
                <QuickActionButton
                    icon={faChalkboardTeacher}
                    title="New Class"
                    onPress={() => navigation.navigate('CreateClass', { fromDashboard: true })}
                    color="#007AFF"
                />
                <QuickActionButton
                    icon={faFootballBall}
                    title="New Club"
                    onPress={() => navigation.navigate('CreateClub')}
                    color="#AF52DE"
                />
                <QuickActionButton
                    icon={faUsers}
                    title="Manage Users"
                    onPress={() => navigation.navigate('UserManagement', { fromDashboard: true })}
                    color="#5856D6"
                />
                <QuickActionButton
                    icon={faChartLine}
                    title="School Data"
                    onPress={() => navigation.navigate('SchoolData', { fromDashboard: true })}
                    color="#FF9500"
                />
                <QuickActionButton
                    icon={faComments}
                    title="Messages"
                    onPress={() => navigation.navigate('ChatList')}
                    color="#007AFF"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionDescription: {
        fontSize: 14,
        marginBottom: 16,
    },
    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -6,
    },
    actionButton: {
        width: '48%',
        margin: '1%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default QuickActions;
