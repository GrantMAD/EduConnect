import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { DefaultTheme, DarkTheme, Provider as PaperProvider } from 'react-native-paper';
import { useColorScheme } from 'react-native';
import { supabase } from '../lib/supabase'; // Import supabase

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
      if (session?.user) { // Use session.user
        const { data, error } = await supabase
          .from('users')
          .select('theme_preference')
          .eq('id', session.user.id)
          .single();

        if (data && data.theme_preference !== null) {
          setIsDarkTheme(data.theme_preference === 'dark');
        } else {
          // Fallback to system preference if no user preference is set
          setIsDarkTheme(colorScheme === 'dark');
        }
      } else {
        // If no user session, use system preference
        setIsDarkTheme(colorScheme === 'dark');
      }
      setIsThemeLoaded(true);
    };

    loadThemePreference();
  }, [session?.user?.id, colorScheme]); // Depend on session.user.id and colorScheme

  const toggleTheme = useCallback(async () => {
    setIsDarkTheme(prev => {
      const newTheme = !prev;
      // Save preference to Supabase
      if (session?.user) { // Use session.user
        supabase
          .from('users')
          .update({ theme_preference: newTheme ? 'dark' : 'light' })
          .eq('id', session.user.id)
          .then(({ error }) => {
            if (error) console.error('Error saving theme preference:', error);
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
