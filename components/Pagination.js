import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';

const Pagination = ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
    style
}) => {
    const { theme } = useTheme();
    const totalPages = Math.ceil(totalItems / pageSize);

    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const showEllipsis = totalPages > 7;

        if (!showEllipsis) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
            return pages;
        }

        // Always show first page
        pages.push(1);

        if (currentPage > 3) {
            pages.push('...');
        }

        // Show range around current page
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
            if (!pages.includes(i)) pages.push(i);
        }

        if (currentPage < totalPages - 2) {
            pages.push('...');
        }

        // Always show last page
        if (!pages.includes(totalPages)) {
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <View style={[styles.container, style]}>
            <TouchableOpacity
                onPress={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={[
                    styles.arrowButton,
                    { borderColor: theme.colors.cardBorder },
                    currentPage === 1 && styles.disabled
                ]}
            >
                <FontAwesomeIcon
                    icon={faChevronLeft}
                    size={12}
                    color={currentPage === 1 ? theme.colors.placeholder : theme.colors.primary}
                />
            </TouchableOpacity>

            <View style={styles.pagesList}>
                {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                        {page === '...' ? (
                            <Text style={[styles.ellipsis, { color: theme.colors.placeholder }]}>
                                {page}
                            </Text>
                        ) : (
                            <TouchableOpacity
                                onPress={() => onPageChange(page)}
                                style={[
                                    styles.pageButton,
                                    currentPage === page && [
                                        styles.activePageButton,
                                        { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                                    ],
                                    currentPage !== page && { borderColor: theme.colors.cardBorder }
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.pageText,
                                        { color: currentPage === page ? '#fff' : theme.colors.text }
                                    ]}
                                >
                                    {page}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </React.Fragment>
                ))}
            </View>

            <TouchableOpacity
                onPress={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={[
                    styles.arrowButton,
                    { borderColor: theme.colors.cardBorder },
                    currentPage === totalPages && styles.disabled
                ]}
            >
                <FontAwesomeIcon
                    icon={faChevronRight}
                    size={12}
                    color={currentPage === totalPages ? theme.colors.placeholder : theme.colors.primary}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    pagesList: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pageButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    activePageButton: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    arrowButton: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    pageText: {
        fontSize: 13,
        fontWeight: '800',
    },
    ellipsis: {
        fontSize: 14,
        fontWeight: '800',
        paddingHorizontal: 4,
    },
    disabled: {
        opacity: 0.4,
    }
});

export default Pagination;
