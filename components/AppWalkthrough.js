import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { useWalkthrough } from '../context/WalkthroughContext';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faTimes, faChevronRight, faChevronLeft, faCheck } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AppWalkthrough = React.memo(() => {
    const {
        isOpen,
        currentStep,
        targets,
        nextStep,
        prevStep,
        finishWalkthrough,
        currentStepIndex,
        totalSteps
    } = useWalkthrough();

    // const { user, setProfile } = useAuth(); // Removed
    const [dontShowAgain, setDontShowAgain] = useState(false);

    if (!isOpen || !currentStep || totalSteps === 0) return null;

    const target = targets[currentStep.target];

    // Default to center if target not found (fallback)
    const targetLayout = target || {
        x: SCREEN_WIDTH / 2,
        y: SCREEN_HEIGHT / 2,
        width: 0,
        height: 0
    };

    // Calculate overlay rectangles ensuring no negative dimensions
    const topHeight = Math.max(0, targetLayout.y - 10);
    const bottomTop = Math.min(SCREEN_HEIGHT, targetLayout.y + targetLayout.height + 10);
    const bottomHeight = Math.max(0, SCREEN_HEIGHT - bottomTop);

    // Left and Right rects fill the gap between Top and Bottom
    const middleHeight = Math.max(0, bottomTop - topHeight);
    const leftWidth = Math.max(0, targetLayout.x - 10);
    const rightLeft = Math.min(SCREEN_WIDTH, targetLayout.x + targetLayout.width + 10);
    const rightWidth = Math.max(0, SCREEN_WIDTH - rightLeft);

    // Determine tooltip position
    // Prefer bottom, unless too low
    const showAbove = (targetLayout.y + targetLayout.height + 250 > SCREEN_HEIGHT) && (targetLayout.y > 200);
    const tooltipTop = showAbove
        ? Math.max(40, targetLayout.y - 10 - 200) // 200 approx height
        : Math.min(SCREEN_HEIGHT - 250, targetLayout.y + targetLayout.height + 20);

    const handleFinish = async () => {
        finishWalkthrough();
        if (dontShowAgain) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { error } = await supabase
                        .from('users')
                        .update({ has_seen_walkthrough: true })
                        .eq('id', user.id);

                    if (error) console.log('Error updating preference:', error);
                }
            } catch (error) {
                console.log('Error updating walkthrough status:', error);
            }
        }
    };

    return (
        <Modal
            isVisible={isOpen}
            animationIn="fadeIn"
            animationOut="fadeOut"
            backdropOpacity={0} // We draw our own backdrop
            style={styles.modal}
            hasBackdrop={false} // Important so we can touch our own views if needed, though we cover everything anyway
        >
            <View style={styles.container}>
                {/* Overlay Views */}
                {/* Top */}
                <View style={[styles.overlay, { top: 0, height: topHeight, width: '100%' }]} />
                {/* Bottom */}
                <View style={[styles.overlay, { top: bottomTop, height: bottomHeight, width: '100%' }]} />
                {/* Left */}
                <View style={[styles.overlay, { top: topHeight, height: middleHeight, left: 0, width: leftWidth }]} />
                {/* Right */}
                <View style={[styles.overlay, { top: topHeight, height: middleHeight, left: rightLeft, width: rightWidth }]} />

                {/* Highlight Halo */}
                <View
                    style={{
                        position: 'absolute',
                        top: topHeight,
                        left: leftWidth,
                        width: rightLeft - leftWidth,
                        height: bottomTop - topHeight,
                        borderColor: '#6366f1',
                        borderWidth: 2,
                        borderRadius: 8,
                    }}
                />

                {/* Tooltip Card */}
                <View
                    style={[
                        styles.card,
                        {
                            top: tooltipTop,
                            left: 16,
                            right: 16,
                            position: 'absolute'
                        }
                    ]}
                >
                    <View style={styles.header}>
                        <View style={styles.stepInfo}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepText}>{currentStepIndex + 1}</Text>
                            </View>
                            <Text style={styles.stepTotal}>of {totalSteps}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleFinish()} style={styles.closeBtn}>
                            <FontAwesomeIcon icon={faTimes} color="#9ca3af" size={20} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.title}>{currentStep.title}</Text>
                    <Text style={styles.content}>{currentStep.content}</Text>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setDontShowAgain(!dontShowAgain)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                                {dontShowAgain && <FontAwesomeIcon icon={faCheck} color="white" size={12} />}
                            </View>
                            <Text style={styles.checkboxLabel}>Don't show again</Text>
                        </TouchableOpacity>

                        <View style={styles.buttons}>
                            <TouchableOpacity
                                onPress={prevStep}
                                disabled={currentStepIndex === 0}
                                style={[styles.button, styles.backButton, currentStepIndex === 0 && styles.buttonDisabled]}
                            >
                                <Text style={[styles.buttonText, { color: currentStepIndex === 0 ? '#d1d5db' : '#4b5563' }]}>Back</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={currentStepIndex === totalSteps - 1 ? handleFinish : nextStep}
                                style={[styles.button, styles.nextButton]}
                            >
                                <Text style={[styles.buttonText, { color: 'white' }]}>
                                    {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                                </Text>
                                {currentStepIndex < totalSteps - 1 && (
                                    <FontAwesomeIcon icon={faChevronRight} color="white" size={12} style={{ marginLeft: 6 }} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const styles = StyleSheet.create({
    modal: {
        margin: 0,
    },
    container: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.30,
        shadowRadius: 4.65,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    stepInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e0e7ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    stepText: {
        color: '#4f46e5',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepTotal: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    closeBtn: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 8,
    },
    content: {
        fontSize: 14,
        color: '#4b5563',
        lineHeight: 22,
        marginBottom: 24,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#d1d5db',
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    checkboxChecked: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    checkboxLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    buttons: {
        flexDirection: 'row',
        gap: 8,
    },
    button: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButton: {
    },
    nextButton: {
        backgroundColor: '#4f46e5',
    },
    buttonDisabled: {
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    }
});

export default AppWalkthrough;
