import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing } from '../../theme';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const TAB_ICONS: Record<string, string> = {
  PujaTab: 'fire',
  TemplesTab: 'temple-hindu',
  ConsultTab: 'account-clock-outline',
  PointsTab: 'star-circle-outline',
  ProfileTab: 'account-outline',
};

const TAB_LABELS: Record<string, string> = {
  PujaTab: 'Puja',
  TemplesTab: 'Temples',
  ConsultTab: 'Consult',
  PointsTab: 'Points',
  ProfileTab: 'User',
};

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  return (
    <View style={styles.container}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const iconName = TAB_ICONS[route.name] || 'circle';
        const label = TAB_LABELS[route.name] || route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tab}
          >
            <Icon
              name={iconName}
              size={24}
              color={isFocused ? Colors.tabActive : Colors.tabInactive}
            />
            <Text
              style={[
                styles.label,
                { color: isFocused ? Colors.tabActive : Colors.tabInactive },
              ]}
            >
              {label}
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
    backgroundColor: Colors.tabBarBg,
    paddingBottom: 20,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    elevation: 8,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  label: {
    ...Typography.tabLabel,
    marginTop: 2,
  },
});
