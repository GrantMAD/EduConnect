import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { getSession, onAuthStateChange, signOut as signOutService } from '../services/authService';
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

  const signOut = async () => {
    await signOutService();
  };

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
