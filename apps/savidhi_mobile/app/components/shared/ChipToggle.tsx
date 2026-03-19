import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, BorderRadius, Spacing } from '../../theme';

interface ChipOption {
  key: string;
  label: string;
  icon?: string;
}

interface ChipToggleProps {
  options: ChipOption[];
  selected: string;
  onSelect: (key: string) => void;
}

export function ChipToggle({ options, selected, onSelect }: ChipToggleProps) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const isActive = opt.key === selected;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[styles.chip, isActive && styles.activeChip]}
            onPress={() => onSelect(opt.key)}
            activeOpacity={0.7}
          >
            {opt.icon && (
              <Icon
                name={opt.icon}
                size={18}
                color={isActive ? Colors.textWhite : Colors.textSecondary}
                style={styles.icon}
              />
            )}
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  activeChip: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  label: {
    ...Typography.bodyBold,
    color: Colors.textSecondary,
  },
  activeLabel: {
    color: Colors.textWhite,
  },
});
