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
  // Subscription rollout Phase A — the puja's booking_mode locks the
  // booking_type picker on the customer side. 'BOTH' shows the toggle.
  booking_mode: 'ONE_TIME' | 'SUBSCRIPTION' | 'BOTH';
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
  // Subscription Phase A — mirrors the web booking page.
  const [bookingType, setBookingType] = useState<'ONE_TIME' | 'SUBSCRIPTION'>('ONE_TIME');
  const [subscriptionCount, setSubscriptionCount] = useState<number>(4);
  const [devotees, setDevotees] = useState<Array<{ name: string; gotra: string; relation: string }>>([
    { name: '', gotra: '', relation: 'Self' },
  ]);
  // Structured shipping address — required by the Shiprocket integration
  // when puja.send_hamper is true. Backend builds the legacy
  // prasad_delivery_address text on insert from these fields, so older
  // consumers keep working without us sending it from the client.
  const [shipToName, setShipToName] = useState('');
  const [shipToPhone, setShipToPhone] = useState('');
  const [shipToLine1, setShipToLine1] = useState('');
  const [shipToLine2, setShipToLine2] = useState('');
  const [shipToCity, setShipToCity] = useState('');
  const [shipToState, setShipToState] = useState('');
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
        booking_mode: (raw.booking_mode ?? 'ONE_TIME') as Puja['booking_mode'],
      });
      // Honour the puja's booking_mode: lock the type when restricted, else
      // default to ONE_TIME and let the user toggle on the Event step.
      if (raw.booking_mode === 'SUBSCRIPTION') setBookingType('SUBSCRIPTION');
      else if (raw.booking_mode === 'ONE_TIME') setBookingType('ONE_TIME');
      setEvents(eventsRes.data?.data ?? []);
      if (meRes?.data?.data) {
        const me = meRes.data.data;
        setDevotees([{ name: me.name ?? '', gotra: me.gotra ?? '', relation: 'Self' }]);
        // Pre-fill structured ship-to fields from profile so devotees aren't
        // forced to retype their name/phone for every booking.
        setShipToName((prev) => prev || me.name || '');
        setShipToPhone((prev) => prev || (me.phone ? String(me.phone).replace(/\D/g, '').slice(-10) : ''));
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
    if (s === 2) {
      if (!puja.send_hamper) return true;
      // Structured fields required; pincode 6 digits; phone 10 digits.
      if (!shipToName.trim() || !shipToLine1.trim() || !shipToCity.trim() || !shipToState.trim()) return false;
      if (pincode.length !== 6) return false;
      if (shipToPhone.replace(/\D/g, '').length !== 10) return false;
      return true;
    }
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
        // Structured shipping fields — backend builds the legacy
        // prasad_delivery_address string server-side from these.
        ...(puja.send_hamper ? {
          ship_to_name: shipToName.trim(),
          ship_to_phone: shipToPhone.replace(/\D/g, '').slice(-10),
          ship_to_line1: shipToLine1.trim(),
          ship_to_line2: shipToLine2.trim() || undefined,
          ship_to_city: shipToCity.trim(),
          ship_to_state: shipToState.trim(),
          ship_to_pincode: pincode,
          ship_to_country: 'India',
        } : {}),
        devotees: devotees.map((d) => ({ name: d.name.trim(), gotra: d.gotra.trim(), relation: d.relation.trim() || undefined })),
        booking_type: bookingType,
        ...(bookingType === 'SUBSCRIPTION' ? { subscription_count: subscriptionCount } : {}),
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
            {/* Subscription Phase A — booking_type toggle (BOTH only),
                count picker, and a locked-mode banner. */}
            {puja.booking_mode === 'BOTH' && (
              <View style={styles.subSection}>
                <Text style={styles.subLabel}>Booking Type</Text>
                <View style={styles.subToggleRow}>
                  {(['ONE_TIME', 'SUBSCRIPTION'] as const).map((opt) => {
                    const active = bookingType === opt;
                    return (
                      <TouchableOpacity
                        key={opt}
                        onPress={() => setBookingType(opt)}
                        style={[styles.subToggleBtn, active && styles.subToggleBtnActive]}
                      >
                        <Text style={[styles.subToggleTxt, active && styles.subToggleTxtActive]}>
                          {opt === 'ONE_TIME' ? 'One Time' : 'Subscription'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {puja.booking_mode === 'SUBSCRIPTION' && (
              <View style={styles.subBanner}>
                <Text style={styles.subBannerTxt}>
                  This puja is subscription-only. You&apos;ll be auto-billed for the next N upcoming events.
                </Text>
              </View>
            )}

            {bookingType === 'SUBSCRIPTION' && (
              <View style={styles.subSection}>
                <Text style={styles.subLabel}>Number of events to auto-pay for</Text>
                <View style={styles.subCountRow}>
                  <TouchableOpacity
                    onPress={() => setSubscriptionCount((n) => Math.max(2, n - 1))}
                    style={styles.subCountBtn}
                  >
                    <Text style={styles.subCountBtnTxt}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.subCountValue}>{subscriptionCount}</Text>
                  <TouchableOpacity
                    onPress={() => setSubscriptionCount((n) => Math.min(12, n + 1))}
                    style={styles.subCountBtn}
                  >
                    <Text style={styles.subCountBtnTxt}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.subCountHelp}>events (2–12)</Text>
                </View>
              </View>
            )}

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
                  value={shipToName}
                  onChangeText={setShipToName}
                  placeholder="Recipient Full Name"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={shipToPhone}
                  onChangeText={(v) => setShipToPhone(v.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit Phone Number"
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={shipToLine1}
                  onChangeText={setShipToLine1}
                  placeholder="Address Line 1 (house no., street)"
                  placeholderTextColor={Colors.textMuted}
                />
                <TextInput
                  style={styles.input}
                  value={shipToLine2}
                  onChangeText={setShipToLine2}
                  placeholder="Address Line 2 (apartment, landmark — optional)"
                  placeholderTextColor={Colors.textMuted}
                />
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={shipToCity}
                    onChangeText={setShipToCity}
                    placeholder="City"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={shipToState}
                    onChangeText={setShipToState}
                    placeholder="State"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  value={pincode}
                  onChangeText={(v) => setPincode(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit Pincode"
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
              {bookingType === 'SUBSCRIPTION' && (
                <Text style={styles.reviewItem}>Auto-pay for: <Text style={styles.reviewValue}>{subscriptionCount} events</Text></Text>
              )}
              {puja.send_hamper && (
                <Text style={styles.reviewItem}>
                  Address: <Text style={styles.reviewValue}>
                    {[shipToName, shipToLine1, shipToLine2, shipToCity, shipToState, pincode].filter(Boolean).join(', ')}
                  </Text>
                </Text>
              )}
              <View style={styles.reviewDivider} />
              <Text style={styles.reviewTotal}>
                {bookingType === 'SUBSCRIPTION'
                  ? `Pay today (event 1 of ${subscriptionCount}): ₹${totalPrice.toLocaleString()}`
                  : `Total: ₹${totalPrice.toLocaleString()}`}
              </Text>
              {bookingType === 'SUBSCRIPTION' && (
                <Text style={styles.reviewSubscriptionNote}>
                  Auto-debit ₹{totalPrice.toLocaleString()} for the next {subscriptionCount - 1} events. Cancel anytime from Bookings.
                </Text>
              )}
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
  reviewSubscriptionNote: { ...Typography.small, color: Colors.textMuted, textAlign: 'right', marginTop: Spacing.xs },
  // Subscription Phase A styles
  subSection: { marginBottom: Spacing.md },
  subLabel: { ...Typography.small, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  subToggleRow: { flexDirection: 'row', gap: Spacing.sm },
  subToggleBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
  subToggleBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight ?? Colors.surface },
  subToggleTxt: { ...Typography.body, color: Colors.textSecondary, fontWeight: '600' },
  subToggleTxtActive: { color: Colors.primary },
  subBanner: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primaryLight ?? Colors.surface, marginBottom: Spacing.md },
  subBannerTxt: { ...Typography.small, color: Colors.primary },
  subCountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  subCountBtn: { width: 40, height: 40, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  subCountBtnTxt: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  subCountValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, minWidth: 36, textAlign: 'center' },
  subCountHelp: { ...Typography.small, color: Colors.textMuted },
  ctaContainer: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
