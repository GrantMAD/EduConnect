import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { AppState } from 'react-native';
import { getSession, onAuthStateChange, signOut as signOutService, checkPlatformSession, registerPlatformSession } from '../services/authService';
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
      if (data) {
        const flattenedProfile = {
          ...data,
          school_type: data.school?.school_type || null,
          student_account_min_grade: data.school?.student_account_min_grade || null
        };
        setProfile(flattenedProfile);
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error('Exception fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Get initial session
    getSession().then((session) => {
      const currentUser = session?.user || null;
      if (currentUser && !currentUser.email_confirmed_at) {
        signOutService();
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(currentUser);
      if (currentUser) {
        registerPlatformSession(currentUser.id);
        fetchProfile(currentUser.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user || null;
        if (currentUser && !currentUser.email_confirmed_at) {
          signOutService();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        setUser(currentUser);
        if (currentUser) {
          registerPlatformSession(currentUser.id);
          fetchProfile(currentUser.id);
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
