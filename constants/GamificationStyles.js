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

export const BANNER_STYLES = {
    'banner_nebula': {
        background: ['#0f0c29', '#302b63', '#24243e'],
        overlay: 'rgba(255, 255, 255, 0.05)'
    },
    'banner_sunset': {
        background: ['#f83600', '#f9d423'],
        textColor: '#FFFFFF'
    },
    'banner_forest': {
        background: ['#00b09b', '#96c93d'],
        textColor: '#FFFFFF'
    },
    'banner_ocean': {
        background: ['#2b5876', '#4e4376'],
        textColor: '#FFFFFF'
    },
    'banner_royal': {
        background: ['#8e2de2', '#4a00e0'],
        textColor: '#FFFFFF'
    }
};

export const NAME_COLOR_STYLES = {
    'color_gold': {
        color: '#FFD700',
        style: { color: '#FFD700', textShadowColor: 'rgba(255, 215, 0, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }
    },
    'color_neon_blue': {
        color: '#00FFFF',
        style: { color: '#00FFFF', textShadowColor: 'rgba(0, 255, 255, 0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }
    },
    'color_emerald': {
        color: '#10B981',
        style: { color: '#10B981' }
    },
    'color_ruby': {
        color: '#EF4444',
        style: { color: '#EF4444' }
    }
};

export const TITLE_STYLES = {
    'title_math_whiz': { label: 'Math Whiz', colors: { bg: '#E3F2FD', text: '#1565C0' } },
    'title_bookworm': { label: 'Bookworm', colors: { bg: '#FFF8E1', text: '#FF8F00' } },
    'title_class_clown': { label: 'Class Clown', colors: { bg: '#FFF9C4', text: '#FBC02D' } },
    'title_mastermind': { label: 'Mastermind', colors: { bg: '#F3E5F5', text: '#7B1FA2' } },
    'title_early_bird': { label: 'Early Bird', colors: { bg: '#FFF3E0', text: '#E65100' } }
};

export const BUBBLE_STYLES = {
    'bubble_midnight': {
        backgroundColor: '#111827',
        textColor: '#FFFFFF',
        borderColor: '#6366F1',
        borderWidth: 1,
        shadowColor: '#6366F1',
        shadowOpacity: 0.5,
        shadowRadius: 8
    },
    'bubble_solar': {
        gradient: ['#f83600', '#f9d423'],
        textColor: '#FFFFFF',
    },
    'bubble_cyberpunk': {
        backgroundColor: '#DB2777',
        textColor: '#FFFFFF',
        borderColor: '#22D3EE',
        borderWidth: 2,
        shadowColor: '#22D3EE',
        shadowOpacity: 1,
        shadowRadius: 0,
        shadowOffset: { width: 4, height: 4 }
    },
    'bubble_nature': {
        backgroundColor: '#D1FAE5',
        textColor: '#064E3B',
        borderColor: '#A7F3D0',
        borderWidth: 2,
        borderRadius: 24
    }
};

export const STICKER_PACKS = {
    'pack_academic': {
        name: 'Pro Student',
        stickers: ['🎓', '📚', '📝', '🧠', '💡', '🏆', '💯', '🎨']
    },
    'pack_animals': {
        name: 'Animal Friends',
        stickers: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼']
    },
    'pack_space': {
        name: 'Space Explorer',
        stickers: ['🚀', '🌎', '🌙', '⭐', '🌌', '👽', '🛸', '🛰️']
    }
};
