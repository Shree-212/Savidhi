import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { MOCK_TEMPLES } from '../../data';
import { ChipToggle } from '../../components/shared/ChipToggle';
import { SearchBar } from '../../components/shared/SearchBar';
import { TempleCard } from '../../components/shared/TempleCard';

const TABS = [
  { key: 'temples', label: 'Temples', icon: 'temple-hindu' },
  { key: 'deities', label: 'Deities', icon: 'account-heart-outline' },
  { key: 'near', label: 'Near You', icon: 'map-marker-radius-outline' },
];

export function TempleListScreen({ navigation }: { navigation: any }) {
  const [tab, setTab] = useState('temples');
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ChipToggle options={TABS} selected={tab} onSelect={setTab} />
        <View style={styles.searchContainer}>
          <SearchBar value={search} onChangeText={setSearch} />
        </View>
        {MOCK_TEMPLES.map((temple) => (
          <TempleCard key={temple.id} temple={temple} onPress={() => navigation.navigate('TempleDetail', { templeId: temple.id })} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  searchContainer: { marginVertical: Spacing.md },
});
