import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../theme/colors';
import { pujaBookingService, chadhavaBookingService } from '../../services';

interface SubBooking {
  id: string;
  service_type: 'puja' | 'chadhava';        // which API to call on cancel
  service_name: string;                      // puja_name OR chadhava_name
  temple_name: string;
  booking_type: 'ONE_TIME' | 'SUBSCRIPTION';
  cost: number;
  created_at: string;
  event_start_time?: string;
  subscription_remaining?: number;
}

export const CancelRepeatScreen: React.FC = () => {
  const [items, setItems] = useState<SubBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Pull active subscriptions from BOTH puja and chadhava bookings, then
      // merge into a single list keyed by created_at desc so the most recent
      // subs surface first.
      const [pujaRes, chadhavaRes] = await Promise.allSettled([
        pujaBookingService.list(),
        chadhavaBookingService.list(),
      ]);
      const pujaRows = (pujaRes.status === 'fulfilled' ? pujaRes.value.data?.data : []) ?? [];
      const chadhavaRows = (chadhavaRes.status === 'fulfilled' ? chadhavaRes.value.data?.data : []) ?? [];
      const merged: SubBooking[] = [
        ...pujaRows
          .filter((b: any) => b.booking_type === 'SUBSCRIPTION')
          .map((b: any) => ({
            id: b.id,
            service_type: 'puja' as const,
            service_name: b.puja_name ?? 'Puja',
            temple_name: b.temple_name ?? '',
            booking_type: b.booking_type,
            cost: Number(b.cost ?? 0),
            created_at: b.created_at,
            event_start_time: b.event_start_time,
            subscription_remaining: b.subscription_remaining,
          })),
        ...chadhavaRows
          .filter((b: any) => b.booking_type === 'SUBSCRIPTION')
          .map((b: any) => ({
            id: b.id,
            service_type: 'chadhava' as const,
            service_name: b.chadhava_name ?? 'Chadhava',
            temple_name: b.temple_name ?? '',
            booking_type: b.booking_type,
            cost: Number(b.cost ?? 0),
            created_at: b.created_at,
            event_start_time: b.event_start_time,
            subscription_remaining: b.subscription_remaining,
          })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(merged);
    } catch (err: any) {
      console.warn('cancel-repeat load', err?.response?.data ?? err.message);
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  const stopRepeat = (b: SubBooking) => {
    const remaining = b.subscription_remaining ?? 0;
    const message = remaining > 0
      ? `${b.service_name} will no longer book automatically. The next ${remaining} auto-paid event${remaining > 1 ? 's' : ''} will be cancelled. Past bookings stay active.`
      : `${b.service_name} will no longer book automatically. The current booking stays active until completion.`;
    Alert.alert(
      'Stop Subscription?',
      message,
      [
        { text: 'Keep Active', style: 'cancel' },
        {
          text: 'Stop Repeat', style: 'destructive', onPress: async () => {
            try {
              if (b.service_type === 'puja') {
                await pujaBookingService.cancelRepeat(b.id);
              } else {
                await chadhavaBookingService.cancelRepeat(b.id);
              }
              await load();
              Alert.alert('Done', 'Subscription stopped. Your current booking will proceed as scheduled.');
            } catch (err: any) {
              Alert.alert('Failed', err?.response?.data?.message ?? err.message ?? 'Please try again');
            }
          },
        },
      ],
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Active Subscriptions</Text>
        <Text style={styles.subtitle}>Manage repeating puja and chadhava bookings here.</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Icon name="repeat-off" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No active subscriptions</Text>
          <Text style={styles.emptySub}>Choose "Subscribe" on a repeating puja or chadhava when you book to enable auto-renewal.</Text>
        </View>
      ) : (
        items.map((b) => (
          <View key={`${b.service_type}-${b.id}`} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{b.service_name}</Text>
              <Text style={styles.cardMeta}>
                {b.temple_name}
                <Text style={styles.cardTypeTag}>  · {b.service_type === 'puja' ? 'Puja' : 'Chadhava'}</Text>
              </Text>
              {b.event_start_time && (
                <Text style={styles.cardMeta}>
                  Next: {new Date(b.event_start_time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              )}
              <Text style={styles.cardPrice}>
                ₹{Number(b.cost).toLocaleString()} / event
                {b.subscription_remaining != null && (
                  <Text style={styles.cardRemainingTxt}>  · {b.subscription_remaining} left</Text>
                )}
              </Text>
            </View>
            <TouchableOpacity style={styles.stopBtn} onPress={() => stopRepeat(b)}>
              <Icon name="stop-circle-outline" size={20} color={Colors.red} />
              <Text style={styles.stopBtnText}>Stop Repeat</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, marginHorizontal: 16, marginBottom: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  cardMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  cardPrice: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 6 },
  cardTypeTag: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  cardRemainingTxt: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: Colors.red, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  stopBtnText: { fontSize: 11, fontWeight: '600', color: Colors.red },
  emptyWrap: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 260 },
});
