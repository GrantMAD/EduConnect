import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Keyboard,
} from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faSearch,
  faHistory,
  faTimes,
  faBullhorn,
  faBookOpen,
  faFileSignature,
  faFileAlt,
  faUser,
  faFilter,
  faArrowLeft,
  faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RECENT_SEARCHES_KEY = 'recent_searches';

export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const { schoolId } = useSchool();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // all, announcements, homework, assignments, resources, users
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent searches');
    }
  };

  const saveSearch = async (query) => {
    if (!query.trim()) return;
    const updated = [
      query.trim(),
      ...recentSearches.filter((s) => s !== query.trim()),
    ].slice(0, 10);
    setRecentSearches(updated);
    try {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save search');
    }
  };

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim() || !schoolId) return;
    
    Keyboard.dismiss();
    setLoading(true);
    setIsSearching(true);
    saveSearch(query);

    try {
      const searchTasks = [];
      const term = `%${query}%`;

      // 1. Announcements
      if (activeFilter === 'all' || activeFilter === 'announcements') {
        searchTasks.push(
          supabase
            .from('announcements')
            .select('id, title, message, created_at')
            .eq('school_id', schoolId)
            .ilike('title', term)
            .limit(10)
            .then(res => (res.data || []).map(item => ({ ...item, type: 'announcement' })))
        );
      }

      // 2. Homework
      if (activeFilter === 'all' || activeFilter === 'homework') {
        searchTasks.push(
          supabase
            .from('homework')
            .select('id, subject, description, due_date')
            .eq('school_id', schoolId)
            .ilike('subject', term)
            .limit(10)
            .then(res => (res.data || []).map(item => ({ ...item, type: 'homework', title: item.subject })))
        );
      }

      // 3. Assignments
      if (activeFilter === 'all' || activeFilter === 'assignments') {
        searchTasks.push(
          supabase
            .from('assignments')
            .select('id, title, description, due_date')
            .eq('school_id', schoolId)
            .ilike('title', term)
            .limit(10)
            .then(res => (res.data || []).map(item => ({ ...item, type: 'assignment' })))
        );
      }

      // 4. Resources
      if (activeFilter === 'all' || activeFilter === 'resources') {
        searchTasks.push(
          supabase
            .from('resources')
            .select('id, title, description, category')
            .eq('school_id', schoolId)
            .ilike('title', term)
            .limit(10)
            .then(res => (res.data || []).map(item => ({ ...item, type: 'resource' })))
        );
      }

      // 5. Users
      if (activeFilter === 'all' || activeFilter === 'users') {
        searchTasks.push(
          supabase
            .from('users')
            .select('id, full_name, email, role, avatar_url')
            .eq('school_id', schoolId)
            .ilike('full_name', term)
            .limit(10)
            .then(res => (res.data || []).map(item => ({ ...item, type: 'user', title: item.full_name })))
        );
      }

      const allResults = await Promise.all(searchTasks);
      const merged = allResults.flat().sort((a, b) => {
        // Sort by relevance (not perfect but simple)
        if (a.title.toLowerCase() === query.toLowerCase()) return -1;
        if (b.title.toLowerCase() === query.toLowerCase()) return 1;
        return 0;
      });

      setResults(merged);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setIsSearching(false);
  };

  const removeRecentSearch = async (item) => {
    const updated = recentSearches.filter(s => s !== item);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'announcement': return faBullhorn;
      case 'homework': return faBookOpen;
      case 'assignment': return faFileSignature;
      case 'resource': return faFileAlt;
      case 'user': return faUser;
      default: return faSearch;
    }
  };

  const navigateToResult = (item) => {
    switch (item.type) {
      case 'announcement':
        // For now just go to general screen, or we could add individual detail logic
        navigation.navigate('HomeTabs', { screen: 'Announcements' });
        break;
      case 'homework':
        navigation.navigate('HomeTabs', { screen: 'Homework' });
        break;
      case 'assignment':
        navigation.navigate('Homework'); // Assignments usually live here too or nearby
        break;
      case 'resource':
        navigation.navigate('Resources');
        break;
      case 'user':
        // If admin, go to user management
        navigation.navigate('UserManagement');
        break;
    }
  };

  const renderResultItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: theme.colors.cardBorder }]}
      onPress={() => navigateToResult(item)}
    >
      <View style={[styles.iconBox, { backgroundColor: theme.colors.inputBackground }]}>
        <FontAwesomeIcon icon={getResultIcon(item.type)} color={theme.colors.primary} size={16} />
      </View>
      <View style={styles.resultText}>
        <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.resultSub, { color: theme.colors.placeholder }]} numberOfLines={1}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.description || item.message || item.role || ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'announcements', label: 'Announcements' },
    { id: 'homework', label: 'Homework' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'resources', label: 'Resources' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesomeIcon icon={faArrowLeft} size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.inputBackground }]}>
          <FontAwesomeIcon icon={faSearch} color={theme.colors.placeholder} style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="Search everything..."
            placeholderTextColor={theme.colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch()}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <FontAwesomeIcon icon={faTimes} color={theme.colors.placeholder} style={styles.clearIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterBtn,
                activeFilter === f.id && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => {
                setActiveFilter(f.id);
                if (isSearching) handleSearch();
              }}
            >
              <Text style={[
                styles.filterText,
                { color: activeFilter === f.id ? '#fff' : theme.colors.placeholder }
              ]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !isSearching ? (
        /* Recent Searches */
        <View style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Searches</Text>
            {recentSearches.length > 0 && (
              <TouchableOpacity onPress={async () => { setRecentSearches([]); await AsyncStorage.removeItem(RECENT_SEARCHES_KEY); }}>
                <Text style={{ color: theme.colors.primary }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentSearches.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No recent searches</Text>
          ) : (
            <FlatList
              data={recentSearches}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <View style={styles.recentItem}>
                  <TouchableOpacity style={styles.recentItemClick} onPress={() => { setSearchQuery(item); handleSearch(item); }}>
                    <FontAwesomeIcon icon={faHistory} color={theme.colors.placeholder} size={14} />
                    <Text style={[styles.recentText, { color: theme.colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(item)}>
                    <FontAwesomeIcon icon={faTimes} color={theme.colors.placeholder} size={14} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      ) : (
        /* Search Results */
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
          renderItem={renderResultItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No results found for "{searchQuery}"</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          removeClippedSubviews={true}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  clearIcon: { marginLeft: 8 },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 8,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  recentItemClick: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentText: {
    marginLeft: 12,
    fontSize: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultSub: {
    fontSize: 13,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
