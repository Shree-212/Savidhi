import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { astrologerService, appointmentService } from '../../services';
import { PrimaryButton } from '../../components/shared/PrimaryButton';
import type { Astrologer, AppointmentDuration, DurationOption } from '../../data';

interface Props { navigation: any; route: any; }

export function BookAppointmentScreen({ navigation, route }: Props) {
  const [astro, setAstro] = useState<Astrologer | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<AppointmentDuration>('15min');
  const [durationOptions, setDurationOptions] = useState<DurationOption[]>([]);

  useEffect(() => {
    const astrologerId = route.params?.astrologerId;
    if (!astrologerId) return;
    (async () => {
      try {
        const res = await astrologerService.getById(astrologerId);
        const d = res.data?.data ?? res.data;
        const mapped: Astrologer = {
          id: d.id,
          name: d.name,
          specialty: d.designation ?? '',
          experience: '',
          pricePerMin: d.price_15min ?? 0,
          imageUrl: d.profile_pic ?? '',
          images: d.slider_images ?? [],
          appointmentsBooked: 0,
          languages: d.languages ?? [],
          expertise: d.expertise ?? [],
          about: d.about ?? '',
          isBookmarked: false,
        };
        setAstro(mapped);
        setDurationOptions([
          { key: '15min', label: '15 Min', price: d.price_15min ?? 0 },
          { key: '30min', label: '30 Min', price: d.price_30min ?? 0 },
          { key: '1hour', label: '1 Hour', price: d.price_1hour ?? 0 },
          { key: '2hour', label: '2 Hour', price: d.price_2hour ?? 0 },
        ]);
      } catch (err) {
        console.error('BookAppointmentScreen fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params?.astrologerId]);

  if (loading || !astro) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const price = durationOptions.find((d) => d.key === selected)?.price || 0;

  const handleBook = async () => {
    setSubmitting(true);
    try {
      await appointmentService.create({
        astrologer_id: astro.id,
        duration: selected,
        scheduled_at: new Date().toISOString(),
        devotee_name: '',
      });
      Alert.alert('Success', 'Appointment booked!');
      navigation.goBack();
    } catch (err) {
      console.error('BookAppointmentScreen booking error:', err);
      Alert.alert('Error', 'Failed to book appointment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{astro.name}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Select Time Duration</Text>
        <View style={styles.grid}>
          {durationOptions.map((dur) => (
            <TouchableOpacity
              key={dur.key}
              style={[styles.durCard, selected === dur.key && styles.durCardActive]}
              onPress={() => setSelected(dur.key)}
            >
              <Icon name="clock-outline" size={28} color={selected === dur.key ? Colors.primary : Colors.textMuted} />
              <Text style={styles.durLabel}>{dur.label}</Text>
              <Text style={[styles.durPrice, selected === dur.key && { color: Colors.primary }]}>₹ {dur.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.ctaContainer}>
        <PrimaryButton title={`Book For ₹${price}`} onPress={handleBook} disabled={submitting} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.lg, marginTop: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  durCard: { width: '48%', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
  durCardActive: { borderColor: Colors.primary, backgroundColor: Colors.orangeLight },
  durLabel: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.sm },
  durPrice: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: 4 },
  ctaContainer: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
