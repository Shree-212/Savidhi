import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import { Temple } from '../../data';
import { resolveMediaUrl } from '../../utils';

interface TempleCardProps {
  temple: Temple;
  onPress: () => void;
}

export function TempleCard({ temple, onPress }: TempleCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={{ uri: resolveMediaUrl(temple.images[0]) }}
        style={styles.image}
      />
      <View style={styles.overlay} />
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={1}>{temple.name}</Text>
        <View style={styles.locationRow}>
          <Icon name="map-marker" size={14} color={Colors.green} />
          <Text style={styles.location} numberOfLines={1}>
            {temple.location}, {temple.pincode}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: Dimensions.get('window').width - 48,
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
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    fontWeight: '700',
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
