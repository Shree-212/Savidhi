import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import { Puja } from '../../data';

const CARD_WIDTH = Dimensions.get('window').width - 48;

interface PujaCardProps {
  puja: Puja;
  onPress: () => void;
  compact?: boolean;
}

export function PujaCard({ puja, onPress, compact }: PujaCardProps) {
  const width = compact ? (Dimensions.get('window').width - 64) / 2 : CARD_WIDTH;
  const height = compact ? 180 : 220;

  return (
    <TouchableOpacity
      style={[styles.card, { width, height }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image source={{ uri: puja.imageUrl }} style={styles.image} />
      <View style={styles.overlay} />
      {puja.isWeekly && (
        <View style={styles.weeklyBadge}>
          <Icon name="refresh" size={12} color={Colors.textWhite} />
          <Text style={styles.weeklyText}>Weekly</Text>
        </View>
      )}
      {puja.isMonthly && (
        <View style={[styles.weeklyBadge, { backgroundColor: '#6366F1' }]}>
          <Icon name="refresh" size={12} color={Colors.textWhite} />
          <Text style={styles.weeklyText}>Monthly</Text>
        </View>
      )}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>{puja.name}</Text>
        <View style={styles.locationRow}>
          <Icon name="map-marker" size={14} color={Colors.green} />
          <Text style={styles.location} numberOfLines={1}>
            {puja.templeName},{puja.templeLocation}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BorderRadius.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: BorderRadius.lg,
  },
  weeklyBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  weeklyText: {
    ...Typography.small,
    color: Colors.textWhite,
    marginLeft: 3,
    fontWeight: '600',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  name: {
    ...Typography.subtitle,
    color: Colors.textWhite,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    ...Typography.caption,
    color: Colors.textWhite,
    marginLeft: 4,
    opacity: 0.9,
  },
});
