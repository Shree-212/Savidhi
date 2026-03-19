import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { PanchangData } from '../../data';

interface PanchangStripProps {
  panchang: PanchangData;
  onPress?: () => void;
}

export function PanchangStrip({ panchang, onPress }: PanchangStripProps) {
  const currentMuhurat = panchang.auspiciousTimes.find((t) =>
    t.name.toLowerCase().includes('now'),
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.dateSection}>
          <Icon name="calendar-month-outline" size={20} color={Colors.primary} />
          <View style={styles.dateText}>
            <Text style={styles.dateMain}>{panchang.date}</Text>
            <Text style={styles.dateSub}>{panchang.day}</Text>
          </View>
        </View>
        <View style={styles.tithiSection}>
          <Text style={styles.tithi}>{panchang.tithi}</Text>
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={14} color={Colors.green} />
            <Text style={styles.location}>{panchang.location}</Text>
          </View>
        </View>
        <View style={styles.moonContainer}>
          <Text style={styles.moonEmoji}>{panchang.moonPhase}</Text>
        </View>
      </View>
      {currentMuhurat && (
        <View style={styles.muhuratRow}>
          <Text style={styles.nowLabel}>Now: </Text>
          <Text style={styles.muhuratText}>
            {currentMuhurat.name} ({currentMuhurat.time})
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: Spacing.sm,
  },
  dateMain: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  dateSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  tithiSection: {
    alignItems: 'center',
  },
  tithi: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  location: {
    ...Typography.caption,
    color: Colors.green,
    marginLeft: 2,
  },
  moonContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonEmoji: {
    fontSize: 18,
  },
  muhuratRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  nowLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  muhuratText: {
    ...Typography.caption,
    color: Colors.green,
    fontWeight: '600',
  },
});
