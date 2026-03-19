import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';
import { PujaBooking } from '../../data';
import { StatusBadge } from './StatusBadge';

interface BookingCardProps {
  booking: PujaBooking;
  onPress: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{booking.pujaName}</Text>
        {booking.isWeekly && (
          <View style={styles.weeklyBadge}>
            <Icon name="refresh" size={12} color={Colors.textSecondary} />
            <Text style={styles.weeklyText}>Weekly</Text>
          </View>
        )}
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Booked On</Text>
        <Text style={styles.value}>{booking.bookedOn}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Puja On</Text>
        <Text style={styles.value}>{booking.pujaOn}</Text>
      </View>
      <StatusBadge status={booking.status} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  name: {
    ...Typography.bodyBold,
    color: Colors.textPrimary,
    flex: 1,
  },
  weeklyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.sm,
  },
  weeklyText: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginLeft: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  value: {
    ...Typography.caption,
    color: Colors.textPrimary,
  },
});
