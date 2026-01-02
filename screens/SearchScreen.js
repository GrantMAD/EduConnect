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
  Dimensions
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
  faHome,
  faBell,
  faComments,
  faTrophy,
  faStore,
  faCog,
  faChalkboardTeacher,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSchool } from '../context/SchoolContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

const RECENT_SEARCHES_KEY = 'recent_searches';

const STATIC_PAGES = [
  { id: 'dashboard', title: 'Dashboard', screen: 'Dashboard', icon: faHome, description: 'School overview and quick stats' },
  { id: 'notifications', title: 'Notifications', screen: 'Notifications', icon: faBell, description: 'View your alerts and updates' },
  { id: 'chat', title: 'Messages', screen: 'ChatList', icon: faComments, description: 'Chat with teachers and parents' },
  { id: 'calendar', title: 'Calendar', screen: 'Calendar', icon: faCalendarAlt, description: 'School events and schedules' },
  { id: 'homework', title: 'Homework', screen: 'Homework', icon: faBookOpen, description: 'View pending and completed homework' },
  { id: 'polls', title: 'Polls', screen: 'Polls', icon: faBullhorn, description: 'Participate in school surveys' },
  { id: 'leaderboard', title: 'Leaderboard', screen: 'Leaderboard', icon: faTrophy, description: 'See student rankings and XP' },
  { id: 'shop', title: 'Shop', screen: 'Shop', icon: faStore, description: 'Redeem rewards and items' },
  { id: 'profile', title: 'My Profile', screen: 'Profile', icon: faUser, description: 'Manage your personal info' },
  { id: 'settings', title: 'Settings', screen: 'Settings', icon: faCog, description: 'App preferences and account' },
];

export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const { schoolId } = useSchool();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadRecentSearches();
    const initialQuery = navigation.getState()?.routes[navigation.getState().index]?.params?.initialQuery;
    if (initialQuery) {
      setSearchQuery(initialQuery);
      handleSearch(initialQuery);
    }
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

      if (activeFilter === 'all' || activeFilter === 'classes') {
        searchTasks.push(
          supabase
            .from('classes')
            .select('id, name')
            .eq('school_id', schoolId)
            .ilike('name', term)
            .limit(10)
            .then(res => (res.data || []).map(item => ({ ...item, type: 'class', title: item.name, icon: faChalkboardTeacher })))
        );
      }

      if (activeFilter === 'all' || activeFilter === 'pages') {
        const filteredPages = STATIC_PAGES.filter(p =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
        ).map(p => ({ ...p, type: 'page' }));
        searchTasks.push(Promise.resolve(filteredPages));
      }

      const allResults = await Promise.all(searchTasks);
      const merged = allResults.flat().sort((a, b) => {
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

  const getResultIcon = (type, item) => {
    switch (type) {
      case 'announcement': return faBullhorn;
      case 'homework': return faBookOpen;
      case 'assignment': return faFileSignature;
      case 'resource': return faFileAlt;
      case 'user': return faUser;
      case 'page': return item.icon || faSearch;
      case 'class': return faChalkboardTeacher;
      default: return faSearch;
    }
  };

  const navigateToResult = (item) => {
    switch (item.type) {
      case 'announcement':
        navigation.navigate('HomeTabs', { screen: 'Announcements' });
        break;
      case 'homework':
        navigation.navigate('HomeTabs', { screen: 'Homework' });
        break;
      case 'assignment':
        navigation.navigate('Homework'); 
        break;
      case 'resource':
        navigation.navigate('Resources');
        break;
      case 'user':
        navigation.navigate('UserManagement');
        break;
      case 'page':
        navigation.navigate(item.screen);
        break;
      case 'class':
        navigation.navigate('ManageUsersInClass', { classId: item.id, className: item.title });
        break;
    }
  };

  const renderResultItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.resultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
      onPress={() => navigateToResult(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.resultIconBox, { backgroundColor: theme.colors.primary + '10' }]}>
        <FontAwesomeIcon icon={getResultIcon(item.type, item)} color={theme.colors.primary} size={16} />
      </View>
      <View style={styles.resultText}>
        <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.resultSub, { color: theme.colors.placeholder }]} numberOfLines={1}>
          {item.type.toUpperCase()} • {item.description || item.message || item.role || ''}
        </Text>
      </View>
      <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.cardBorder} />
    </TouchableOpacity>
  );

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'pages', label: 'Pages' },
    { id: 'classes', label: 'Classes' },
    { id: 'announcements', label: 'News' },
    { id: 'homework', label: 'Homework' },
    { id: 'resources', label: 'Resources' },
    { id: 'users', label: 'People' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Modern Search Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesomeIcon icon={faArrowLeft} size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <FontAwesomeIcon icon={faSearch} color={theme.colors.placeholder} size={16} style={styles.searchIcon} />
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
              <FontAwesomeIcon icon={faTimes} color={theme.colors.placeholder} size={16} style={styles.clearIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters Scroll */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.filterBtn,
                { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 },
                activeFilter === f.id && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
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
        <ScrollView style={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Searches</Text>
            {recentSearches.length > 0 && (
              <TouchableOpacity onPress={async () => { setRecentSearches([]); await AsyncStorage.removeItem(RECENT_SEARCHES_KEY); }}>
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>CLEAR ALL</Text>
              </TouchableOpacity>
            )}
          </View>
          {recentSearches.length === 0 ? (
            <View style={styles.emptyRecent}>
                <FontAwesomeIcon icon={faHistory} size={40} color={theme.colors.placeholder} style={{ opacity: 0.3, marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No recent searches</Text>
            </View>
          ) : (
            recentSearches.map((item, idx) => (
                <View key={idx} style={[styles.recentItem, { borderBottomColor: theme.colors.cardBorder }]}>
                  <TouchableOpacity style={styles.recentItemClick} onPress={() => { setSearchQuery(item); handleSearch(item); }}>
                    <FontAwesomeIcon icon={faHistory} color={theme.colors.placeholder} size={14} />
                    <Text style={[styles.recentText, { color: theme.colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(item)} style={{ padding: 8 }}>
                    <FontAwesomeIcon icon={faTimes} color={theme.colors.placeholder} size={14} />
                  </TouchableOpacity>
                </View>
            ))
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
          renderItem={renderResultItem}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: theme.colors.placeholder }]}>No results found for "{searchQuery}"</Text>
            </View>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
    paddingBottom: 16,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 54,
  },
  searchIcon: { marginRight: 12 },
  clearIcon: { marginLeft: 12 },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontWeight: '500',
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  recentItemClick: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyRecent: {
      alignItems: 'center',
      marginTop: 40,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  resultIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  resultSub: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
