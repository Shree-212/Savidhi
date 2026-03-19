import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { MOCK_ASTROLOGERS } from '../../data';
import { SearchBar } from '../../components/shared/SearchBar';
import { AstrologerCard } from '../../components/shared/AstrologerCard';

export function AstrologerListScreen({ navigation }: { navigation: any }) {
  const [search, setSearch] = useState('');
  const filtered = MOCK_ASTROLOGERS.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SearchBar value={search} onChangeText={setSearch} />
        <View style={{ height: Spacing.md }} />
        {filtered.map((astro) => (
          <AstrologerCard key={astro.id} astrologer={astro} onPress={() => navigation.navigate('AstrologerDetail', { astrologerId: astro.id })} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
});
