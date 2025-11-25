import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, FlatList } from 'react-native';
import Modal from 'react-native-modal';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faUsers, faUserCircle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

export default function ParticipantsModal({ visible, onClose, participants }) {
    const { theme } = useTheme();

    const renderParticipant = ({ item }) => (
        <View style={[styles.participantItem, { borderBottomColor: theme.colors.cardBorder }]}>
            <Image
                source={item.avatar_url ? { uri: item.avatar_url } : require('../assets/user.png')}
                style={styles.avatar}
            />
            <View style={styles.participantInfo}>
                <Text style={[styles.participantName, { color: theme.colors.text }]}>{item.full_name}</Text>
                <Text style={[styles.participantRole, { color: theme.colors.textSecondary }]}>{item.role}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            isVisible={visible}
            onBackdropPress={onClose}
            animationIn="slideInUp"
            animationOut="slideOutDown"
            backdropOpacity={0.5}
            style={{ justifyContent: 'flex-end', margin: 0 }}
        >
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={faUsers} size={24} color={theme.colors.primary} />
                    <Text style={[styles.modalTitle, { color: theme.colors.text }]} numberOfLines={1}>Participants</Text>
                    <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                        <FontAwesomeIcon icon={faTimes} size={22} color={theme.colors.placeholder} />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={participants}
                    keyExtractor={item => item.id}
                    renderItem={renderParticipant}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', color: theme.colors.textSecondary, marginTop: 20 }}>
                            No participants found.
                        </Text>
                    }
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 30,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        minHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 15,
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginLeft: 15,
        flex: 1,
    },
    modalCloseButton: {
        padding: 5,
    },
    listContent: {
        paddingBottom: 20,
    },
    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#E0E0E0',
    },
    participantInfo: {
        flex: 1,
    },
    participantName: {
        fontSize: 16,
        fontWeight: '600',
    },
    participantRole: {
        fontSize: 14,
        textTransform: 'capitalize',
    },
});
