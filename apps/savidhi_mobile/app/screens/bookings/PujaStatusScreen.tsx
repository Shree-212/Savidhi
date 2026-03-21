import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { pujaBookingService } from '../../services';
import type { PujaStatusStep, PujaStatusDetail } from '../../data';

function TimelineStep({ step, isLast }: { step: PujaStatusStep; isLast: boolean }) {
  return (
    <View style={styles.stepRow}>
      {/* Dot + Line */}
      <View style={styles.dotCol}>
        <View style={[styles.dot, step.completed ? styles.dotDone : styles.dotPending]} />
        {!isLast && <View style={[styles.line, step.completed ? styles.lineDone : styles.linePending]} />}
      </View>
      {/* Content */}
      <View style={styles.stepContent}>
        <Text style={[styles.stepLabel, step.completed && styles.stepLabelDone]}>{step.label}</Text>
        {step.subtitle ? <Text style={styles.stepSub}>{step.subtitle}</Text> : null}
        {step.details?.map((d, i) => <Text key={i} style={styles.stepDetail}>{d}</Text>)}
        {step.videoThumbnail ? (
          <TouchableOpacity style={styles.videoThumb}>
            <Image source={{ uri: step.videoThumbnail }} style={styles.videoImage} />
            <View style={styles.playOverlay}>
              <Icon name="play-circle" size={36} color={Colors.textWhite} />
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function PujaStatusScreen({ navigation, route }: { navigation: any; route: any }) {
  const [status, setStatus] = useState<PujaStatusDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bookingId = route.params?.bookingId;
    if (!bookingId) return;
    (async () => {
      try {
        const res = await pujaBookingService.getById(bookingId);
        const d = res.data?.data ?? res.data;
        // Map API response to PujaStatusDetail shape
        const stages = d.stages ?? d.steps ?? [];
        setStatus({
          bookingId: d.booking_id ?? d.id ?? bookingId,
          pujaName: d.puja_name ?? d.puja?.name ?? '',
          templeName: d.temple_name ?? d.puja?.temple_name ?? '',
          pujaId: d.puja_id ?? d.puja?.id ?? '',
          steps: stages.map((s: any) => ({
            label: s.label ?? s.stage ?? '',
            subtitle: s.subtitle ?? s.description ?? '',
            details: s.details ?? [],
            completed: s.completed ?? s.status === 'DONE',
            videoThumbnail: s.video_thumbnail ?? s.video_url ?? undefined,
          })),
        });
      } catch (err) {
        console.error('PujaStatusScreen fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params?.bookingId]);

  if (loading || !status) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Puja Status</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Booking Info Card */}
        <View style={styles.card}>
          <Text style={styles.pujaName}>{status.pujaName}</Text>
          <Text style={styles.temple}>{status.templeName}</Text>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Booking ID</Text>
            <Text style={styles.idValue}>{status.bookingId}</Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {status.steps.map((step, i) => (
            <TimelineStep key={i} step={step} isLast={i === status.steps.length - 1} />
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryBtn}>
            <Icon name="phone" size={18} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Call Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn}>
            <Icon name="share-variant" size={18} color={Colors.textWhite} />
            <Text style={styles.primaryBtnText}>Share Status</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xl },
  pujaName: { ...Typography.subtitle, color: Colors.textPrimary },
  temple: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  idRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md },
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
  stepDetail: { ...Typography.small, color: Colors.textMuted, marginTop: 4 },
  videoThumb: { width: '100%', height: 120, borderRadius: BorderRadius.sm, overflow: 'hidden', marginTop: Spacing.sm },
  videoImage: { width: '100%', height: '100%' },
  playOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.overlayLight },
  actions: { flexDirection: 'row', gap: Spacing.md },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primary },
  secondaryBtnText: { ...Typography.bodyBold, color: Colors.primary, marginLeft: Spacing.sm },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
  primaryBtnText: { ...Typography.bodyBold, color: Colors.textWhite, marginLeft: Spacing.sm },
});
