import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import { Astrologer } from '../../data';
import { resolveMediaUrl } from '../../utils';

interface AstrologerCardProps {
  astrologer: Astrologer;
  onPress: () => void;
}

export function AstrologerCard({ astrologer, onPress }: AstrologerCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: resolveMediaUrl(astrologer.imageUrl) }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{astrologer.name}</Text>
        <Text style={styles.specialty}>{astrologer.specialty}</Text>
        <Text style={styles.experience}>{astrologer.experience}</Text>
        <Text style={styles.price}>₹{astrologer.pricePerMin} Per Min</Text>
      </View>
      {astrologer.isBookmarked && (
        <Icon name="bookmark" size={20} color={Colors.primary} style={styles.bookmark} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.borderLight,
  },
  info: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  name: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  specialty: {
    ...Typography.caption,
    color: Colors.primary,
    marginTop: 2,
  },
  experience: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  price: {
    ...Typography.captionBold,
    color: Colors.primary,
    marginTop: 4,
  },
  bookmark: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
  },
});
