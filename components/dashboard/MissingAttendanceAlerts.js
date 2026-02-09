import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faExclamationTriangle, faChevronRight, faClock, faCalendarDay } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';

const PulsingDot = () => {
    const fadeAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.4,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [fadeAnim]);

    return (
        <Animated.View
            style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#EF4444',
                opacity: fadeAnim,
                marginRight: 8,
            }}
        />
    );
};

const MissingAttendanceAlerts = ({ alerts = [], navigation }) => {
    const { theme } = useTheme();

    if (!alerts || alerts.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <PulsingDot />
                <Text style={[styles.title, { color: theme.colors.text }]}>Action Required</Text>
                <View style={[styles.badge, { backgroundColor: '#FECACA' }]}>
                    <Text style={[styles.badgeText, { color: '#DC2626' }]}>{alerts.length}</Text>
                </View>
            </View>

            <View style={styles.list}>
                {alerts.map((alert, index) => (
                    <TouchableOpacity
                        key={`${alert.id}-${index}`}
                        style={[
                            styles.card,
                            {
                                backgroundColor: theme.colors.card,
                                borderColor: theme.colors.cardBorder
                            }
                        ]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('ManageUsersInClass', {
                            classId: alert.class_id,
                            className: alert.className,
                            selectedDate: alert.date
                        })}
                    >
                        <View style={styles.cardLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                                <FontAwesomeIcon icon={faExclamationTriangle} color="#DC2626" size={12} />
                            </View>
                            <View>
                                <Text style={[styles.className, { color: theme.colors.text }]}>
                                    {alert.className}
                                </Text>
                                <View style={styles.row}>
                                    <View style={styles.metaItem}>
                                        <FontAwesomeIcon icon={faCalendarDay} color={theme.colors.placeholder} size={10} style={{ marginRight: 4 }} />
                                        <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                            {new Date(alert.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </Text>
                                    </View>
                                    <View style={[styles.dot, { backgroundColor: theme.colors.border }]} />
                                    <View style={styles.metaItem}>
                                        <FontAwesomeIcon icon={faClock} color={theme.colors.placeholder} size={10} style={{ marginRight: 4 }} />
                                        <Text style={[styles.metaText, { color: theme.colors.placeholder }]}>
                                            {new Date(alert.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}>
                            <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Mark</Text>
                        </View>
                    </TouchableOpacity>
                ))}
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
        marginBottom: 12,
        paddingHorizontal: 4
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        marginRight: 8,
        letterSpacing: -0.5,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '900',
    },
    list: {
        gap: 10,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    className: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 11,
        fontWeight: '600',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 6,
    },
    actionBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    actionBtnText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    }
});

export default MissingAttendanceAlerts;
