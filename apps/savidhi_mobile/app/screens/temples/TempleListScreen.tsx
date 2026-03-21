import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { templeService } from '../../services';
import { ChipToggle } from '../../components/shared/ChipToggle';
import { SearchBar } from '../../components/shared/SearchBar';
import { TempleCard } from '../../components/shared/TempleCard';
import type { Temple } from '../../data';

const TABS = [
  { key: 'temples', label: 'Temples', icon: 'temple-hindu' },
  { key: 'deities', label: 'Deities', icon: 'account-heart-outline' },
  { key: 'near', label: 'Near You', icon: 'map-marker-radius-outline' },
];

export function TempleListScreen({ navigation }: { navigation: any }) {
  const [tab, setTab] = useState('temples');
  const [search, setSearch] = useState('');
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await templeService.list({ search: search || undefined });
        const items = res.data?.data ?? res.data ?? [];
        setTemples(
          (Array.isArray(items) ? items : []).map((d: any) => ({
            id: d.id,
            name: d.name,
            location: d.address ?? '',
            pincode: d.pincode ?? '',
            images: d.slider_images ?? [],
            pujaris: (d.pujaris ?? []).map((p: any) => ({
              id: p.id,
              name: p.name,
              role: p.designation ?? '',
              imageUrl: p.profile_pic ?? '',
            })),
            about: d.about ?? '',
            history: d.history_and_significance ?? '',
            videoThumbnail: '',
            pujaCount: d.pujas_offered?.length ?? 0,
            pujasOffered: d.pujas_offered ?? [],
            chadhavasOffered: d.chadhavas_offered ?? [],
          }))
        );
      } catch (err) {
        console.error('TempleListScreen fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ChipToggle options={TABS} selected={tab} onSelect={setTab} />
        <View style={styles.searchContainer}>
          <SearchBar value={search} onChangeText={setSearch} />
        </View>
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          temples.map((temple) => (
            <TempleCard key={temple.id} temple={temple} onPress={() => navigation.navigate('TempleDetail', { templeId: temple.id })} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  searchContainer: { marginVertical: Spacing.md },
});
