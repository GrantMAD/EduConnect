import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const DateHeader = ({ date }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.bubble, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Text style={[styles.text, { color: theme.colors.textSecondary }]}>
                    {date}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 16,
    },
    bubble: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default DateHeader;
