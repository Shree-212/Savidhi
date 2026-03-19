import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { MOCK_PUJAS } from '../../data';
import { ExpandableSection } from '../../components/shared/ExpandableSection';
import { PrimaryButton } from '../../components/shared/PrimaryButton';

interface Props { navigation: any; route: any; }

export function PujaDetailScreen({ navigation, route }: Props) {
  const puja = MOCK_PUJAS.find((p) => p.id === route.params?.pujaId) || MOCK_PUJAS[0];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: puja.imageUrl }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.textWhite} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Icon name="share-variant" size={22} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{puja.name}</Text>
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={16} color={Colors.green} />
            <Text style={styles.location}>{puja.templeName}, {puja.templeLocation}</Text>
          </View>
          <View style={styles.dateRow}>
            <Icon name="calendar" size={16} color={Colors.textSecondary} />
            <Text style={styles.dateText}>{puja.date}</Text>
            <View style={styles.countdownBadge}>
              <Text style={styles.countdownText}>{puja.countdown}</Text>
            </View>
          </View>

          {/* Expandable Sections */}
          <ExpandableSection title="Benefits Of Puja" initiallyExpanded>
            {puja.benefits.map((b, i) => (
              <Text key={i} style={styles.bulletItem}>• {b}</Text>
            ))}
          </ExpandableSection>

          <ExpandableSection title="Rituals Included">
            {puja.ritualsIncluded.map((r, i) => (
              <Text key={i} style={styles.bulletItem}>• {r}</Text>
            ))}
          </ExpandableSection>

          <ExpandableSection title="How To Do Puja">
            {puja.howToDo.map((h, i) => (
              <Text key={i} style={styles.bulletItem}>{i + 1}. {h}</Text>
            ))}
          </ExpandableSection>

          {/* Video Thumbnail */}
          <Text style={styles.sectionTitle}>Video You Will Receive</Text>
          <View style={styles.videoContainer}>
            <Image source={{ uri: puja.videoThumbnail }} style={styles.videoThumb} />
            <View style={styles.playButton}>
              <Icon name="play" size={28} color={Colors.textWhite} />
            </View>
          </View>

          {/* Parcel */}
          <ExpandableSection title="What's Inside Your Parcel">
            {puja.parcelContents.map((p, i) => (
              <Text key={i} style={styles.bulletItem}>• {p}</Text>
            ))}
          </ExpandableSection>

          {/* Temple Link */}
          <TouchableOpacity style={styles.templeLink}>
            <Text style={styles.templeLinkText}>Importance Of {puja.templeName}</Text>
            <Icon name="arrow-right" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <PrimaryButton
          title="Select Puja"
          onPress={() => navigation.navigate('PujaBooking', { pujaId: puja.id })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroContainer: { height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  backBtn: { position: 'absolute', top: 50, left: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  shareBtn: { position: 'absolute', top: 50, right: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  content: { padding: Spacing.lg },
  title: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.sm },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  location: { ...Typography.body, color: Colors.textSecondary, marginLeft: Spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  dateText: { ...Typography.body, color: Colors.textSecondary, marginLeft: Spacing.xs, marginRight: Spacing.md },
  countdownBadge: { backgroundColor: Colors.orangeLight, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  countdownText: { ...Typography.captionBold, color: Colors.primary },
  bulletItem: { ...Typography.body, color: Colors.textSecondary, marginBottom: 4 },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.sm },
  videoContainer: { height: 180, borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.lg, position: 'relative' },
  videoThumb: { width: '100%', height: '100%' },
  playButton: { position: 'absolute', top: '50%', left: '50%', marginTop: -22, marginLeft: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  templeLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.full, paddingVertical: Spacing.md, marginBottom: Spacing.lg },
  templeLinkText: { ...Typography.bodyBold, color: Colors.textPrimary, marginRight: Spacing.sm },
  ctaContainer: { padding: Spacing.lg, backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.borderLight },
});
