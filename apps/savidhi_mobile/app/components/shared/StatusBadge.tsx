import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  PRASAD_SHIPPED: { bg: Colors.greenLight, text: Colors.green },
  YET_TO_START: { bg: Colors.borderLight, text: Colors.textMuted },
  CANCELLED: { bg: Colors.redLight, text: Colors.red },
  ONGOING: { bg: Colors.orangeLight, text: Colors.orange },
  VIDEO_PROCESSING: { bg: '#E3F2FD', text: Colors.statusProcessing },
  COMPLETE: { bg: Colors.greenLight, text: Colors.green },
  MEET_IN_PROGRESS: { bg: Colors.orangeLight, text: Colors.orange },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.YET_TO_START;
  const label = status.replace(/_/g, ' ');
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.small,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
