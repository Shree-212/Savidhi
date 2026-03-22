import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { userService } from '../../services';
import { resolveMediaUrl } from '../../utils';
import type { UserProfile, Achievement } from '../../data';

const STATS = [
  { key: 'pujaBooked', label: 'Puja Booked', icon: 'fire' },
  { key: 'appointments', label: 'Appointments', icon: 'account-clock-outline' },
  { key: 'pujaForOthers', label: 'Puja For Others', icon: 'account-group-outline' },
] as const;

export function PointsScreen({ navigation }: { navigation?: any }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('savidhi_token');
        if (!token) {
          setNeedsLogin(true);
          setLoading(false);
          return;
        }
        const [profileRes, gemsRes, achievementsRes] = await Promise.all([
          userService.getProfile(),
          userService.getGems(),
          userService.getAchievements(),
        ]);
        const d = profileRes.data?.data ?? profileRes.data;
        const gemsData = gemsRes.data?.data ?? gemsRes.data;
        const achievementsData = achievementsRes.data?.data ?? achievementsRes.data;

        const achievements: Achievement[] = (Array.isArray(achievementsData) ? achievementsData : []).map((a: any) => ({
          id: a.id,
          name: a.name ?? '',
          imageUrl: a.image_url ?? a.icon_url ?? '',
          unlocked: a.unlocked ?? a.is_unlocked ?? false,
        }));

        setUser({
          id: d.id,
          name: d.name ?? '',
          phone: d.phone ?? '',
          imageUrl: d.image_url ?? d.profile_pic ?? '',
          level: d.level ?? 1,
          gems: typeof gemsData === 'number' ? gemsData : (gemsData?.total ?? d.gems ?? 0),
          pujaBooked: d.puja_booked ?? d.pujas_booked ?? 0,
          appointments: d.appointments ?? 0,
          pujaForOthers: d.puja_for_others ?? 0,
          devoteeSince: d.devotee_since ?? d.created_at ?? '',
          achievements,
        });
      } catch (err: any) {
        if (err?.response?.status === 401) {
          setNeedsLogin(true);
        } else {
          console.error('PointsScreen fetch error:', err);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (needsLogin) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl }]}>
        <Icon name="account-lock" size={64} color={Colors.textMuted} />
        <Text style={[Typography.subtitle, { color: Colors.textPrimary, marginTop: Spacing.lg, textAlign: 'center' }]}>Login to view your points</Text>
        <Text style={[Typography.body, { color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' }]}>Track your gems, achievements, and devotee journey</Text>
        <TouchableOpacity
          style={{ backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, marginTop: Spacing.xl }}
          onPress={() => navigation?.navigate('Login')}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || !user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Text style={styles.heading}>My Points</Text>

      {/* User Card */}
      <View style={styles.userCard}>
        <Image source={{ uri: resolveMediaUrl(user.imageUrl) }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userLevel}>Level {user.level}</Text>
        </View>
        <View style={styles.gemsContainer}>
          <Icon name="diamond-stone" size={22} color={Colors.primary} />
          <Text style={styles.gemsCount}>{user.gems}</Text>
          <Text style={styles.gemsLabel}>Gems</Text>
        </View>
      </View>

      {/* Level Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Level {user.level}</Text>
          <Text style={styles.progressLabel}>Level {user.level + 1}</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '65%' }]} />
        </View>
        <Text style={styles.progressHint}>Complete 35 more pujas to reach Level {user.level + 1}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {STATS.map(stat => (
          <View key={stat.key} style={styles.statCard}>
            <Icon name={stat.icon} size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{user[stat.key]}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Devotee Since */}
      <View style={styles.sinceCard}>
        <Icon name="calendar-heart" size={20} color={Colors.primary} />
        <Text style={styles.sinceText}>Devotee Since {user.devoteeSince}</Text>
      </View>

      {/* Achievements */}
      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={styles.achievementsRow}>
        {user.achievements.map(ach => (
          <View key={ach.id} style={[styles.achievementCard, !ach.unlocked && styles.achievementLocked]}>
            <Image source={{ uri: resolveMediaUrl(ach.imageUrl) }} style={styles.achievementImage} />
            <Text style={styles.achievementName}>{ach.name}</Text>
            {!ach.unlocked && (
              <View style={styles.lockOverlay}>
                <Icon name="lock" size={20} color={Colors.textMuted} />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* How to earn */}
      <View style={styles.earnCard}>
        <Text style={styles.earnTitle}>How to Earn Gems</Text>
        {[
          { icon: 'fire', text: 'Book a Puja – Earn 10 gems' },
          { icon: 'account-clock-outline', text: 'Book an Appointment – Earn 5 gems' },
          { icon: 'share-variant', text: 'Refer a Friend – Earn 25 gems' },
          { icon: 'star', text: 'Complete Weekly Puja – Earn 15 gems' },
        ].map((item, i) => (
          <View key={i} style={styles.earnRow}>
            <Icon name={item.icon} size={18} color={Colors.primary} />
            <Text style={styles.earnText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.xxxl },
  heading: { ...Typography.heading, color: Colors.textPrimary, marginBottom: Spacing.xl },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.borderLight },
  userInfo: { flex: 1, marginLeft: Spacing.md },
  userName: { ...Typography.subtitle, color: Colors.textPrimary },
  userLevel: { ...Typography.caption, color: Colors.primary, marginTop: 2 },
  gemsContainer: { alignItems: 'center' },
  gemsCount: { ...Typography.heading, color: Colors.primary, marginTop: 2 },
  gemsLabel: { ...Typography.small, color: Colors.textSecondary },
  progressSection: { marginBottom: Spacing.lg },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progressLabel: { ...Typography.small, color: Colors.textSecondary },
  progressBar: { height: 8, borderRadius: 4, backgroundColor: Colors.borderLight },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  progressHint: { ...Typography.small, color: Colors.textMuted, marginTop: Spacing.xs },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, marginHorizontal: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  statValue: { ...Typography.subtitle, color: Colors.textPrimary, marginTop: Spacing.xs },
  statLabel: { ...Typography.small, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  sinceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.orangeLight, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  sinceText: { ...Typography.bodyBold, color: Colors.primary, marginLeft: Spacing.sm },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.md },
  achievementsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xl },
  achievementCard: { flex: 1, alignItems: 'center', marginHorizontal: Spacing.xs, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  achievementLocked: { opacity: 0.5 },
  achievementImage: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.borderLight },
  achievementName: { ...Typography.small, color: Colors.textPrimary, marginTop: Spacing.xs, textAlign: 'center' },
  lockOverlay: { position: 'absolute', top: Spacing.sm, right: Spacing.sm },
  earnCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  earnTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.md },
  earnRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  earnText: { ...Typography.body, color: Colors.textSecondary, marginLeft: Spacing.md },
});
