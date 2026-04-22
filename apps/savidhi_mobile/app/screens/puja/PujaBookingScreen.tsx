import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { pujaService, pujaEventService, pujaBookingService, userService } from '../../services';
import { checkoutBooking } from '../../services/payment';
import { PrimaryButton } from '../../components/shared/PrimaryButton';

interface Props { navigation: any; route: any }

interface Puja {
  id: string;
  name: string;
  templeName: string;
  pricePerDevotee: number;
  price_for_1: number;
  price_for_2: number;
  price_for_4: number;
  price_for_6: number;
  send_hamper: boolean;
}

interface PujaEvent {
  id: string;
  start_time: string;
  pujari_name?: string;
  status: string;
}

const TIERS = [
  { count: 1, field: 'price_for_1' as const },
  { count: 2, field: 'price_for_2' as const },
  { count: 4, field: 'price_for_4' as const },
  { count: 6, field: 'price_for_6' as const },
];

const STEPS = ['Event', 'Devotees', 'Address', 'Review'];

export function PujaBookingScreen({ navigation, route }: Props) {
  const pujaId: string = route.params?.pujaId;

  const [puja, setPuja] = useState<Puja | null>(null);
  const [events, setEvents] = useState<PujaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [eventId, setEventId] = useState<string>('');
  const [devoteeCount, setDevoteeCount] = useState<number>(1);
  const [devotees, setDevotees] = useState<Array<{ name: string; gotra: string; relation: string }>>([
    { name: '', gotra: '', relation: 'Self' },
  ]);
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [sankalp, setSankalp] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [pujaRes, eventsRes, meRes] = await Promise.all([
        pujaService.getById(pujaId),
        pujaEventService.list({ puja_id: pujaId, upcoming: true, limit: 20 }),
        userService.getProfile().catch(() => null),
      ]);
      const raw = pujaRes.data?.data ?? pujaRes.data;
      setPuja({
        id: raw.id,
        name: raw.name,
        templeName: raw.temple_name ?? '',
        pricePerDevotee: Number(raw.price_for_1 ?? 0),
        price_for_1: Number(raw.price_for_1 ?? 0),
        price_for_2: Number(raw.price_for_2 ?? 0),
        price_for_4: Number(raw.price_for_4 ?? 0),
        price_for_6: Number(raw.price_for_6 ?? 0),
        send_hamper: !!raw.send_hamper,
      });
      setEvents(eventsRes.data?.data ?? []);
      if (meRes?.data?.data) {
        const me = meRes.data.data;
        setDevotees([{ name: me.name ?? '', gotra: me.gotra ?? '', relation: 'Self' }]);
      }
    } catch (err) {
      console.warn('PujaBooking load', err);
    } finally {
      setLoading(false);
    }
  }, [pujaId]);

  useEffect(() => { load(); }, [load]);

  // Keep devotees array length in sync with the tier count
  useEffect(() => {
    setDevotees((prev) => {
      if (prev.length === devoteeCount) return prev;
      if (prev.length < devoteeCount) {
        return [...prev, ...Array.from({ length: devoteeCount - prev.length }, () => ({ name: '', gotra: '', relation: '' }))];
      }
      return prev.slice(0, devoteeCount);
    });
  }, [devoteeCount]);

  if (loading || !puja) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const tier = TIERS.find((t) => t.count === devoteeCount) ?? TIERS[0];
  const totalPrice = Number(puja[tier.field] ?? puja.price_for_1);
  const selectedEvent = events.find((e) => e.id === eventId);

  const canAdvance = (s: number): boolean => {
    if (s === 0) return !!eventId;
    if (s === 1) return devotees.every((d) => d.name.trim() && d.gotra.trim());
    if (s === 2) return !puja.send_hamper || address.trim().length > 0;
    return true;
  };

  const next = () => canAdvance(step) && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => (step > 0 ? setStep(step - 1) : navigation.goBack());

  const handlePay = async () => {
    try {
      setSubmitting(true);
      const bookingRes = await pujaBookingService.create({
        puja_event_id: eventId,
        devotee_count: devoteeCount,
        sankalp: sankalp || undefined,
        prasad_delivery_address: puja.send_hamper ? `${address}${pincode ? `, PIN: ${pincode}` : ''}` : undefined,
        devotees: devotees.map((d) => ({ name: d.name.trim(), gotra: d.gotra.trim(), relation: d.relation.trim() || undefined })),
      });
      const booking = bookingRes.data?.data;
      if (!booking?.id) throw new Error('Booking creation failed');

      const result = await checkoutBooking({
        bookingType: 'PUJA',
        bookingId: booking.id,
        amount: Number(booking.cost),
        description: `${puja.name} · ${devoteeCount} devotee${devoteeCount > 1 ? 's' : ''}`,
        prefill: { name: devotees[0]?.name, contact: '' },
      });

      if (result.paid) {
        Alert.alert(
          result.stubbed ? 'Test Payment Successful' : 'Payment Successful',
          `${puja.name} has been booked. Check Bookings tab for updates.`,
          [{ text: 'View Bookings', onPress: () => navigation.navigate('PujaStatus', { bookingId: booking.id }) }],
        );
      } else {
        Alert.alert('Payment not completed', result.error ?? 'Your booking is reserved. Retry payment from Bookings.');
      }
    } catch (err: any) {
      Alert.alert('Booking failed', err?.response?.data?.message ?? err?.message ?? 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={back}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book {puja.name}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Stepper */}
      <View style={styles.stepRow}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= step && styles.activeStepCircle]}>
              <Text style={[styles.stepNum, i <= step && styles.activeStepNum]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i <= step && styles.activeStepLabel]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
      >
        {/* Step 0: pick event */}
        {step === 0 && (
          <View>
            <Text style={styles.sectionTitle}>Pick An Upcoming Event</Text>
            {events.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No upcoming events scheduled for this puja.</Text>
                <Text style={styles.emptySub}>Please check back later or contact support.</Text>
              </View>
            ) : (
              events.map((e) => {
                const d = new Date(e.start_time);
                const active = eventId === e.id;
                return (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => setEventId(e.id)}
                    style={[styles.eventCard, active && styles.eventCardActive]}
                  >
                    <Icon name="calendar-heart" size={22} color={active ? Colors.primary : Colors.textMuted} />
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <Text style={styles.eventDate}>
                        {d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </Text>
                      <Text style={styles.eventMeta}>
                        {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {e.pujari_name && ` · ${e.pujari_name}`}
                      </Text>
                    </View>
                    <Icon name={active ? 'check-circle' : 'circle-outline'} size={22} color={active ? Colors.primary : Colors.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Step 1: devotees */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Number of Devotees</Text>
            <View style={styles.devoteeGrid}>
              {TIERS.map((t) => (
                <TouchableOpacity
                  key={t.count}
                  style={[styles.devoteeCard, devoteeCount === t.count && styles.devoteeCardActive]}
                  onPress={() => setDevoteeCount(t.count)}
                >
                  <Icon name="account-group" size={26} color={devoteeCount === t.count ? Colors.primary : Colors.textMuted} />
                  <Text style={styles.devoteeLabel}>{t.count} Devotee{t.count > 1 ? 's' : ''}</Text>
                  <Text style={[styles.devoteePrice, devoteeCount === t.count && styles.devoteeCardActiveText]}>
                    ₹{Number(puja[t.field] ?? 0).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Devotee Details</Text>
            {devotees.map((d, i) => (
              <View key={i} style={styles.devoteeBox}>
                <Text style={styles.devoteeBoxLabel}>Devotee {i + 1}</Text>
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={d.name}
                    onChangeText={(v) => setDevotees((prev) => prev.map((x, k) => k === i ? { ...x, name: v } : x))}
                    placeholder="Full Name"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={d.gotra}
                    onChangeText={(v) => setDevotees((prev) => prev.map((x, k) => k === i ? { ...x, gotra: v } : x))}
                    placeholder="Gotra"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  value={d.relation}
                  onChangeText={(v) => setDevotees((prev) => prev.map((x, k) => k === i ? { ...x, relation: v } : x))}
                  placeholder="Relation (e.g. Self, Wife)"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            ))}
          </View>
        )}

        {/* Step 2: address */}
        {step === 2 && (
          <View>
            {puja.send_hamper ? (
              <>
                <Text style={styles.sectionTitle}>Prasad Delivery Address</Text>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Full Address"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  value={pincode}
                  onChangeText={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Pincode"
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.textMuted}
                />
              </>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>This puja doesn't ship prasad.</Text>
                <Text style={styles.emptySub}>Skip to the next step.</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Sankalp (optional)</Text>
            <TextInput
              style={[styles.input, { height: 90 }]}
              value={sankalp}
              onChangeText={setSankalp}
              placeholder="For the health and prosperity of my family"
              placeholderTextColor={Colors.textMuted}
              multiline
            />
          </View>
        )}

        {/* Step 3: review */}
        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Review Your Booking</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewItem}>Puja: <Text style={styles.reviewValue}>{puja.name}</Text></Text>
              <Text style={styles.reviewItem}>Temple: <Text style={styles.reviewValue}>{puja.templeName}</Text></Text>
              {selectedEvent && (
                <Text style={styles.reviewItem}>
                  Event: <Text style={styles.reviewValue}>
                    {new Date(selectedEvent.start_time).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </Text>
              )}
              <Text style={styles.reviewItem}>Devotees: <Text style={styles.reviewValue}>{devoteeCount}</Text></Text>
              {puja.send_hamper && (
                <Text style={styles.reviewItem}>Address: <Text style={styles.reviewValue}>{address}{pincode ? `, ${pincode}` : ''}</Text></Text>
              )}
              <View style={styles.reviewDivider} />
              <Text style={styles.reviewTotal}>Total: ₹{totalPrice.toLocaleString()}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.ctaContainer}>
        <PrimaryButton
          title={
            submitting ? 'Processing…' :
            step < STEPS.length - 1 ? `Continue · ₹${totalPrice.toLocaleString()}` :
            `Pay ₹${totalPrice.toLocaleString()}`
          }
          onPress={step < STEPS.length - 1 ? next : handlePay}
          disabled={submitting || !canAdvance(step)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  stepRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  stepItem: { alignItems: 'center', width: 70 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  activeStepCircle: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepNum: { ...Typography.small, color: Colors.textMuted, fontWeight: '700' },
  activeStepNum: { color: Colors.textWhite },
  stepLabel: { ...Typography.small, color: Colors.textMuted, textAlign: 'center' },
  activeStepLabel: { color: Colors.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.md },
  eventCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  eventCardActive: { borderColor: Colors.primary, backgroundColor: Colors.orangeLight },
  eventDate: { ...Typography.bodyBold, color: Colors.textPrimary },
  eventMeta: { ...Typography.small, color: Colors.textSecondary, marginTop: 2 },
  emptyCard: { padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, alignItems: 'center' },
  emptyText: { ...Typography.body, color: Colors.textPrimary, textAlign: 'center' },
  emptySub: { ...Typography.small, color: Colors.textSecondary, textAlign: 'center', marginTop: 4 },
  devoteeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  devoteeCard: { width: '48%', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
  devoteeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.orangeLight },
  devoteeLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
  devoteePrice: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.xs },
  devoteeCardActiveText: { color: Colors.primary },
  devoteeBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.surface },
  devoteeBoxLabel: { ...Typography.small, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.xs },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.body, color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: Spacing.sm },
  reviewCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, backgroundColor: Colors.surface },
  reviewItem: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.xs },
  reviewValue: { color: Colors.textPrimary, fontWeight: '600' },
  reviewDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  reviewTotal: { ...Typography.subtitle, color: Colors.primary, textAlign: 'right', fontWeight: '800' },
  ctaContainer: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
