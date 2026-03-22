import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import { AppointmentBooking } from '../../data';
import { resolveMediaUrl } from '../../utils';
import { StatusBadge } from './StatusBadge';

interface AppointmentCardProps {
  appointment: AppointmentBooking;
  onPress: () => void;
}

export function AppointmentCard({ appointment, onPress }: AppointmentCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: resolveMediaUrl(appointment.astrologerImage) }} style={styles.avatar} />
      <View style={styles.info}>
        <Text style={styles.name}>{appointment.astrologerName}</Text>
        <Text style={styles.date}>{appointment.date}</Text>
        <Text style={styles.time}>{appointment.timeSlot}</Text>
        <StatusBadge status={appointment.status} />
      </View>
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
    borderColor: Colors.border,
    alignItems: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.sm,
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
  date: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  time: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
});
