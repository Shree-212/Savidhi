import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, Linking, TouchableOpacity,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../theme/colors';
import { chadhavaBookingApi } from '../../services/extra';

/**
 * Shows stage progression + event media for a single chadhava booking.
 * Mirrors PujaStatusScreen but for chadhavas (with offerings list).
 */

const STAGES = ['YET_TO_START', 'LIVE_ADDED', 'SHORT_VIDEO_ADDED', 'SANKALP_VIDEO_ADDED', 'TO_BE_SHIPPED', 'SHIPPED'];
const STAGE_LABEL: Record<string, string> = {
  YET_TO_START: 'Scheduled',
  LIVE_ADDED: 'Live Stream',
  SHORT_VIDEO_ADDED: 'Highlight Video',
  SANKALP_VIDEO_ADDED: 'Sankalp Video',
  TO_BE_SHIPPED: 'Prasad Packing',
  SHIPPED: 'Prasad Shipped',
};

export const ChadhavaStatusScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: { bookingId: string } }, 'params'>>();
  const { bookingId } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await chadhavaBookingApi.getById(bookingId);
      setData(res.data?.data ?? res.data);
    } catch (err: any) {
      console.warn('chadhava booking fetch', err?.response?.data ?? err.message);
    }
  }, [bookingId]);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: Colors.textSecondary }}>Booking not found</Text></View>;

  const stage: string = data.event_stage ?? 'YET_TO_START';
  const stageIdx = STAGES.indexOf(stage);
  const openIfUrl = (url?: string | null) => { if (url) Linking.openURL(url).catch(() => {}); };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={Colors.primary} />}
    >
      {/* Header card */}
      <View style={styles.card}>
        <Text style={styles.title}>{data.chadhava_name ?? 'Chadhava'}</Text>
        <Text style={styles.subtitle}>{data.temple_name ?? ''}</Text>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: Colors.orangeLight }]}>
            <Text style={[styles.pillText, { color: Colors.primary }]}>{data.status}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: data.payment_status === 'PAID' ? Colors.greenLight : Colors.orangeLight }]}>
            <Text style={[styles.pillText, { color: data.payment_status === 'PAID' ? Colors.green : Colors.primary }]}>
              {data.payment_status}
            </Text>
          </View>
        </View>
        <Text style={styles.cost}>₹{Number(data.cost).toLocaleString()}</Text>
      </View>

      {/* Stage timeline */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Stage Progress</Text>
        {STAGES.map((s, i) => {
          const done = i <= stageIdx;
          const active = i === stageIdx;
          return (
            <View key={s} style={styles.stepRow}>
              <View style={[styles.stepBullet, done && styles.stepBulletDone, active && styles.stepBulletActive]}>
                {done && <Icon name="check" size={12} color={Colors.textWhite} />}
              </View>
              <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{STAGE_LABEL[s]}</Text>
            </View>
          );
        })}
      </View>

      {/* Media when stages unlock them */}
      {data.event_live_link && (
        <TouchableOpacity style={styles.mediaCard} onPress={() => openIfUrl(data.event_live_link)}>
          <Icon name="broadcast" size={22} color={Colors.red} />
          <Text style={styles.mediaText}>Watch Live Stream</Text>
          <Icon name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
      {data.event_short_video_url && (
        <TouchableOpacity style={styles.mediaCard} onPress={() => openIfUrl(data.event_short_video_url)}>
          <Icon name="video-outline" size={22} color={Colors.primary} />
          <Text style={styles.mediaText}>Highlight Video</Text>
          <Icon name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
      {data.event_sankalp_video_url && (
        <TouchableOpacity style={styles.mediaCard} onPress={() => openIfUrl(data.event_sankalp_video_url)}>
          <Icon name="account-voice" size={22} color={Colors.green} />
          <Text style={styles.mediaText}>Your Sankalp Video</Text>
          <Icon name="chevron-right" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Offerings */}
      {data.offerings?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Offerings</Text>
          {data.offerings.map((o: any) => (
            <View key={o.id} style={styles.offeringRow}>
              <Text style={styles.offeringName}>{o.item_name ?? o.name}</Text>
              <Text style={styles.offeringQty}>× {o.quantity}</Text>
              <Text style={styles.offeringPrice}>₹{Number(o.unit_price ?? 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Devotees */}
      {data.devotees?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Devotees</Text>
          {data.devotees.map((d: any) => (
            <View key={d.id ?? d.name} style={styles.devoteeRow}>
              <Text style={styles.devoteeName}>{d.name}</Text>
              <Text style={styles.devoteeGotra}>Gotra: {d.gotra}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Shipment */}
      {data.shipment_id && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shipment</Text>
          <Text style={styles.shipText}>Tracking ID: {data.shipment_id}</Text>
          {data.shipment_status && <Text style={styles.shipMeta}>Status: {data.shipment_status}</Text>}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  pillRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: '600' },
  cost: { fontSize: 22, fontWeight: '800', color: Colors.primary, marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: Colors.textSecondary, marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  stepBullet: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepBulletDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  stepBulletActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepLabel: { fontSize: 13, color: Colors.textMuted },
  stepLabelDone: { color: Colors.textPrimary, fontWeight: '600' },
  mediaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.surface, marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  mediaText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  offeringRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  offeringName: { flex: 1, fontSize: 13, color: Colors.textPrimary },
  offeringQty: { fontSize: 12, color: Colors.textMuted, marginHorizontal: 10 },
  offeringPrice: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  devoteeRow: { paddingVertical: 6 },
  devoteeName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  devoteeGotra: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  shipText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  shipMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
});
