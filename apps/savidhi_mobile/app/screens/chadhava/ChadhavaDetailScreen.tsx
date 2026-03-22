import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { chadhavaService } from '../../services';
import { ExpandableSection } from '../../components/shared/ExpandableSection';
import { PrimaryButton } from '../../components/shared/PrimaryButton';
import { resolveMediaUrl } from '../../utils';
import type { Chadhava, ChadhavaOffering } from '../../data';

interface Props { navigation: any; route: any; }

export function ChadhavaDetailScreen({ navigation, route }: Props) {
  const [chadhava, setChadhava] = useState<Chadhava | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    const chadhavaId = route.params?.chadhavaId;
    if (!chadhavaId) return;
    (async () => {
      try {
        const res = await chadhavaService.getById(chadhavaId);
        const d = res.data?.data ?? res.data;
        setChadhava({
          id: d.id,
          name: d.name,
          templeName: d.temple_name ?? '',
          templeLocation: d.temple_address ?? '',
          imageUrl: d.slider_images?.[0] ?? '',
          date: d.schedule_day ?? '',
          time: d.schedule_time ?? '',
          countdown: '',
          benefits: d.benefits ?? [],
          ritualsIncluded: d.rituals_included ?? [],
          howToOffer: [],
          videoThumbnail: d.sample_video_url ?? '',
          parcelContents: [],
          offerings: (d.offerings ?? []).map((o: any) => ({
            id: o.id,
            name: o.item_name ?? '',
            description: o.benefit ?? '',
            price: o.price ?? 0,
            imageUrl: o.images?.[0] ?? '',
          })),
          templeId: d.temple_id ?? '',
          isWeekly: d.booking_mode === 'SUBSCRIPTION',
          startingPrice: (d.offerings ?? []).reduce((min: number, o: any) => {
            const p = Number(o.price ?? 0);
            return p > 0 && (min === 0 || p < min) ? p : min;
          }, 0),
        });
      } catch (err) {
        console.error('ChadhavaDetailScreen fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [route.params?.chadhavaId]);

  if (loading || !chadhava) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const total = chadhava.offerings.reduce((sum, off) => sum + (quantities[off.id] || 0) * off.price, 0);

  const updateQty = (id: string, delta: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) }));
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image source={{ uri: resolveMediaUrl(chadhava.imageUrl) }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{chadhava.name}</Text>
          <View style={styles.locRow}>
            <Icon name="map-marker" size={16} color={Colors.green} />
            <Text style={styles.location}>{chadhava.templeName}, {chadhava.templeLocation}</Text>
          </View>

          <ExpandableSection title="Benefits Of Chadhava" initiallyExpanded>
            {chadhava.benefits.map((b, i) => <Text key={i} style={styles.bullet}>• {b}</Text>)}
          </ExpandableSection>
          <ExpandableSection title="Rituals Included">
            {chadhava.ritualsIncluded.map((r, i) => <Text key={i} style={styles.bullet}>• {r}</Text>)}
          </ExpandableSection>

          <Text style={styles.sectionTitle}>Select Offerings For Chadhava</Text>
          {chadhava.offerings.map((off) => (
            <View key={off.id} style={styles.offeringRow}>
              <View style={styles.offeringInfo}>
                <Text style={styles.offeringName}>{off.name}</Text>
                <Text style={styles.offeringDesc} numberOfLines={2}>{off.description}</Text>
              </View>
              <View style={styles.qtyControls}>
                <Text style={styles.offeringPrice}>₹{off.price}</Text>
                {(quantities[off.id] || 0) > 0 ? (
                  <View style={styles.qtyRow}>
                    <TouchableOpacity onPress={() => updateQty(off.id, -1)}><Text style={styles.qtyBtn}>−</Text></TouchableOpacity>
                    <Text style={styles.qtyNum}>{quantities[off.id]}</Text>
                    <TouchableOpacity onPress={() => updateQty(off.id, 1)}><Text style={styles.qtyBtn}>+</Text></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addBtn} onPress={() => updateQty(off.id, 1)}>
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.ctaContainer}>
        <PrimaryButton title={`Offer For ₹${total || chadhava.startingPrice}`} onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroContainer: { height: 250, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  backBtn: { position: 'absolute', top: 50, left: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  content: { padding: Spacing.lg },
  title: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.sm },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  location: { ...Typography.body, color: Colors.textSecondary, marginLeft: 4 },
  bullet: { ...Typography.body, color: Colors.textSecondary, marginBottom: 4 },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.md },
  offeringRow: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, alignItems: 'center' },
  offeringInfo: { flex: 1 },
  offeringName: { ...Typography.bodyBold, color: Colors.textPrimary },
  offeringDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  qtyControls: { alignItems: 'center', marginLeft: Spacing.md },
  offeringPrice: { ...Typography.bodyBold, color: Colors.primary, marginBottom: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { ...Typography.h3, color: Colors.primary, paddingHorizontal: Spacing.sm },
  qtyNum: { ...Typography.bodyBold, color: Colors.textPrimary, minWidth: 24, textAlign: 'center' },
  addBtn: { borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  addBtnText: { ...Typography.captionBold, color: Colors.primary },
  ctaContainer: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
