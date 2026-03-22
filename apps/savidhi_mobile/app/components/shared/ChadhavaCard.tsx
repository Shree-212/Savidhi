import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import { Chadhava } from '../../data';
import { resolveMediaUrl } from '../../utils';

interface ChadhavaCardProps {
  chadhava: Chadhava;
  onPress: () => void;
}

export function ChadhavaCard({ chadhava, onPress }: ChadhavaCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: resolveMediaUrl(chadhava.imageUrl) }} style={styles.image} />
      <View style={styles.overlay} />
      {chadhava.isWeekly && (
        <View style={styles.weeklyBadge}>
          <Icon name="refresh" size={12} color={Colors.textWhite} />
          <Text style={styles.weeklyText}>Weekly</Text>
        </View>
      )}
      <View style={styles.priceTag}>
        <Text style={styles.priceText}>₹{chadhava.startingPrice}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>{chadhava.name}</Text>
        <View style={styles.locationRow}>
          <Icon name="map-marker" size={14} color={Colors.green} />
          <Text style={styles.location} numberOfLines={1}>
            {chadhava.templeName},{chadhava.templeLocation}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: (Dimensions.get('window').width - 64) / 2,
    height: 180,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
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
  priceTag: {
    position: 'absolute',
    bottom: 50,
    right: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  priceText: {
    ...Typography.captionBold,
    color: Colors.textWhite,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.sm,
  },
  name: {
    ...Typography.captionBold,
    color: Colors.textWhite,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    ...Typography.small,
    color: Colors.textWhite,
    marginLeft: 3,
    opacity: 0.9,
  },
});
