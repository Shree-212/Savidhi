import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { userService, authService } from '../../services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveMediaUrl } from '../../utils';
import type { UserProfile } from '../../data';

interface MenuItemProps {
  icon: string;
  label: string;
  onPress: () => void;
  badge?: string;
  iconColor?: string;
}

function MenuItem({ icon, label, onPress, badge, iconColor = Colors.textPrimary }: MenuItemProps) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Icon name={icon} size={22} color={iconColor} />
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={{ flex: 1 }} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Icon name="chevron-right" size={20} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export function ProfileScreen({ navigation }: { navigation: any }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('savidhi_token');
        if (!token) { setNeedsLogin(true); setLoading(false); return; }
        const res = await userService.getProfile();
        const d = res.data?.data ?? res.data;
        setUser({
          id: d.id,
          name: d.name ?? '',
          phone: d.phone ?? '',
          imageUrl: d.image_url ?? d.profile_pic ?? '',
          level: d.level ?? 1,
          gems: d.gems ?? 0,
          pujaBooked: d.puja_booked ?? d.pujas_booked ?? 0,
          appointments: d.appointments ?? 0,
          pujaForOthers: d.puja_for_others ?? 0,
          devoteeSince: d.devotee_since ?? d.created_at ?? '',
          achievements: [],
        });
      } catch (err: any) {
        if (err?.response?.status === 401) { setNeedsLogin(true); }
        else { console.error('ProfileScreen fetch error:', err); }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (err) {
      console.error('ProfileScreen logout error:', err);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  if (needsLogin) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl }]}>
        <Icon name="account-lock" size={64} color={Colors.textMuted} />
        <Text style={[Typography.subtitle, { color: Colors.textPrimary, marginTop: Spacing.lg, textAlign: 'center' }]}>Login to view your profile</Text>
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
      <Text style={styles.heading}>Profile</Text>

      {/* User Card */}
      <View style={styles.userCard}>
        <Image source={{ uri: resolveMediaUrl(user.imageUrl) }} style={styles.avatar} />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userPhone}>{user.phone}</Text>
        </View>
        <TouchableOpacity>
          <Icon name="pencil" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.pujaBooked}</Text>
          <Text style={styles.statLabel}>Pujas</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.appointments}</Text>
          <Text style={styles.statLabel}>Appointments</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{user.gems}</Text>
          <Text style={styles.statLabel}>Gems</Text>
        </View>
      </View>

      {/* Menu Sections */}
      <Text style={styles.sectionTitle}>Bookings</Text>
      <View style={styles.menuSection}>
        <MenuItem icon="fire" label="Puja Bookings" badge={String(user.pujaBooked)} onPress={() => navigation.navigate('PujaBookings')} />
        <MenuItem icon="account-clock-outline" label="Appointment Bookings" badge={String(user.appointments)} onPress={() => navigation.navigate('AppointmentBookings')} />
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.menuSection}>
        <MenuItem icon="account-group" label="Family Mode" onPress={() => {}} />
        <MenuItem icon="map-marker" label="Saved Addresses" onPress={() => {}} />
        <MenuItem icon="credit-card-outline" label="Payment Methods" onPress={() => {}} />
      </View>

      <Text style={styles.sectionTitle}>App Settings</Text>
      <View style={styles.menuSection}>
        <MenuItem icon="bell-outline" label="Notifications" onPress={() => {}} />
        <MenuItem icon="translate" label="Language" onPress={() => {}} />
        <MenuItem icon="shield-check-outline" label="Privacy" onPress={() => {}} />
      </View>

      <Text style={styles.sectionTitle}>Support</Text>
      <View style={styles.menuSection}>
        <MenuItem icon="help-circle-outline" label="Help & FAQ" onPress={() => {}} />
        <MenuItem icon="message-text-outline" label="Contact Us" onPress={() => {}} />
        <MenuItem icon="information-outline" label="About" onPress={() => {}} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Icon name="logout" size={20} color={Colors.red} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.xxxl },
  heading: { ...Typography.heading, color: Colors.textPrimary, marginBottom: Spacing.xl },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.borderLight },
  userInfo: { flex: 1, marginLeft: Spacing.md },
  userName: { ...Typography.subtitle, color: Colors.textPrimary },
  userPhone: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.subtitle, color: Colors.primary },
  statLabel: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  divider: { width: 1, backgroundColor: Colors.border },
  sectionTitle: { ...Typography.bodyBold, color: Colors.textSecondary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  menuSection: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuLabel: { ...Typography.body, color: Colors.textPrimary, marginLeft: Spacing.md },
  badge: { backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, marginRight: Spacing.sm },
  badgeText: { ...Typography.small, color: Colors.textWhite, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, marginTop: Spacing.lg },
  logoutText: { ...Typography.bodyBold, color: Colors.red, marginLeft: Spacing.sm },
  version: { ...Typography.small, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
});
