import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { MOCK_APPOINTMENT_STATUS, AppointmentStatusStep } from '../../data';

function TimelineStep({ step, isLast }: { step: AppointmentStatusStep; isLast: boolean }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.dotCol}>
        <View style={[styles.dot, step.completed ? styles.dotDone : styles.dotPending]} />
        {!isLast && <View style={[styles.line, step.completed ? styles.lineDone : styles.linePending]} />}
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepLabel, step.completed && styles.stepLabelDone]}>{step.label}</Text>
        {step.subtitle ? <Text style={styles.stepSub}>{step.subtitle}</Text> : null}
        {step.actionLabel ? (
          <TouchableOpacity style={styles.actionBtn}>
            <Icon name="video" size={16} color={Colors.textWhite} />
            <Text style={styles.actionBtnText}>{step.actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function AppointmentStatusScreen({ navigation, route }: { navigation: any; route: any }) {
  const status = MOCK_APPOINTMENT_STATUS;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Appointment Status</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Astrologer Info */}
        <View style={styles.card}>
          <Image source={{ uri: status.astrologerImage }} style={styles.avatar} />
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{status.astrologerName}</Text>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>Booking ID</Text>
              <Text style={styles.idValue}>{status.bookingId}</Text>
            </View>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {status.steps.map((step, i) => (
            <TimelineStep key={i} step={step} isLast={i === status.steps.length - 1} />
          ))}
        </View>

        {/* Support */}
        <TouchableOpacity style={styles.supportBtn}>
          <Icon name="phone" size={18} color={Colors.primary} />
          <Text style={styles.supportBtnText}>Call Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  avatar: { width: 60, height: 60, borderRadius: BorderRadius.sm, backgroundColor: Colors.borderLight },
  cardInfo: { flex: 1, marginLeft: Spacing.md },
  name: { ...Typography.subtitle, color: Colors.textPrimary },
  idRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  idLabel: { ...Typography.caption, color: Colors.textSecondary },
  idValue: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  timeline: { marginBottom: Spacing.xl },
  stepRow: { flexDirection: 'row', minHeight: 60 },
  dotCol: { alignItems: 'center', width: 28 },
  dot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  dotDone: { backgroundColor: Colors.primary },
  dotPending: { backgroundColor: Colors.border },
  line: { width: 2, flex: 1 },
  lineDone: { backgroundColor: Colors.primary },
  linePending: { backgroundColor: Colors.border },
  stepContent: { flex: 1, marginLeft: Spacing.md, paddingBottom: Spacing.lg },
  stepLabel: { ...Typography.bodyBold, color: Colors.textSecondary },
  stepLabelDone: { color: Colors.textPrimary },
  stepSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: BorderRadius.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, marginTop: Spacing.sm, alignSelf: 'flex-start' },
  actionBtnText: { ...Typography.bodyBold, color: Colors.textWhite, marginLeft: Spacing.xs },
  supportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary },
  supportBtnText: { ...Typography.bodyBold, color: Colors.primary, marginLeft: Spacing.sm },
});
