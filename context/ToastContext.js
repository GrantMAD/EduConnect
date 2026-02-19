import React, { createContext, useState, useCallback, useContext } from 'react';
import Toast from '../components/Toast';

const ToastStateContext = createContext();
const ToastActionsContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'default', duration = 3000) => {
    setToast({ message, type, duration });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const stateValue = React.useMemo(() => ({ toast }), [toast]);
  const actionsValue = React.useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastStateContext.Provider value={stateValue}>
      <ToastActionsContext.Provider value={actionsValue}>
        {children}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onHide={hideToast}
          />
        )}
      </ToastActionsContext.Provider>
    </ToastStateContext.Provider>
  );
};

export const useToast = () => {
  const state = useContext(ToastStateContext);
  const actions = useContext(ToastActionsContext);
  if (!state || !actions) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return { ...state, ...actions };
};

export const useToastActions = () => {
  const context = useContext(ToastActionsContext);
  if (!context) {
    throw new Error('useToastActions must be used within a ToastProvider');
  }
  return context;
};

export const useToastState = () => {
  const context = useContext(ToastStateContext);
  if (!context) {
    throw new Error('useToastState must be used within a ToastProvider');
  }
  return context;
};
