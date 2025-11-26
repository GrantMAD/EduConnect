import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, Image } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LinkPreview = ({ text, previewData: externalPreviewData }) => {
    const { theme } = useTheme();
    const [previewData, setPreviewData] = useState(externalPreviewData || null);
    const [url, setUrl] = useState(externalPreviewData?.url || null);

    useEffect(() => {
        if (externalPreviewData) {
            setPreviewData(externalPreviewData);
            setUrl(externalPreviewData.url);
            return;
        }

        const extractUrl = (text) => {
            if (!text) return null;
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const match = text.match(urlRegex);
            return match ? match[0] : null;
        };

        const foundUrl = extractUrl(text);

        if (foundUrl) {
            setUrl(foundUrl);
            fetchPreview(foundUrl);
        } else {
            // Reset state if no URL is found
            setUrl(null);
            setPreviewData(null);
        }
    }, [text, externalPreviewData]);

    const fetchPreview = async (targetUrl) => {
        try {
            // In a real app, you'd use a backend proxy or a library like react-native-link-preview
            // For this demo, we'll simulate a fetch or use a public API if available without CORS issues
            // Since we can't easily do OG scraping on the client without a proxy due to CORS/security,
            // we will just display a basic card with the domain for now, or try a simple fetch.

            // Mocking for demonstration purposes or simple domain extraction
            const domain = new URL(targetUrl).hostname;

            setPreviewData({
                title: domain,
                description: targetUrl,
                image: null, // We'd need a proxy to get the image reliably
                url: targetUrl
            });

        } catch (error) {
            console.log('Error fetching preview:', error);
        }
    };

    if ((!text && !externalPreviewData) || !url || !previewData) return null;

    return (
        <TouchableOpacity
            onPress={() => Linking.openURL(url)}
            style={[
                styles.container,
                {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderLeftColor: theme.colors.primary,
                }
            ]}
            activeOpacity={0.9}
        >
            {previewData.image && (
                <Image source={{ uri: previewData.image }} style={styles.image} resizeMode="cover" />
            )}
            <View style={styles.textContainer}>
                <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                    {previewData.title}
                </Text>
                <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {previewData.description}
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderLeftWidth: 4, // Accent border
        overflow: 'hidden',
        flexDirection: 'row',
        elevation: 3, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    image: {
        width: 80,
        height: '100%',
    },
    textContainer: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    title: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    description: {
        fontSize: 12,
    },
});

export default LinkPreview;
