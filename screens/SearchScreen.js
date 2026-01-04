import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  faChartLine,
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
  // Core
  { id: 'dashboard', title: 'Dashboard', screen: 'Dashboard', icon: faHome, description: 'School overview and quick stats' },
  { id: 'notifications', title: 'Notifications', screen: 'Notifications', icon: faBell, description: 'View your alerts and updates' },
  { id: 'chat', title: 'Messages', screen: 'ChatList', icon: faComments, description: 'Chat with teachers and parents' },
  { id: 'profile', title: 'My Profile', screen: 'Profile', icon: faUser, description: 'Manage your personal info' },
  { id: 'settings', title: 'Settings', screen: 'Settings', icon: faCog, description: 'App preferences and account' },

  // Academic
  { id: 'classes', title: 'Manage Classes', screen: 'ManageClasses', icon: faChalkboardTeacher, description: 'View and manage academic classes' },
  { id: 'calendar', title: 'Calendar & Schedule', screen: 'Calendar', icon: faCalendarAlt, description: 'School events and schedules' },
  { id: 'homework', title: 'Homework', screen: 'Homework', icon: faBookOpen, description: 'View pending and completed homework' },
  { id: 'resources', title: 'Academic Resources', screen: 'Resources', icon: faFileAlt, description: 'Download study materials and documents' },
  { id: 'my-children', title: 'My Children', screen: 'MyChildren', icon: faUser, description: 'Performance tracking for parents' },

  // Community
  { id: 'clubs', title: 'Clubs & Teams', screen: 'ClubList', icon: faChalkboardTeacher, description: 'Explore extra-curricular activities' },
  { id: 'market', title: 'Marketplace', screen: 'Market', icon: faStore, description: 'Trade school supplies and items' },
  { id: 'polls', title: 'School Polls', screen: 'Polls', icon: faBullhorn, description: 'Participate in school surveys' },
  { id: 'leaderboard', title: 'Leaderboard', screen: 'Leaderboard', icon: faTrophy, description: 'See student rankings and XP' },
  { id: 'shop', title: 'Gamification Shop', screen: 'Shop', icon: faStore, description: 'Redeem rewards and items' },
  { id: 'meetings', title: 'Parent-Teacher Meetings', screen: 'Meetings', icon: faComments, description: 'Schedule and manage appointments' },

  // Administrative
  { id: 'user-management', title: 'User Management', screen: 'UserManagement', icon: faFilter, description: 'Manage school users and roles' },
  { id: 'school-data', title: 'School Data', screen: 'SchoolData', icon: faChartLine, description: 'System-wide data and records' },
  { id: 'engagement', title: 'Engagement Insights', screen: 'EngagementInsights', icon: faChartLine, description: 'Analytics and participation reports' },
  { id: 'manage-announcements', title: 'Manage Announcements', screen: 'ManageAnnouncements', icon: faBullhorn, description: 'Create and edit school news' },
  { id: 'manage-market', title: 'Manage Market Data', screen: 'ManageMarketData', icon: faStore, description: 'Administrative market control' },
  { id: 'create-class', title: 'Create New Class', screen: 'CreateClass', icon: faChalkboardTeacher, description: 'Set up a new academic session' },
  { id: 'create-homework', title: 'Assign Homework', screen: 'CreateHomework', icon: faBookOpen, description: 'Create new homework for students' },
  { id: 'create-assignment', title: 'Create Assignment', screen: 'CreateAssignment', icon: faFileSignature, description: 'Post new graded assignments' },
  { id: 'create-poll', title: 'Create New Poll', screen: 'CreatePoll', icon: faBullhorn, description: 'Start a new school survey' },
];

const SearchScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { schoolId } = useSchool();
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); 
  const [isSearching, setIsSearching] = useState(false);

  const loadRecentSearches = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent searches');
    }
  }, []);

  useEffect(() => {
    loadRecentSearches();
    const params = navigation.getState()?.routes[navigation.getState().index]?.params;
    if (params?.initialQuery) {
      setSearchQuery(params.initialQuery);
    }
  }, [loadRecentSearches, navigation]);

  const handleSearch = useCallback(async (query = searchQuery) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        setResults([]);
        setIsSearching(false);
        return;
    }

    setLoading(true);
    setIsSearching(true);

    try {
      const searchTasks = [];
      const term = `%${trimmedQuery}%`;

      if (activeFilter === 'all' || activeFilter === 'pages') {
        const filteredPages = STATIC_PAGES.filter(p =>
          p.title.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(trimmedQuery.toLowerCase())
        ).map(p => ({ ...p, type: 'page' }));
        searchTasks.push(Promise.resolve(filteredPages));
      }

      if (schoolId) {
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
      }

      const allResults = await Promise.all(searchTasks);
      const merged = allResults.flat().sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const q = trimmedQuery.toLowerCase();
        
        if (aTitle === q) return -1;
        if (bTitle === q) return 1;
        if (aTitle.startsWith(q) && !bTitle.startsWith(q)) return -1;
        if (!aTitle.startsWith(q) && bTitle.startsWith(q)) return 1;
        return 0;
      });

      setResults(merged);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, schoolId]);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (searchQuery.trim().length > 0) {
            handleSearch(searchQuery);
        } else {
            setResults([]);
            setIsSearching(false);
        }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter, handleSearch]);

  const saveSearch = useCallback(async (query) => {
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
  }, [recentSearches]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setResults([]);
    setIsSearching(false);
  }, []);

  const removeRecentSearch = useCallback(async (item) => {
    const updated = recentSearches.filter(s => s !== item);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  }, [recentSearches]);

  const getResultIcon = useCallback((type, item) => {
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
  }, []);

  const navigateToResult = useCallback((item) => {
    saveSearch(item.title || '');
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
  }, [navigation, saveSearch]);

  const getResultColor = useCallback((type, item) => {
    switch (type) {
      case 'announcement': return '#e11d48';
      case 'homework': return '#10b981';
      case 'assignment': return '#4f46e5';
      case 'resource': return '#2563eb';
      case 'user': return '#06b6d4';
      case 'page': return '#8b5cf6';
      case 'class': return '#f59e0b';
      default: return theme.colors.primary;
    }
  }, [theme.colors.primary]);

  const renderResultItem = useCallback(({ item }) => {
    const itemColor = getResultColor(item.type, item);
    return (
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}
        onPress={() => navigateToResult(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.resultIconBox, { backgroundColor: itemColor + '15' }]}>
          <FontAwesomeIcon icon={getResultIcon(item.type, item)} color={itemColor} size={16} />
        </View>
        <View style={styles.resultText}>
          <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.resultSub, { color: theme.colors.placeholder }]} numberOfLines={1}>
            <Text style={{ color: itemColor, fontWeight: '800' }}>{item.type.toUpperCase()}</Text> • {item.description || item.message || item.role || ''}
          </Text>
        </View>
        <FontAwesomeIcon icon={faChevronRight} size={10} color={theme.colors.cardBorder} />
      </TouchableOpacity>
    );
  }, [theme, getResultColor, getResultIcon, navigateToResult]);

  const clearRecentSearches = useCallback(async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={['#4f46e5', '#4338ca']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesomeIcon icon={faArrowLeft} size={20} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1 }]}>
          <FontAwesomeIcon icon={faSearch} color="#fff" size={16} style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { color: '#fff' }]}
            placeholder="Search everything..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch()}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <FontAwesomeIcon icon={faTimes} color="#fff" size={16} style={styles.clearIcon} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={[styles.descriptionContainer, { backgroundColor: '#4f46e5' + '08' }]}>
        <Text style={[styles.descriptionText, { color: '#4f46e5' }]}>
          Find classes, people, announcements, resources, and app pages instantly.
        </Text>
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
              <TouchableOpacity onPress={clearRecentSearches}>
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

export default React.memo(SearchScreen);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    height: 52,
  },
  searchIcon: { marginRight: 12 },
  clearIcon: { marginLeft: 12 },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontWeight: '600',
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
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