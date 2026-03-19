import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

interface UpcomingBookingCardProps {
  pujaName: string;
  time: string;
  onPress: () => void;
}

export function UpcomingBookingCard({ pujaName, time, onPress }: UpcomingBookingCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconContainer}>
        <Icon name="fire" size={24} color={Colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{pujaName}</Text>
        <Text style={styles.time}>Puja Begins At {time}</Text>
      </View>
      <Icon name="chevron-right" size={24} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    minWidth: 260,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
  },
  time: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
