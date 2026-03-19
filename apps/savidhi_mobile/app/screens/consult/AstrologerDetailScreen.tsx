import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { MOCK_ASTROLOGERS } from '../../data';
import { ExpandableSection } from '../../components/shared/ExpandableSection';
import { PrimaryButton } from '../../components/shared/PrimaryButton';

interface Props { navigation: any; route: any; }

export function AstrologerDetailScreen({ navigation, route }: Props) {
  const astro = MOCK_ASTROLOGERS.find((a) => a.id === route.params?.astrologerId) || MOCK_ASTROLOGERS[0];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image source={{ uri: astro.images[0] }} style={styles.heroImage} />
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
