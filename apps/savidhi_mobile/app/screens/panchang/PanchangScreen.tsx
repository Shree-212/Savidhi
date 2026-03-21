import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { ChipToggle } from '../../components/shared/ChipToggle';
import { panchangService } from '../../services';
import { PanchangData } from '../../data/models';

const TABS = [
  { key: 'panchang', label: 'Panchang', icon: 'star-four-points' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar-month' },
];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function labelFromStr(str: string): string {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function PanchangScreen({ navigation }: { navigation: any }) {
  const [tab, setTab] = useState('panchang');
  const [dateStr, setDateStr] = useState<string>(toDateStr(new Date()));
  const [panchang, setPanchang] = useState<PanchangData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPanchang = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await panchangService.get({ date });
      if (res.data?.success && res.data?.data) {
        setPanchang(res.data.data as PanchangData);
      } else {
        throw new Error('Invalid response');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load panchang');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPanchang(dateStr);
  }, [dateStr, fetchPanchang]);

  function changeDate(delta: number) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const next = new Date(y, m - 1, d + delta);
    setDateStr(toDateStr(next));
  }

  const p = panchang;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <ChipToggle options={TABS} selected={tab} onSelect={setTab} />
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Date Nav */}
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => changeDate(-1)}>
            <Icon name="skip-previous" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <View style={styles.dateBadge}>
            <Icon name="calendar" size={16} color={Colors.primary} />
            <Text style={styles.dateText}>{labelFromStr(dateStr)}</Text>
          </View>
          <TouchableOpacity onPress={() => changeDate(1)}>
            <Icon name="skip-next" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading panchang…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchPanchang(dateStr)}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {!loading && !error && p && (
          <>
            {/* Panchang Info */}
            <View style={styles.panchangHeader}>
              <Icon name="calendar-month-outline" size={20} color={Colors.primary} />
              <View style={{ marginLeft: Spacing.sm }}>
                <Text style={styles.panchangDate}>{p.date}</Text>
                <Text style={styles.panchangDay}>{p.day}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.panchangTithi}>{p.tithi}</Text>
                {p.nakshatra ? <Text style={styles.nakshatraText}>{p.nakshatra}</Text> : null}
              </View>
              <View style={styles.locationRow}>
                <Icon name="map-marker" size={12} color={Colors.green} />
                <Text style={styles.locationText}>{p.location}</Text>
              </View>
            </View>

            {/* Festival */}
            {p.festivals.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Festival</Text>
                {p.festivals.map((f, i) => (
                  <Text key={i} style={styles.bullet}>• {f}</Text>
                ))}
              </View>
            )}

            {/* Auspicious */}
            <View style={[styles.section, styles.auspiciousSection]}>
              <Text style={styles.sectionTitle}>Auspicious Time</Text>
              {p.auspiciousTimes.map((t, i) => (
                <View key={i} style={styles.timeRow}>
                  <Text style={[styles.timeName, { color: Colors.auspicious }]}>{t.name}</Text>
                  <Text style={styles.timeValue}>{t.time}</Text>
                </View>
              ))}
            </View>

            {/* Inauspicious */}
            <View style={[styles.section, styles.inauspiciousSection]}>
              <Text style={styles.sectionTitle}>Inauspicious Time</Text>
              {p.inauspiciousTimes.map((t, i) => (
                <View key={i} style={styles.timeRow}>
                  <Text style={[styles.timeName, { color: Colors.inauspicious }]}>{t.name}</Text>
                  <Text style={styles.timeValue}>{t.time}</Text>
                </View>
              ))}
            </View>

            {/* Sun/Moon */}
            <View style={styles.sunMoonRow}>
              <View style={styles.sunMoonCard}>
                <Icon name="white-balance-sunny" size={28} color={Colors.primary} />
                <Text style={styles.sunMoonLabel}>Rise: {p.sunrise}</Text>
                <Text style={styles.sunMoonLabel}>Set: {p.sunset}</Text>
              </View>
              <View style={styles.sunMoonCard}>
                <Icon name="moon-waning-crescent" size={28} color={Colors.primary} />
                <Text style={styles.sunMoonLabel}>Rise: {p.moonrise}</Text>
                <Text style={styles.sunMoonLabel}>Set: {p.moonset}</Text>
              </View>
            </View>

            {/* Karna */}
            {p.karna.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Karana</Text>
                {p.karna.map((k, i) => (
                  <View key={i} style={styles.timeRow}>
                    <Text style={[styles.timeName, { color: Colors.textPrimary, fontWeight: '600' }]}>{k.name}</Text>
                    <Text style={styles.timeValue}>{k.time}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Yoga */}
            {p.yoga.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Yoga</Text>
                {p.yoga.map((y, i) => (
                  <View key={i} style={styles.timeRow}>
                    <Text style={[styles.timeName, { color: Colors.textPrimary, fontWeight: '600' }]}>{y.name}</Text>
                    <Text style={styles.timeValue}>{y.time}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md,
  },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  dateBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.orangeLight, borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    marginHorizontal: Spacing.lg,
  },
  dateText: { ...Typography.bodyBold, color: Colors.primary, marginLeft: Spacing.xs },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  centered: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.sm },
  errorBox: {
    borderWidth: 1, borderColor: Colors.redLight, backgroundColor: '#FFFAFA',
    borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center',
  },
  errorText: { ...Typography.body, color: Colors.inauspicious, marginBottom: Spacing.sm },
  retryText: { ...Typography.body, color: Colors.primary, textDecorationLine: 'underline' },
  panchangHeader: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
    marginBottom: Spacing.lg,
  },
  panchangDate: { ...Typography.subtitle, color: Colors.textPrimary },
  panchangDay: { ...Typography.caption, color: Colors.textSecondary },
  panchangTithi: { ...Typography.bodyBold, color: Colors.textPrimary },
  nakshatraText: { ...Typography.caption, color: Colors.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.sm },
  locationText: { ...Typography.small, color: Colors.green, marginLeft: 2 },
  section: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  auspiciousSection: { borderColor: Colors.greenLight, backgroundColor: '#FAFFF5' },
  inauspiciousSection: { borderColor: Colors.redLight, backgroundColor: '#FFFAFA' },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.sm },
  bullet: { ...Typography.body, color: Colors.textSecondary, marginBottom: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  timeName: { ...Typography.body },
  timeValue: { ...Typography.caption, color: Colors.textSecondary },
  sunMoonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  sunMoonCard: {
    flex: 1, borderWidth: 1, borderColor: Colors.border,
    borderRadius: BorderRadius.md, padding: Spacing.lg,
    alignItems: 'center', marginHorizontal: Spacing.xs,
  },
  sunMoonLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
});
