import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { astrologerService } from '../../services';
import { SearchBar } from '../../components/shared/SearchBar';
import { AstrologerCard } from '../../components/shared/AstrologerCard';
import type { Astrologer } from '../../data';

export function AstrologerListScreen({ navigation }: { navigation: any }) {
  const [search, setSearch] = useState('');
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await astrologerService.list({ search: search || undefined });
        const items = res.data?.data ?? res.data ?? [];
        setAstrologers(
          (Array.isArray(items) ? items : []).map((d: any) => ({
            id: d.id,
            name: d.name,
            specialty: d.designation ?? '',
            experience: '',
            pricePerMin: d.price_15min ?? 0,
            imageUrl: d.profile_pic ?? '',
            images: d.slider_images ?? [],
            appointmentsBooked: 0,
            languages: d.languages ?? [],
            expertise: d.expertise ?? [],
            about: d.about ?? '',
            isBookmarked: false,
          }))
        );
      } catch (err) {
        console.error('AstrologerListScreen fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [search]);

  const filtered = astrologers.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SearchBar value={search} onChangeText={setSearch} />
        <View style={{ height: Spacing.md }} />
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          filtered.map((astro) => (
            <AstrologerCard key={astro.id} astrologer={astro} onPress={() => navigation.navigate('AstrologerDetail', { astrologerId: astro.id })} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
});
