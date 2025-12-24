import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ProfileScreenSkeleton, { SkeletonPiece } from '../components/skeletons/ProfileScreenSkeleton';
import { faGear, faEnvelope, faUser, faBriefcase, faAddressCard, faPhone, faTrophy, faMedal, faFire, faStore, faChartBar, faCoins, faInfoCircle, faArrowRight, faGlobe, faUserFriends, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useGamification } from '../context/GamificationContext';
import GamificationInfoModal from '../components/GamificationInfoModal';
import EditProfileModal from '../components/EditProfileModal';
import { BORDER_STYLES, BANNER_STYLES, NAME_COLOR_STYLES, TITLE_STYLES } from '../constants/GamificationStyles';
import AnimatedAvatarBorder from '../components/AnimatedAvatarBorder';
import { BADGES } from '../constants/Badges';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const defaultUserImage = require('../assets/user.png');
  const { 
    current_level = 1, current_xp = 0, coins = 0, streak = {}, badges = [], 
    equippedBorder, equippedBanner, equippedNameColor, equippedTitle,
    loading: gamificationLoading, refreshGamificationState 
  } = useGamification();
  
  const [showGamificationInfo, setShowGamificationInfo] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (refreshGamificationState) {
        refreshGamificationState();
      }
    }, [refreshGamificationState])
  );

  const xpForNextLevel = 100;
  const currentLevelProgress = current_xp % xpForNextLevel;
  const progressPercent = (currentLevelProgress / xpForNextLevel) * 100;

  const [userData, setUserData] = useState({
    id: '',
    full_name: '',
    email: '',
    role: '',
    avatar_url: '',
    country: '',
    number: ''
  });
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const { showToast } = useToast();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserData(data);
      }
    } catch (error) {
      console.error(error.message);
      showToast('Failed to fetch profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const bannerStyle = equippedBanner ? BANNER_STYLES[equippedBanner.image_url] : null;
  const nameColorStyle = equippedNameColor ? NAME_COLOR_STYLES[equippedNameColor.image_url] : null;
  const titleStyle = equippedTitle ? TITLE_STYLES[equippedTitle.image_url] : null;

  const borderStyle = equippedBorder ? BORDER_STYLES[equippedBorder.image_url] : { borderColor: theme.colors.primary, borderWidth: 2 };
  const avatarSource = userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage;

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header / Banner Section */}
        <View style={[styles.headerSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          {bannerStyle ? (
            <LinearGradient 
              colors={bannerStyle.background} 
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}} 
              style={styles.banner}
            >
              {bannerStyle.overlay && <View style={[StyleSheet.absoluteFill, { backgroundColor: bannerStyle.overlay }]} />}
            </LinearGradient>
          ) : (
            <View style={[styles.banner, { backgroundColor: theme.colors.primary }]} />
          )}

          <View style={styles.profileContent}>
            {/* Avatar and Main Actions Row */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarWrapper}>
                {loading ? (
                  <SkeletonPiece style={{ width: 100, height: 100, borderRadius: 50 }} />
                ) : (
                  <AnimatedAvatarBorder
                    avatarSource={avatarSource}
                    size={100}
                    borderStyle={borderStyle}
                    isRainbow={borderStyle.rainbow}
                    isAnimated={borderStyle.animated}
                  />
                )}
              </View>
              
              <TouchableOpacity 
                onPress={() => setShowEditProfile(true)}
                style={[styles.editButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder }]}
              >
                <FontAwesomeIcon icon={faPencilAlt} size={14} color={theme.colors.text} />
                <Text style={[styles.editButtonText, { color: theme.colors.text }]}>Edit Profile</Text>
              </TouchableOpacity>
            </View>

            {/* User Name and Titles Block */}
            <View style={styles.nameBlock}>
              <View style={styles.fullNameRow}>
                {loading ? (
                  <SkeletonPiece style={{ width: 180, height: 28, borderRadius: 4 }} />
                ) : (
                  <>
                    <Text 
                      style={[styles.fullName, nameColorStyle?.style, !nameColorStyle && { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {userData.full_name || 'Student'}
                    </Text>
                    {titleStyle && (
                      <View style={[styles.titleTag, { backgroundColor: titleStyle.colors.bg }]}>
                        <Text style={[styles.titleTagText, { color: titleStyle.colors.text }]}>{titleStyle.label}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
              
              {loading ? (
                <SkeletonPiece style={{ width: 140, height: 16, borderRadius: 4, marginTop: 8 }} />
              ) : (
                <Text style={[styles.email, { color: theme.colors.textSecondary }]}>{userData.email}</Text>
              )}
              
              {loading ? (
                <SkeletonPiece style={{ width: 60, height: 20, borderRadius: 8, marginTop: 10 }} />
              ) : (
                <View style={[styles.roleBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Text style={[styles.roleText, { color: theme.colors.primary }]}>{userData.role?.toUpperCase() || 'USER'}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Gamification Card */}
        <View style={[styles.gamificationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <FontAwesomeIcon icon={faTrophy} size={18} color="#FF9500" />
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Level {current_level}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowGamificationInfo(true)}>
              <FontAwesomeIcon icon={faInfoCircle} size={18} color={theme.colors.placeholder} />
            </TouchableOpacity>
          </View>

          {gamificationLoading ? (
            <View style={{ width: '100%' }}>
              <SkeletonPiece style={{ height: 10, borderRadius: 5, marginBottom: 8 }} />
              <SkeletonPiece style={{ width: 150, height: 12, borderRadius: 4, alignSelf: 'flex-end' }} />
            </View>
          ) : (
            <>
              <View style={[styles.progressBarBackground, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.colors.primary }]} />
              </View>
              <Text style={[styles.xpText, { color: theme.colors.placeholder }]}>{current_xp} XP Total • {100 - (current_xp % 100)} XP to Level {current_level + 1}</Text>
            </>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <FontAwesomeIcon icon={faFire} size={24} color="#FF4500" />
              {gamificationLoading ? (
                <SkeletonPiece style={{ width: 30, height: 22, borderRadius: 4, marginTop: 5 }} />
              ) : (
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{streak?.current_streak || 0}</Text>
              )}
              <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>STREAK</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
            <View style={styles.statBox}>
              <FontAwesomeIcon icon={faCoins} size={24} color="#FFD700" />
              {gamificationLoading ? (
                <SkeletonPiece style={{ width: 50, height: 22, borderRadius: 4, marginTop: 5 }} />
              ) : (
                <Text style={[styles.statValue, { color: theme.colors.text }]}>{coins}</Text>
              )}
              <Text style={[styles.statLabel, { color: theme.colors.placeholder }]}>COINS</Text>
            </View>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.cardButton, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate('Shop')}>
              <FontAwesomeIcon icon={faStore} size={14} color="#fff" />
              <Text style={styles.cardButtonText}>Rewards Shop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cardButton, { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.cardBorder }]} onPress={() => navigation.navigate('Leaderboard')}>
              <FontAwesomeIcon icon={faChartBar} size={14} color={theme.colors.text} />
              <Text style={[styles.cardButtonText, { color: theme.colors.text }]}>Leaderboard</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Badges Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesomeIcon icon={faMedal} size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Badges & Achievements</Text>
          </View>
          
          <View style={styles.badgesGrid}>
            {gamificationLoading ? (
              [1, 2, 3].map(i => (
                <View key={i} style={styles.badgeItem}>
                  <SkeletonPiece style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 8 }} />
                  <SkeletonPiece style={{ width: 50, height: 10, borderRadius: 4 }} />
                </View>
              ))
            ) : (BADGES[userData.role] || BADGES['student']).map((badge, index) => {
              const isEarned = badges.some(b => b.id === badge.id);
              return (
                <View key={index} style={[styles.badgeItem, !isEarned && { opacity: 0.4 }]}>
                  <View style={[styles.badgeCircle, { backgroundColor: isEarned ? '#FFF9C4' : theme.colors.surface, borderColor: isEarned ? '#FFD700' : theme.colors.cardBorder }]}>
                    <FontAwesomeIcon icon={badge.icon} size={24} color={isEarned ? '#FFD700' : theme.colors.placeholder} />
                  </View>
                  <Text style={[styles.badgeName, { color: theme.colors.text }]} numberOfLines={1}>{badge.name}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FontAwesomeIcon icon={faAddressCard} size={18} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Information</Text>
          </View>

          <View style={[styles.infoList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }]}>
            <InfoRow icon={faUser} label="Full Name" value={userData.full_name} theme={theme} loading={loading} />
            <InfoRow icon={faEnvelope} label="Email" value={userData.email} theme={theme} loading={loading} />
            <InfoRow icon={faPhone} label="Phone" value={userData.number || 'Not provided'} theme={theme} loading={loading} />
            <InfoRow icon={faGlobe} label="Country" value={userData.country || 'Not provided'} theme={theme} loading={loading} />
          </View>
        </View>

        <GamificationInfoModal visible={showGamificationInfo} onClose={() => setShowGamificationInfo(false)} />
        <EditProfileModal
          visible={showEditProfile}
          onClose={(updated) => {
            setShowEditProfile(false);
            if (updated) {
              fetchUserData();
              if (refreshGamificationState) refreshGamificationState();
            }
          }}
          currentUser={userData}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const InfoRow = ({ icon, label, value, theme, loading }) => (
  <View style={[styles.infoRow, { borderBottomColor: theme.colors.background }]}>
    <FontAwesomeIcon icon={icon} size={16} color={theme.colors.placeholder} />
    <View style={{ marginLeft: 15, flex: 1 }}>
      <Text style={[styles.infoLabel, { color: theme.colors.placeholder }]}>{label}</Text>
      {loading ? (
        <SkeletonPiece style={{ width: '80%', height: 16, borderRadius: 4, marginTop: 4 }} />
      ) : (
        <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value}</Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingBottom: 24 },
  headerSection: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden', borderBottomWidth: 1, elevation: 5 },
  banner: { height: 160 },
  profileContent: { paddingHorizontal: 24, paddingBottom: 24 },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -50, marginBottom: 15 },
  avatarWrapper: { elevation: 10 },
  editButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 6, marginBottom: 5 },
  editButtonText: { fontSize: 12, fontWeight: 'bold' },
  nameBlock: { alignSelf: 'stretch' },
  fullNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  fullName: { fontSize: 26, fontWeight: '900' },
  email: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  roleText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  titleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  titleTagText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  gamificationCard: { margin: 24, padding: 20, borderRadius: 25, borderWidth: 1, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 20, fontWeight: '900' },
  progressBarBackground: { height: 10, borderRadius: 5, width: '100%', overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 5 },
  xpText: { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20, paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', marginTop: 5 },
  statLabel: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  statDivider: { width: 1, height: '100%' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  cardButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 15, gap: 8 },
  cardButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  section: { paddingHorizontal: 24, marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeItem: { width: '30%', alignItems: 'center', marginBottom: 20 },
  badgeCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  badgeName: { fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  infoList: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  infoLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '600', marginTop: 2 }
});