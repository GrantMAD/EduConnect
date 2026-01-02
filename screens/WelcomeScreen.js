import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import LinearGradient from 'react-native-linear-gradient';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight, faGraduationCap } from '@fortawesome/free-solid-svg-icons';

const { width, height } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
    const { theme } = useTheme();

    return (
        <LinearGradient
            colors={['#4f46e5', '#7c3aed', '#ec4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Top Section */}
                <View style={styles.topSection}>
                    <View style={styles.badge}>
                        <View style={styles.pingDot} />
                        <Text style={styles.badgeText}>NEXT GENERATION EDUCATION</Text>
                    </View>

                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../assets/Logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.title}>Education is better, connected.</Text>
                    <Text style={styles.subtitle}>
                        ClassConnect bridges the gap between home and school, creating a seamless environment for success.
                    </Text>
                </View>

                {/* Action Section */}
                <View style={styles.actionSection}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('SignIn')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigation.navigate('SignUp')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.secondaryButtonText}>Create Account</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                {/* <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>50k+</Text>
                        <Text style={styles.statLabel}>USERS</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>1.2k+</Text>
                        <Text style={styles.statLabel}>SCHOOLS</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statVal}>99%</Text>
                        <Text style={styles.statLabel}>HAPPY</Text>
                    </View>
                </View> */}
            </ScrollView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 24,
        justifyContent: 'center',
    },
    topSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    pingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
        marginRight: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    logoContainer: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    logo: {
        width: 250,
        height: 250,
    },
    title: {
        fontSize: 36,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        lineHeight: 42,
        letterSpacing: -1,
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        paddingHorizontal: 10,
    },
    actionSection: {
        width: '100%',
        gap: 16,
        marginBottom: 40,
    },
    primaryButton: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        borderRadius: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    primaryButtonText: {
        color: '#4f46e5',
        fontSize: 18,
        fontWeight: '800',
    },
    secondaryButton: {
        height: 60,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statVal: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '900',
    },
    statLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    }
});

export default WelcomeScreen;
