export const getAvatarUrl = (avatarUrl, email, id) => {
    // If it's already a source object (has uri), return it as is
    if (avatarUrl && typeof avatarUrl === 'object' && avatarUrl.uri) {
        return avatarUrl;
    }

    if (avatarUrl && typeof avatarUrl === 'string') {
        return { uri: avatarUrl };
    }
    
    // Fallback to DiceBear if no avatar_url exists
    const seed = email || id || 'default';
    return { uri: `https://api.dicebear.com/7.x/avataaars/png?seed=${seed}` };
};
