import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../theme/colors';
import api from '../../services/api';

/**
 * Shows shipment tracking for either a puja or chadhava booking.
 * Route params: { bookingId, bookingType: 'PUJA' | 'CHADHAVA' }
 */

const MOCK_EVENTS = [
  { status: 'ORDERED', label: 'Order Placed', by: 'Savidhi' },
  { status: 'PACKED', label: 'Prasad Packed', by: 'Temple Office' },
  { status: 'PICKED_UP', label: 'Picked up by Courier', by: 'ShipRocket' },
  { status: 'IN_TRANSIT', label: 'In Transit', by: 'ShipRocket' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', by: 'Local Courier' },
  { status: 'DELIVERED', label: 'Delivered', by: 'Recipient' },
];

export const TrackPackageScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: { bookingId: string; bookingType: 'PUJA' | 'CHADHAVA' } }, 'params'>>();
  const { bookingId, bookingType } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const path = bookingType === 'PUJA' ? 'puja-bookings' : 'chadhava-bookings';
      const res = await api.get(`/bookings/${path}/${bookingId}`);
      setBooking(res.data?.data ?? res.data);
    } catch (err: any) {
      console.warn('track fetch', err?.response?.data ?? err.message);
    }
  }, [bookingId, bookingType]);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!booking) return <View style={styles.center}><Text style={{ color: Colors.textSecondary }}>Booking not found</Text></View>;

  const shipmentId = booking.shipment_id;
  const shipmentStatus = booking.shipment_status ?? (booking.event_stage === 'SHIPPED' ? 'IN_TRANSIT' : 'NOT_YET_SHIPPED');
  const currentIdx = MOCK_EVENTS.findIndex((e) => e.status === shipmentStatus);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Track Prasad Shipment</Text>
        <Text style={styles.subtitle}>{booking.puja_name ?? booking.chadhava_name}</Text>
        {shipmentId ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Tracking ID</Text>
            <View style={styles.trackingRow}>
              <Text style={styles.trackingId}>{shipmentId}</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://shiprocket.co/tracking/${shipmentId}`).catch(() => {})}
                style={styles.trackBtn}
              >
                <Text style={styles.trackBtnText}>Open on ShipRocket</Text>
                <Icon name="open-in-new" size={14} color={Colors.textWhite} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyShipment}>
            <Icon name="package-variant-closed" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Not yet shipped</Text>
            <Text style={styles.emptySub}>You’ll see tracking details here once the admin marks the puja as SHIPPED.</Text>
          </View>
        )}
      </View>

      {shipmentId && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {MOCK_EVENTS.map((e, i) => {
            const done = currentIdx >= 0 && i <= currentIdx;
            const active = i === currentIdx;
            return (
              <View key={e.status} style={styles.eventRow}>
                <View style={[styles.eventBullet, done && styles.eventBulletDone, active && styles.eventBulletActive]}>
                  {done && <Icon name="check" size={10} color={Colors.textWhite} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventLabel, done && styles.eventLabelDone]}>{e.label}</Text>
                  <Text style={styles.eventBy}>{e.by}</Text>
                </View>
              </View>
            );
          })}
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
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  label: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 6 },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  trackingId: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, flex: 1, fontFamily: 'Courier' },
  trackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  trackBtnText: { color: Colors.textWhite, fontSize: 12, fontWeight: '600' },
  emptyShipment: { alignItems: 'center', padding: 20, marginTop: 12 },
  emptyText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginTop: 10 },
  emptySub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: Colors.textSecondary, marginBottom: 12 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  eventBullet: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  eventBulletDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  eventBulletActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  eventLabel: { fontSize: 14, color: Colors.textMuted },
  eventLabelDone: { color: Colors.textPrimary, fontWeight: '600' },
  eventBy: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
