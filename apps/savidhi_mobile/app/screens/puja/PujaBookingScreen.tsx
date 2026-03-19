import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { MOCK_PUJAS } from '../../data';
import { PrimaryButton } from '../../components/shared/PrimaryButton';

interface Props { navigation: any; route: any; }

const DEVOTEE_OPTIONS = [
  { count: 1, label: '1 Devotee' },
  { count: 2, label: '2 Devotee' },
  { count: 4, label: '4 Devotee' },
  { count: 6, label: '6 Devotee' },
];

export function PujaBookingScreen({ navigation, route }: Props) {
  const puja = MOCK_PUJAS.find((p) => p.id === route.params?.pujaId) || MOCK_PUJAS[0];
  const [step, setStep] = useState(0);
  const [devoteeCount, setDevoteeCount] = useState(1);
  const [name, setName] = useState('');
  const [gotra, setGotra] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');

  const totalPrice = devoteeCount * puja.pricePerDevotee;

  const stepLabels = ['SELECT\nPUJA', 'DEVOTEE\nDETAILS', 'MAKE\nPAYMENT', 'SANKALP\nFORM'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Puja Details</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Step Indicators */}
      <View style={styles.stepRow}>
        {stepLabels.map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.stepCircle, i <= step && styles.activeStepCircle]}>
              <Text style={[styles.stepNum, i <= step && styles.activeStepNum]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i <= step && styles.activeStepLabel]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {step === 0 && (
          <View>
            <Text style={styles.sectionTitle}>Select Number Of Devotees</Text>
            <View style={styles.devoteeGrid}>
              {DEVOTEE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.count}
                  style={[styles.devoteeCard, devoteeCount === opt.count && styles.devoteeCardActive]}
                  onPress={() => setDevoteeCount(opt.count)}
                >
                  <Icon name="account" size={28} color={devoteeCount === opt.count ? Colors.primary : Colors.textMuted} />
                  <Text style={styles.devoteeLabel}>{opt.label}</Text>
                  <Text style={[styles.devoteePrice, devoteeCount === opt.count && styles.devoteeCardActiveText]}>
                    ₹ {opt.count * puja.pricePerDevotee}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Contact Details</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Smita Bhardwaj" placeholderTextColor={Colors.textMuted} />
            <Text style={styles.inputLabel}>Gotra</Text>
            <TextInput style={styles.input} value={gotra} onChangeText={setGotra} placeholder="Kashyap" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.sectionTitle}>Prasad Delivery Address</Text>
            <View style={styles.addressRow}>
              <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} value={houseNo} onChangeText={setHouseNo} placeholder="H.B 991" placeholderTextColor={Colors.textMuted} />
              <TextInput style={[styles.input, { flex: 1 }]} value={pincode} onChangeText={setPincode} placeholder="745412" keyboardType="number-pad" placeholderTextColor={Colors.textMuted} />
            </View>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Near Light House, Paradeeep, Odisha" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.sectionTitle}>Price Break Down</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Puja Fee</Text>
              <Text style={styles.priceValue}>₹{puja.pricePerDevotee}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Savings Goal</Text>
              <Text style={[styles.priceValue, { color: Colors.green }]}>₹150</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>GST</Text>
              <Text style={styles.priceValue}>₹0</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.ctaContainer}>
        <PrimaryButton
          title={step === 0 ? `Participate For ₹${totalPrice}` : `Pay ₹${totalPrice}`}
          onPress={() => {
            if (step < 1) setStep(step + 1);
            else navigation.goBack();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  stepRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
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
  devoteeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  devoteeCard: { width: '48%', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.lg, alignItems: 'center', marginBottom: Spacing.md },
  devoteeCardActive: { borderColor: Colors.primary, backgroundColor: Colors.orangeLight },
  devoteeLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs },
  devoteePrice: { ...Typography.bodyBold, color: Colors.textPrimary, marginTop: Spacing.xs },
  devoteeCardActiveText: { color: Colors.primary },
  inputLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.body, color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: Spacing.md },
  addressRow: { flexDirection: 'row' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  priceLabel: { ...Typography.body, color: Colors.textSecondary },
  priceValue: { ...Typography.bodyBold, color: Colors.primary },
  ctaContainer: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
