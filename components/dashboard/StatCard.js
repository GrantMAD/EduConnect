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
                {
                    backgroundColor: theme.colors.card,
                    borderWidth: 1,
                    borderColor: color + '30',
                },
                style
            ]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <FontAwesomeIcon icon={icon} size={18} color={color} />
            </View>
            {loading ? (
                <SkeletonPiece style={{ width: 60, height: 24, borderRadius: 4, marginBottom: 4 }} />
            ) : (
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
            )}
            <Text style={[styles.statTitle, { color: '#94a3b8' }]}>{title.toUpperCase()}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    statCard: {
        width: '47%',
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        minHeight: 140,
        justifyContent: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    statTitle: {
        fontSize: 9,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1,
    },
});

export default StatCard;
