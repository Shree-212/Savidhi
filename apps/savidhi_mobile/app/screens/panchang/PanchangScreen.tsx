import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { MOCK_PANCHANG } from '../../data';
import { ChipToggle } from '../../components/shared/ChipToggle';

const TABS = [
  { key: 'panchang', label: 'Panchang', icon: 'star-four-points' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar-month' },
];

export function PanchangScreen({ navigation }: { navigation: any }) {
  const [tab, setTab] = useState('panchang');
  const p = MOCK_PANCHANG;

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
          <TouchableOpacity><Icon name="skip-previous" size={22} color={Colors.primary} /></TouchableOpacity>
          <View style={styles.dateBadge}>
            <Icon name="calendar" size={16} color={Colors.primary} />
            <Text style={styles.dateText}>{p.date}</Text>
          </View>
          <TouchableOpacity><Icon name="skip-next" size={22} color={Colors.primary} /></TouchableOpacity>
        </View>

        {/* Panchang Info */}
        <View style={styles.panchangHeader}>
          <Icon name="calendar-month-outline" size={20} color={Colors.primary} />
          <View style={{ marginLeft: Spacing.sm }}>
            <Text style={styles.panchangDate}>{p.date}</Text>
            <Text style={styles.panchangDay}>{p.day}</Text>
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.panchangTithi}>{p.tithi}</Text>
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={12} color={Colors.green} />
            <Text style={styles.locationText}>{p.location}</Text>
          </View>
        </View>

        {/* Festival */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Festival</Text>
          {p.festivals.map((f, i) => <Text key={i} style={styles.bullet}>• {f}</Text>)}
        </View>

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
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Karna</Text>
          {p.karna.map((k, i) => (
            <View key={i} style={styles.timeRow}>
              <Text style={[styles.timeName, { color: Colors.textPrimary, fontWeight: '600' }]}>{k.name}</Text>
              <Text style={styles.timeValue}>{k.time}</Text>
            </View>
          ))}
        </View>

        {/* Yoga */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yoga</Text>
          {p.yoga.map((y, i) => (
            <View key={i} style={styles.timeRow}>
              <Text style={[styles.timeName, { color: Colors.textPrimary, fontWeight: '600' }]}>{y.name}</Text>
              <Text style={styles.timeValue}>{y.time}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  dateBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.orangeLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, marginHorizontal: Spacing.lg },
  dateText: { ...Typography.bodyBold, color: Colors.primary, marginLeft: Spacing.xs },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  panchangHeader: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: Spacing.lg },
  panchangDate: { ...Typography.subtitle, color: Colors.textPrimary },
  panchangDay: { ...Typography.caption, color: Colors.textSecondary },
  panchangTithi: { ...Typography.bodyBold, color: Colors.textPrimary },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginLeft: Spacing.sm },
  locationText: { ...Typography.small, color: Colors.green, marginLeft: 2 },
  section: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.md },
  auspiciousSection: { borderColor: Colors.greenLight, backgroundColor: '#FAFFF5' },
  inauspiciousSection: { borderColor: Colors.redLight, backgroundColor: '#FFFAFA' },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.sm },
  bullet: { ...Typography.body, color: Colors.textSecondary, marginBottom: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  timeName: { ...Typography.body },
  timeValue: { ...Typography.caption, color: Colors.textSecondary },
  sunMoonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  sunMoonCard: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginHorizontal: Spacing.xs },
  sunMoonLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
});
