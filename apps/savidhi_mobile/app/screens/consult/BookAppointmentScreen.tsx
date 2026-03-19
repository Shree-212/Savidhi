import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { DURATION_OPTIONS, MOCK_ASTROLOGERS } from '../../data';
import { PrimaryButton } from '../../components/shared/PrimaryButton';
import type { AppointmentDuration } from '../../data';

interface Props { navigation: any; route: any; }

export function BookAppointmentScreen({ navigation, route }: Props) {
  const astro = MOCK_ASTROLOGERS.find((a) => a.id === route.params?.astrologerId) || MOCK_ASTROLOGERS[0];
  const [selected, setSelected] = useState<AppointmentDuration>('15min');
  const price = DURATION_OPTIONS.find((d) => d.key === selected)?.price || 150;

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
          {DURATION_OPTIONS.map((dur) => (
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
        <PrimaryButton title={`Book For ₹${price}`} onPress={() => navigation.goBack()} />
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
