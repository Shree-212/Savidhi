import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { MOCK_TEMPLES } from '../../data';
import { ExpandableSection } from '../../components/shared/ExpandableSection';

interface Props { navigation: any; route: any; }

export function TempleDetailScreen({ navigation, route }: Props) {
  const temple = MOCK_TEMPLES.find((t) => t.id === route.params?.templeId) || MOCK_TEMPLES[0];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image source={{ uri: temple.images[0] }} style={styles.heroImage} />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={22} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{temple.name}</Text>
          <View style={styles.locRow}>
            <Icon name="map-marker" size={16} color={Colors.green} />
            <Text style={styles.location}>{temple.location}, {temple.pincode}</Text>
          </View>

          {/* Pujaris */}
          <ExpandableSection title="Registered Pujari Here" initiallyExpanded>
            <View style={styles.pujariRow}>
              {temple.pujaris.map((p) => (
                <View key={p.id} style={styles.pujariCard}>
                  <View style={styles.pujariAvatar}>
                    <Icon name="account" size={24} color={Colors.textMuted} />
                  </View>
                  <Text style={styles.pujariName}>{p.name}</Text>
                  <Text style={styles.pujariRole}>{p.role}</Text>
                </View>
              ))}
            </View>
          </ExpandableSection>

          <ExpandableSection title="About Temple" initiallyExpanded>
            <Text style={styles.bodyText}>{temple.about}</Text>
          </ExpandableSection>

          <ExpandableSection title="History & Significance">
            <Text style={styles.bodyText}>{temple.history}</Text>
          </ExpandableSection>

          {/* Video */}
          <Text style={styles.sectionTitle}>Our Past Puja Video Here</Text>
          <View style={styles.videoContainer}>
            <Image source={{ uri: temple.videoThumbnail }} style={styles.videoThumb} />
            <View style={styles.playButton}>
              <Icon name="play" size={28} color={Colors.textWhite} />
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsNumber}>{temple.pujaCount}+</Text>
            <Text style={styles.statsLabel}>Puja Done</Text>
            <Text style={styles.statsSubLabel}>At {temple.name} By Savidhi</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  heroContainer: { height: 280, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: Spacing.lg, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
  content: { padding: Spacing.lg },
  title: { ...Typography.h2, color: Colors.textPrimary, marginBottom: Spacing.sm },
  locRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  location: { ...Typography.body, color: Colors.textSecondary, marginLeft: 4 },
  pujariRow: { flexDirection: 'row', gap: Spacing.md },
  pujariCard: { alignItems: 'center' },
  pujariAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  pujariName: { ...Typography.captionBold, color: Colors.textPrimary, marginTop: 4 },
  pujariRole: { ...Typography.small, color: Colors.primary },
  bodyText: { ...Typography.body, color: Colors.textSecondary },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  videoContainer: { height: 180, borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.lg, position: 'relative' },
  videoThumb: { width: '100%', height: '100%' },
  playButton: { position: 'absolute', top: '50%', left: '50%', marginTop: -22, marginLeft: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  statsContainer: { alignItems: 'center', paddingVertical: Spacing.xl },
  statsNumber: { ...Typography.h1, color: Colors.primary, fontStyle: 'italic' },
  statsLabel: { ...Typography.subtitle, color: Colors.textPrimary },
  statsSubLabel: { ...Typography.caption, color: Colors.textSecondary },
});
