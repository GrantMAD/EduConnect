import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useTheme } from '../../context/ThemeContext';
import { SkeletonPiece } from '../skeletons/DashboardScreenSkeleton';

const StatCard = ({ icon, title, value, color, onPress, style, loading }) => {
    const { theme } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.statCard, 
                { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }, 
                style
            ]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                <FontAwesomeIcon icon={icon} size={24} color={color} />
            </View>
            {loading ? (
                <SkeletonPiece style={{ width: 60, height: 28, borderRadius: 4, marginBottom: 4 }} />
            ) : (
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
            )}
            <Text style={[styles.statTitle, { color: theme.colors.placeholder }]}>{title}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    statCard: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        minHeight: 120,
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    statTitle: {
        fontSize: 14,
        textAlign: 'center',
    },
});

export default StatCard;
