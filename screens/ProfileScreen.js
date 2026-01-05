import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import ProfileScreenSkeleton, { SkeletonPiece } from '../components/skeletons/ProfileScreenSkeleton';
import { faGear, faEnvelope, faUser, faBriefcase, faAddressCard, faPhone, faTrophy, faMedal, faFire, faStore, faChartBar, faCoins, faInfoCircle, faArrowRight, faGlobe, faUserFriends, faPencilAlt, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import GamificationInfoModal from '../components/GamificationInfoModal';
import EditProfileModal from '../components/EditProfileModal';
import { BORDER_STYLES, BANNER_STYLES, NAME_COLOR_STYLES, TITLE_STYLES } from '../constants/GamificationStyles';
import AnimatedAvatarBorder from '../components/AnimatedAvatarBorder';
import { BADGES } from '../constants/Badges';
import LinearGradient from 'react-native-linear-gradient';

// Import services
import { getCurrentUser } from '../services/authService';
import { getUserProfile } from '../services/userService';

const { width } = Dimensions.get('window');

const DetailItem = React.memo(({ icon, color, label, value, capitalize, theme }) => (
    <View style={styles.detailItemRow}>
        <View style={[styles.detailIconBox, { backgroundColor: color + '15' }]}>
            <FontAwesomeIcon icon={icon} size={12} color={color} />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, { color: theme.colors.text }, capitalize && { textTransform: 'capitalize' }]}>
                {value}
            </Text>
        </View>
    </View>
));

const ProfileScreen = ({ navigation }) => {
  const defaultUserImage = require('../assets/user.png');
  const { refreshProfile } = useAuth();
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

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("No user logged in");

      const data = await getUserProfile(user.id);

      if (data) {
        setUserData(data);
      }
    } catch (error) {
      console.error(error.message);
      showToast('Failed to fetch profile.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const bannerStyle = useMemo(() => equippedBanner ? BANNER_STYLES[equippedBanner.image_url] : null, [equippedBanner]);
  const nameColorStyle = useMemo(() => equippedNameColor ? NAME_COLOR_STYLES[equippedNameColor.image_url] : null, [equippedNameColor]);
  const titleStyle = useMemo(() => equippedTitle ? TITLE_STYLES[equippedTitle.image_url] : null, [equippedTitle]);

  const borderStyle = useMemo(() => equippedBorder ? BORDER_STYLES[equippedBorder.image_url] : { borderColor: theme.colors.primary, borderWidth: 2 }, [equippedBorder, theme.colors.primary]);
  const avatarSource = useMemo(() => userData.avatar_url ? { uri: userData.avatar_url } : defaultUserImage, [userData.avatar_url, defaultUserImage]);

  const toggleGamificationInfo = useCallback(() => setShowGamificationInfo(prev => !prev), []);
  const openEditProfile = useCallback(() => setShowEditProfile(true), []);
  const closeEditProfile = useCallback((updated) => {
    setShowEditProfile(false);
    if (updated) {
      fetchUserData();
      refreshProfile();
      if (refreshGamificationState) refreshGamificationState();
    }
  }, [fetchUserData, refreshProfile, refreshGamificationState]);

  const navigateToLeaderboard = useCallback(() => navigation.navigate('Leaderboard'), [navigation]);
  const navigateToShop = useCallback(() => navigation.navigate('Shop'), [navigation]);

  return (
    <>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header / Banner Section */}
        <View style={[styles.headerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.bannerWrapper}>
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
          </View>

          <View style={styles.profileInfoArea}>
            <View style={styles.avatarRow}>
              <View style={[styles.avatarBox, { backgroundColor: theme.colors.card }]}>
                {loading ? (
                  <SkeletonPiece style={{ width: 120, height: 120, borderRadius: 40 }} />
                ) : (
                  <AnimatedAvatarBorder
                    avatarSource={avatarSource}
                    size={120}
                    borderStyle={borderStyle}
                    isRainbow={borderStyle.rainbow}
                    isAnimated={borderStyle.animated}
                  />
                )}
                {!loading && <View style={styles.onlineIndicator} />}
              </View>
              
              <View style={styles.actionRow}>
                 <View style={[styles.roleBadge, { 
                     backgroundColor: userData.role === 'admin' ? '#fff1f2' : userData.role === 'teacher' ? '#ecfdf5' : '#eef2ff'
                 }]}>
                    <Text style={[styles.roleText, { 
                        color: userData.role === 'admin' ? '#e11d48' : userData.role === 'teacher' ? '#059669' : '#4f46e5'
                    }]}>{userData.role || 'User'}</Text>
                </View>
                <TouchableOpacity 
                    onPress={openEditProfile}
                    style={[styles.editBtn, { backgroundColor: theme.colors.text, borderColor: theme.colors.text }]}
                >
                    <FontAwesomeIcon icon={faPencilAlt} size={12} color={theme.colors.background} />
                    <Text style={[styles.editBtnText, { color: theme.colors.background }]}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.nameSection}>
                <View style={styles.fullNameRow}>
                    {loading ? (
                    <SkeletonPiece style={{ width: 180, height: 32, borderRadius: 4 }} />
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
                {!loading && <Text style={[styles.emailText, { color: theme.colors.placeholder }]}>{userData.email}</Text>}
            </View>
          </View>
        </View>

        {/* Gamification Hub Card */}
        <View style={[styles.hubCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
          <View style={styles.hubHeader}>
            <View>
                <Text style={[styles.hubTitle, { color: theme.colors.text }]}>Gamification Hub</Text>
                <Text style={[styles.hubSubtitle, { color: theme.colors.placeholder }]}>Track your progress and achievements.</Text>
            </View>
            <View style={styles.hubActionGroup}>
                <TouchableOpacity style={[styles.hubActionBtn, { backgroundColor: '#eef2ff' }]} onPress={navigateToLeaderboard}>
                    <FontAwesomeIcon icon={faChartBar} size={14} color="#4f46e5" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.hubActionBtn, { backgroundColor: '#fffbeb' }]} onPress={navigateToShop}>
                    <FontAwesomeIcon icon={faStore} size={14} color="#d97706" />
                </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.levelBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <View style={styles.levelHeader}>
                <View style={styles.levelInfoLeft}>
                    <LinearGradient colors={['#6366f1', '#9333ea']} style={styles.levelBadge}>
                        <Text style={styles.levelBadgeText}>{current_level}</Text>
                    </LinearGradient>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.levelLabel}>CURRENT LEVEL</Text>
                        <Text style={[styles.xpValue, { color: theme.colors.text }]}>{current_xp.toLocaleString()} Total XP</Text>
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.nextLevelLabel}>TO NEXT LEVEL</Text>
                    <Text style={[styles.nextLevelValue, { color: theme.colors.text }]}>{xpForNextLevel - currentLevelProgress} XP</Text>
                </View>
            </View>
            <View style={[styles.progressContainer, { backgroundColor: theme.colors.card }]}>
                <LinearGradient 
                    colors={['#6366f1', '#a855f7']} 
                    start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                    style={[styles.progressFill, { width: `${progressPercent}%` }]} 
                />
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={[styles.statItem, { backgroundColor: '#fff7ed', borderColor: '#ffedd5', borderWidth: 1 }]}>
                <View style={styles.statIconBox}>
                    <FontAwesomeIcon icon={faFire} size={20} color="#f97316" />
                </View>
                <Text style={styles.statBigValue}>{streak?.current_streak || 0}</Text>
                <Text style={styles.statSmallLabel}>DAY STREAK</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: '#fffbeb', borderColor: '#fef3c7', borderWidth: 1 }]}>
                <View style={styles.statIconBox}>
                    <FontAwesomeIcon icon={faCoins} size={20} color="#f59e0b" />
                </View>
                <Text style={styles.statBigValue}>{coins.toLocaleString()}</Text>
                <Text style={styles.statSmallLabel}>EDUCOINS</Text>
            </View>
          </View>
        </View>

        {/* Achievements Grid */}
        <View style={[styles.hubCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <View style={{ marginBottom: 24 }}>
                <Text style={[styles.hubTitle, { color: theme.colors.text }]}>Achievements</Text>
                <Text style={[styles.hubSubtitle, { color: theme.colors.placeholder }]}>Badges earned through your school journey.</Text>
            </View>

            <View style={styles.badgesGrid}>
                {(BADGES[userData.role] || BADGES['student']).map((badge, index) => {
                    const isEarned = badges.some(b => b.id === badge.id);
                    return (
                        <View key={index} style={styles.badgeWrapper}>
                            <View style={[
                                styles.badgeIconContainer, 
                                isEarned ? { backgroundColor: '#eef2ff' } : { backgroundColor: theme.colors.background, opacity: 0.4 }
                            ]}>
                                <FontAwesomeIcon 
                                    icon={badge.icon} 
                                    size={24} 
                                    color={isEarned ? '#4f46e5' : theme.colors.placeholder} 
                                />
                                {isEarned && (
                                    <View style={styles.earnedCheck}>
                                        <FontAwesomeIcon icon={faCheckCircle} size={10} color="#10b981" />
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.badgeLabel, { color: isEarned ? theme.colors.text : theme.colors.placeholder }]} numberOfLines={1}>
                                {badge.name}
                            </Text>
                            {!isEarned && (
                                <Text style={styles.xpUnlockText}>{badge.min_xp} XP</Text>
                            )}
                        </View>
                    );
                })}
            </View>
        </View>

        {/* Personal Details */}
        <View style={[styles.hubCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder, borderWidth: 1 }]}>
            <View style={styles.detailsHeader}>
                <Text style={[styles.hubTitle, { color: theme.colors.text }]}>Personal Details</Text>
                <View style={[styles.detailsIconBox, { backgroundColor: '#eef2ff' }]}>
                    <FontAwesomeIcon icon={faUser} size={14} color="#4f46e5" />
                </View>
            </View>

            <View style={styles.detailsList}>
                <DetailItem icon={faBriefcase} color="#4f46e5" label="Account Role" value={userData.role} capitalize theme={theme} />
                <DetailItem icon={faEnvelope} color="#3b82f6" label="Email Address" value={userData.email} theme={theme} />
                <DetailItem icon={faPhone} color="#10b981" label="Phone Number" value={userData.number || 'Not linked'} theme={theme} />
                <DetailItem icon={faGlobe} color="#8b5cf6" label="Location" value={userData.country || 'Not set'} theme={theme} />
            </View>
        </View>

        <GamificationInfoModal visible={showGamificationInfo} onClose={toggleGamificationInfo} />
        <EditProfileModal
          visible={showEditProfile}
          onClose={closeEditProfile}
          currentUser={userData}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

export default React.memo(ProfileScreen);

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingBottom: 40 },
  headerCard: { borderRadius: 32, overflow: 'hidden', marginBottom: 20 },
  bannerWrapper: { height: 140, overflow: 'hidden' },
  banner: { height: '100%' },
  profileInfoArea: { paddingHorizontal: 24, paddingBottom: 24 },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -40, marginBottom: 16 },
  avatarBox: { padding: 4, borderRadius: 40, position: 'relative' },
  onlineIndicator: { 
      position: 'absolute', 
      bottom: 8, 
      right: 8, 
      width: 16, 
      height: 16, 
      borderRadius: 8, 
      backgroundColor: '#22c55e', 
      borderWidth: 3, 
      borderColor: '#fff' 
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  roleText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, gap: 6 },
  editBtnText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  nameSection: { marginTop: 4 },
  fullNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  fullName: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  titleTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  titleTagText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  emailText: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  
  hubCard: { borderRadius: 32, padding: 24, marginBottom: 20 },
  hubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  hubTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  hubSubtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  hubActionGroup: { flexDirection: 'row', gap: 8 },
  hubActionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  levelBox: { borderRadius: 24, padding: 20, marginBottom: 24 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  levelInfoLeft: { flexDirection: 'row', alignItems: 'center' },
  levelBadge: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  levelBadgeText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  levelLabel: { fontSize: 9, fontWeight: '900', color: '#6366f1', letterSpacing: 1 },
  xpValue: { fontSize: 18, fontWeight: '900' },
  nextLevelLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  nextLevelValue: { fontSize: 15, fontWeight: '900' },
  progressContainer: { height: 12, borderRadius: 6, width: '100%', overflow: 'hidden', padding: 2 },
  progressFill: { height: '100%', borderRadius: 4 },
  
  statGrid: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, borderRadius: 24, padding: 20, alignItems: 'center' },
  statIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statBigValue: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  statSmallLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: 'rgba(0,0,0,0.4)' },
  
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  badgeWrapper: { width: (width - 112) / 3, alignItems: 'center', marginBottom: 8 },
  badgeIconContainer: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 8 },
  earnedCheck: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 10, padding: 2 },
  badgeLabel: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.5 },
  xpUnlockText: { fontSize: 9, fontWeight: '700', color: '#94a3b8', marginTop: 2 },
  
  detailsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  detailsIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailsList: { gap: 20 },
  detailItemRow: { flexDirection: 'row', alignItems: 'center' },
  detailIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontSize: 14, fontWeight: '700', marginTop: 1 }
});
