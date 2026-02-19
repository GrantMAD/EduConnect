import { useState, useCallback } from 'react';
import { useToastActions } from '../context/ToastContext';

export const useApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { showToast } = useToastActions();

    const execute = useCallback(async (apiCall, options = {}) => {
        const {
            onSuccess,
            onError,
            successMessage,
            errorMessage = 'An error occurred. Please try again.',
            throwError = false,
        } = options;

        setLoading(true);
        setError(null);

        try {
            const result = await apiCall();

            if (successMessage) {
                showToast(successMessage, 'success');
            }

            if (onSuccess) {
                onSuccess(result);
            }

            return { data: result, error: null };
        } catch (err) {
            console.error('API Error:', err);
            setError(err);

            let handled = false;
            if (onError) {
                handled = onError(err); // Allow custom handler to return true if it handled the UI
            }

            if (!handled) {
                if (err.code === '23505') {
                    // Generic unique constraint handler if not handled specifically
                    showToast('This action has already been performed.', 'info');
                } else {
                    showToast(errorMessage, 'error');
                }
            }

            if (throwError) throw err;
            return { data: null, error: err };
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    return { execute, loading, error };
};
