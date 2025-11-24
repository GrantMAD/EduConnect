export const BORDER_STYLES = {
    // Classic borders - unchanged
    'border_blue': {
        borderColor: '#007AFF',
        borderWidth: 3
    },
    'border_green': {
        borderColor: '#34C759',
        borderWidth: 3
    },
    'border_red': {
        borderColor: '#FF3B30',
        borderWidth: 3
    },

    // Metallic borders with glows - INCREASED INTENSITY
    'border_gold': {
        borderColor: '#FFD700',
        borderWidth: 3,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 12
    },
    'border_silver': {
        borderColor: '#C0C0C0',
        borderWidth: 3,
        shadowColor: '#C0C0C0',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 11
    },
    'border_bronze': {
        borderColor: '#CD7F32',
        borderWidth: 3,
        shadowColor: '#CD7F32',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 18,
        elevation: 11
    },

    // Animated/Special effect borders - INCREASED INTENSITY
    'border_neon': {
        borderColor: '#FF00FF',
        borderWidth: 3,
        shadowColor: '#FF00FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 25,
        elevation: 15,
        animated: true // Flag for pulsating animation
    },
    'border_fire': {
        borderColor: '#FF4500',
        borderWidth: 3,
        shadowColor: '#FF6347',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 22,
        elevation: 13
    },
    'border_ice': {
        borderColor: '#00FFFF',
        borderWidth: 3,
        shadowColor: '#00FFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 12
    },
    'border_rainbow': {
        borderColor: '#FF00FF', // Will be overridden by gradient in animated component
        borderWidth: 3,
        shadowColor: '#FF00FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 22,
        elevation: 15,
        animated: true, // Flag for pulsating animation
        rainbow: true // Flag for rainbow gradient
    },
};
