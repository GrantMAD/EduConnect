import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { DefaultTheme, DarkTheme, Provider as PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { supabase } from '../lib/supabase'; // Import supabase
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

const THEME_STORAGE_KEY = 'theme_preference';

// Define custom light theme
const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    primary: '#007AFF', // Blue
    accent: '#007AFF',
    background: '#f8f9fa', // Light gray background
    surface: '#ffffff', // White cards/surfaces
    text: '#333333', // Dark text
    placeholder: '#666666',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#ff8000',
    // Custom colors for specific elements
    cardBackground: '#ffffff',
    cardBorder: '#e0e0e0',
    headerBackground: '#ffffff',
    headerText: '#333333',
    inputBackground: '#f0f0f0',
    inputBorder: '#e0e0e0',
    buttonPrimary: '#007AFF',
    buttonPrimaryText: '#ffffff',
    buttonSecondary: '#6c757d',
    buttonSecondaryText: '#ffffff',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
  },
};

// Define custom dark theme
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    primary: '#007AFF', // Blue (can be adjusted for dark mode if needed)
    accent: '#007AFF',
    background: '#121212', // Dark background
    surface: '#1e1e1e', // Darker surfaces
    text: '#ffffff', // Light text
    placeholder: '#aaaaaa',
    backdrop: 'rgba(0, 0, 0, 0.7)',
    notification: '#ff8000',
    // Custom colors for specific elements
    cardBackground: '#1e1e1e',
    cardBorder: '#333333',
    headerBackground: '#1e1e1e',
    headerText: '#ffffff',
    inputBackground: '#2c2c2c',
    inputBorder: '#444444',
    buttonPrimary: '#007AFF',
    buttonPrimaryText: '#ffffff',
    buttonSecondary: '#6c757d',
    buttonSecondaryText: '#ffffff',
    error: '#dc3545',
    success: '#28a745',
    warning: '#ffc107',
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children, session }) => { // Accept session prop
  const colorScheme = useColorScheme(); // 'light' or 'dark'
  const [isDarkTheme, setIsDarkTheme] = useState(colorScheme === 'dark');
  const [isThemeLoaded, setIsThemeLoaded] = useState(false); // New state to track if theme is loaded

  useEffect(() => {
    const loadThemePreference = async () => {
      let preferredTheme = null;

      // 1. Try to load from AsyncStorage (local device preference)
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme !== null) {
          preferredTheme = storedTheme;
        }
      } catch (e) {
        console.error('Failed to load theme from AsyncStorage', e);
      }

      // 2. If user is logged in, try to load from Supabase (cloud preference)
      if (session?.user) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('theme_preference')
            .eq('id', session.user.id)
            .single();

          if (data && data.theme_preference !== null) {
            // Supabase preference overrides local preference for logged-in users
            preferredTheme = data.theme_preference;
            // Also update AsyncStorage to match Supabase for consistency
            await AsyncStorage.setItem(THEME_STORAGE_KEY, preferredTheme);
          }
        } catch (e) {
          console.error('Failed to load theme from Supabase', e);
        }
      }

      // 3. Apply the determined theme, or fallback to system preference
      if (preferredTheme !== null) {
        setIsDarkTheme(preferredTheme === 'dark');
      } else {
        setIsDarkTheme(colorScheme === 'dark');
      }
      setIsThemeLoaded(true);
    };

    loadThemePreference();
  }, [session?.user?.id, colorScheme]); // Depend on session.user.id and colorScheme

  const toggleTheme = useCallback(async () => {
    setIsDarkTheme(prev => {
      const newTheme = !prev;
      const themeString = newTheme ? 'dark' : 'light';

      // Save preference to AsyncStorage
      AsyncStorage.setItem(THEME_STORAGE_KEY, themeString).catch(e =>
        console.error('Failed to save theme to AsyncStorage', e)
      );

      // Save preference to Supabase if user is logged in
      if (session?.user) {
        supabase
          .from('users')
          .update({ theme_preference: themeString })
          .eq('id', session.user.id)
          .then(({ error }) => {
            if (error) console.error('Error saving theme preference to Supabase:', error);
          });
      }
      return newTheme;
    });
  }, [session?.user?.id]); // Depend on session.user.id

  const theme = isDarkTheme ? CustomDarkTheme : CustomDefaultTheme;

  // Only render children once theme is loaded to prevent flickering
  if (!isThemeLoaded) {
    return null; 
  }

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme, theme }}>
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
