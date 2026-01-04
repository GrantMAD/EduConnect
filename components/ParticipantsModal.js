import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, FlatList } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUsers, faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const ParticipantsModal = React.memo(({ visible, onClose, participants }) => {
    const { theme } = useTheme();

    const renderParticipant = ({ item }) => (
        <View style={[styles.participantItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <Image
                source={item.avatar_url ? { uri: item.avatar_url } : require('../assets/user.png')}
                style={styles.avatar}
            />
            <View style={styles.participantInfo}>
                <Text style={[styles.participantName, { color: theme.colors.text }]}>{item.full_name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '10' }]}>
                    <Text style={[styles.roleText, { color: theme.colors.primary }]}>{item.role?.toUpperCase() || 'USER'}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            onSwipeComplete={onClose}
            swipeDirection={['down']}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.4}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, paddingBottom: 40 }]}>
                <View style={styles.swipeIndicator} />
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <View style={[styles.iconBox, { backgroundColor: theme.colors.primary + '15' }]}>
                        <FontAwesomeIcon icon={faUsers} size={18} color={theme.colors.primary} />
                    </View>
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Meeting Roster</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={18} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={participants}
                    keyExtractor={item => item.id}
                    renderItem={renderParticipant}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyWrapper}>
                            <Text style={{ textAlign: 'center', color: theme.colors.placeholder, fontWeight: '700' }}>
                                No participants joined yet.
                            </Text>
                        </View>
                    }
                />
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modalContent: {
        paddingHorizontal: 24,
        paddingTop: 8,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        maxHeight: '80%',
    },
    swipeIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
        flex: 1,
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: 40,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        marginRight: 16,
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    roleText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    emptyWrapper: {
        paddingVertical: 40,
    }
});

export default ParticipantsModal;