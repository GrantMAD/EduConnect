import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';
import { getSession, onAuthStateChange, signOut as signOutService, checkPlatformSession } from '../services/authService';
import { getUserProfile } from '../services/userService';

const AuthContext = createContext({});


export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId) => {
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch (e) {
      console.error('Exception fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    getSession().then((session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await signOutService();
    setUser(null);
    setProfile(null);
  }, []);

  // Periodically check if another mobile session has taken over
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      const isValid = await checkPlatformSession(user.id);
      if (!isValid) {
        console.warn('Session invalidated by another mobile device');
        signOut();
      }
    };

    // Check periodically
    const interval = setInterval(checkSession, 30000); // Every 30 seconds

    // Check when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkSession();
      }
    });

    // Immediate check
    checkSession();

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user, signOut]);

  const refreshProfile = React.useCallback(() => {
    if (user) fetchProfile(user.id);
  }, [user]);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    signOut,
    setProfile,
    refreshProfile
  }), [user, profile, loading, signOut, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
