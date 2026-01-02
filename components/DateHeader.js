import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const DateHeader = ({ date }) => {
    const { theme } = useTheme();

    return (
        <View style={styles.container}>
            <View style={[styles.bubble, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
                <Text style={[styles.text, { color: theme.colors.placeholder }]}>
                    {date?.toUpperCase()}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginVertical: 24,
    },
    bubble: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    text: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default DateHeader;
