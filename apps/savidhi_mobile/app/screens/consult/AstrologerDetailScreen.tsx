import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { astrologerService } from '../../services';
import { ExpandableSection } from '../../components/shared/ExpandableSection';
import { PrimaryButton } from '../../components/shared/PrimaryButton';
import { resolveMediaUrl } from '../../utils';
import type { Astrologer } from '../../data';

interface Props { navigation: any; route: any; }

export function AstrologerDetailScreen({ navigation, route }: Props) {
  const [astro, setAstro] = useState<Astrologer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const astrologerId = route.params?.astrologerId;
    if (!astrologerId) return;
    (async () => {
      try {
        const res = await astrologerService.getById(astrologerId);
        const d = res.data?.data ?? res.data;
        setAstro({
          id: d.id,
          name: d.name,
          specialty: d.designation ?? '',
          experience: d.start_date ? `${new Date().getFullYear() - new Date(d.start_date).getFullYear()}+ years` : '',
          pricePerMin: d.price_15min ?? 0,
          imageUrl: d.profile_pic ?? '',
          images: d.slider_images ?? [],
          appointmentsBooked: 0,
          languages: d.languages ?? [],
          expertise: d.expertise ?? [],
          about: d.about ?? '',
          isBookmarked: false,
        });
      } catch (err) {
        console.error('AstrologerDetailScreen fetch error:', err);
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image source={{ uri: resolveMediaUrl(astro.images[0]) }} style={styles.heroImage} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.name}>{astro.name}</Text>
          <Text style={styles.specialty}>{astro.specialty} With {astro.experience}</Text>
          <View style={styles.statsRow}>
            <Icon name="calendar-check" size={16} color={Colors.textSecondary} />
            <Text style={styles.statsText}>{astro.appointmentsBooked} Appointments Booked</Text>
          </View>
          <View style={styles.statsRow}>
            <Icon name="translate" size={16} color={Colors.textSecondary} />
            <Text style={styles.statsText}>{astro.languages.join(', ')}</Text>
          </View>

          <ExpandableSection title="Expertise" initiallyExpanded>
            {astro.expertise.map((e, i) => <Text key={i} style={styles.bullet}>• {e}</Text>)}
          </ExpandableSection>

          <ExpandableSection title="About" initiallyExpanded>
            <Text style={styles.bodyText}>{astro.about}</Text>
          </ExpandableSection>
        </View>
      </ScrollView>

      <View style={styles.ctaContainer}>
        <PrimaryButton title="Book Appointment" onPress={() => navigation.navigate('BookAppointment', { astrologerId: astro.id })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroContainer: { height: 300, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  content: { padding: Spacing.lg },
  name: { ...Typography.h2, color: Colors.textPrimary, marginBottom: 4 },
  specialty: { ...Typography.body, color: Colors.textSecondary, marginBottom: Spacing.sm },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  statsText: { ...Typography.caption, color: Colors.textSecondary, marginLeft: Spacing.sm },
  bullet: { ...Typography.body, color: Colors.textSecondary, marginBottom: 4 },
  bodyText: { ...Typography.body, color: Colors.textSecondary },
  ctaContainer: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
