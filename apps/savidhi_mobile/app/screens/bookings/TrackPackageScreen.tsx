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

// Lifecycle aligned with backend mapShiprocketStatus() in
// services/booking-service/src/lib/shiprocket.ts. The timeline lights up each
// stage as the booking's shipment_status reaches or passes it.
const TIMELINE_STAGES: Array<{ status: string; label: string; by: string }> = [
  { status: 'NEW',              label: 'Order Created',         by: 'Savidhi' },
  { status: 'AWB_ASSIGNED',     label: 'Tracking ID Assigned',  by: 'Shiprocket' },
  { status: 'PICKUP_SCHEDULED', label: 'Pickup Scheduled',      by: 'Shiprocket' },
  { status: 'PICKED_UP',        label: 'Picked up by Courier',  by: 'Courier' },
  { status: 'IN_TRANSIT',       label: 'In Transit',            by: 'Courier' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery',      by: 'Local Courier' },
  { status: 'DELIVERED',        label: 'Delivered',             by: 'Recipient' },
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

  // AWB is the canonical tracking id once Shiprocket assigns it. We fall back
  // to the legacy shipment_id column for older rows that pre-date the
  // structured columns from migration 024.
  const awb = booking.sr_awb_code ?? booking.shipment_id ?? null;
  const courier = booking.sr_courier_name ?? null;
  const eta = booking.sr_expected_delivery ?? null;
  const shipmentStatus =
    booking.shipment_status ?? (booking.event_stage === 'SHIPPED' ? 'IN_TRANSIT' : null);
  const currentIdx = shipmentStatus ? TIMELINE_STAGES.findIndex((e) => e.status === shipmentStatus) : -1;
  const trackingUrl = awb ? `https://shiprocket.co/tracking/${awb}` : null;
  const errored = shipmentStatus === 'NDR' || shipmentStatus === 'RTO_INITIATED' || shipmentStatus === 'RTO_DELIVERED';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Track Prasad Shipment</Text>
        <Text style={styles.subtitle}>{booking.puja_name ?? booking.chadhava_name}</Text>
        {awb ? (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.label}>Tracking ID (AWB)</Text>
            <View style={styles.trackingRow}>
              <Text style={styles.trackingId}>{awb}</Text>
              {trackingUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(trackingUrl).catch(() => {})}
                  style={styles.trackBtn}
                >
                  <Text style={styles.trackBtnText}>Track</Text>
                  <Icon name="open-in-new" size={14} color={Colors.textWhite} />
                </TouchableOpacity>
              )}
            </View>
            {(courier || eta) && (
              <Text style={[styles.eventBy, { marginTop: 8 }]}>
                {courier ? `Courier: ${courier}` : ''}
                {courier && eta ? '  ·  ' : ''}
                {eta ? `Expected: ${new Date(eta).toLocaleDateString()}` : ''}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyShipment}>
            <Icon name="package-variant-closed" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>Not yet shipped</Text>
            <Text style={styles.emptySub}>You’ll see tracking details here once the temple ships your prasad.</Text>
          </View>
        )}
      </View>

      {awb && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {TIMELINE_STAGES.map((e, i) => {
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
          {errored && (
            <View style={{ marginTop: 8, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: '#B91C1C', fontWeight: '600' }}>
                {shipmentStatus === 'NDR' ? 'Delivery attempt failed' : 'Return to origin'}
              </Text>
              <Text style={{ fontSize: 11, color: '#7F1D1D', marginTop: 2 }}>
                Please contact support at the temple office to resolve.
              </Text>
            </View>
          )}
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
