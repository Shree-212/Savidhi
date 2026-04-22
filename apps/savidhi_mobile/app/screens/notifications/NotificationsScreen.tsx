import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../theme/colors';
import { notificationsApi, Notification } from '../../services/extra';

const TYPE_ICON: Record<string, { icon: string; color: string }> = {
  BOOKING_UPDATE:  { icon: 'calendar-check',   color: Colors.primary },
  LIVE_STARTED:    { icon: 'broadcast',         color: Colors.red },
  PRASAD_SHIPPED:  { icon: 'package-variant',   color: Colors.green },
  REMINDER:        { icon: 'bell-ring',         color: Colors.orange },
  FAMILY_REQUEST:  { icon: 'account-heart',     color: Colors.primary },
  GENERIC:         { icon: 'bell',              color: Colors.textSecondary },
};

function relativeTime(iso: string): string {
  const now = Date.now();
  const ts = new Date(iso).getTime();
  const s = Math.floor((now - ts) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await notificationsApi.list();
      setItems(res.data.data);
      setUnread(res.data.meta?.unread ?? 0);
    } catch (err: any) {
      console.warn('Failed to load notifications', err?.response?.data ?? err.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleTap = async (n: Notification) => {
    if (!n.read) {
      try { await notificationsApi.markRead(n.id); } catch { /* no-op */ }
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.deep_link?.startsWith('savidhi://')) {
      const path = n.deep_link.replace('savidhi://', '');
      if (path.startsWith('profile/family')) navigation.navigate('Family' as never);
      else if (path.startsWith('booking/puja/')) {
        navigation.navigate('PujaStatus' as never, { bookingId: path.split('/')[2] } as never);
      }
    }
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch (err: any) {
      console.warn('mark all failed', err?.response?.data ?? err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={handleMarkAll}>
            <Text style={styles.markAll}>Mark all read ({unread})</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Icon name="bell-off-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySub}>You’ll see booking updates, live stream alerts, and prasad tracking here.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ic = TYPE_ICON[item.type] ?? TYPE_ICON.GENERIC;
          return (
            <TouchableOpacity style={[styles.row, !item.read && styles.unread]} onPress={() => handleTap(item)}>
              <View style={[styles.iconWrap, { backgroundColor: ic.color + '22' }]}>
                <Icon name={ic.icon} size={20} color={ic.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.rowTime}>{relativeTime(item.created_at)}</Text>
              </View>
              {!item.read && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  markAll: { fontSize: 12, fontWeight: '500', color: Colors.primary },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  unread: { backgroundColor: Colors.orangeLight },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 2 },
  rowBody: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  rowTime: { fontSize: 10, color: Colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
  emptyWrap: { alignItems: 'center', padding: 40, marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 260 },
});
