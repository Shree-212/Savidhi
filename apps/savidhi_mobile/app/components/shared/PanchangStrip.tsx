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
        {/* Date section with calendar+clock icon */}
        <View style={styles.dateSection}>
          <View style={styles.calendarIconWrap}>
            <Icon name="calendar-month-outline" size={28} color={Colors.textPrimary} />
            <View style={styles.clockBadge}>
              <Icon name="clock-outline" size={12} color={Colors.textPrimary} />
            </View>
          </View>
          <View style={styles.dateText}>
            <Text style={styles.dateMain}>{panchang.date}</Text>
            <Text style={styles.dateSub}>{panchang.day}</Text>
          </View>
        </View>

        {/* Tithi + Location section */}
        <View style={styles.tithiSection}>
          <Text style={styles.tithi}>{panchang.tithi}</Text>
          <View style={styles.locationRow}>
            <Icon name="map-marker" size={14} color={Colors.primary} />
            <Text style={styles.location}>{panchang.location}</Text>
          </View>
        </View>

        {/* Moon phase */}
        <View style={styles.moonContainer}>
          <Text style={styles.moonEmoji}>{panchang.moonPhase}</Text>
        </View>
      </View>

      {/* Current muhurat bar */}
      {currentMuhurat && (
        <View style={styles.muhuratRow}>
          <Text style={styles.nowLabel}>Now:   </Text>
          <Text style={styles.muhuratText}>
            {currentMuhurat.name.replace(/\s*\(now\)\s*/i, '')} ({currentMuhurat.time})
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5E6',
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIconWrap: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#FFF5E6',
    borderRadius: 8,
    padding: 1,
  },
  dateText: {
    marginLeft: Spacing.sm,
  },
  dateMain: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  dateSub: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  tithiSection: {
    alignItems: 'flex-end',
  },
  tithi: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  location: {
    ...Typography.caption,
    color: Colors.primary,
    marginLeft: 2,
    fontWeight: '500',
  },
  moonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a3e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonEmoji: {
    fontSize: 22,
  },
  muhuratRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  nowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  muhuratText: {
    fontSize: 13,
    color: Colors.green,
    fontWeight: '700',
    lineHeight: 18,
    flex: 1,
  },
});
