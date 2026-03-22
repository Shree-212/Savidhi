import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, FlatList, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { pujaService, chadhavaService, panchangService } from '../../services';
import { PanchangData } from '../../data/models';
import { PanchangStrip } from '../../components/shared/PanchangStrip';
import { UpcomingBookingCard } from '../../components/shared/UpcomingBookingCard';
import { ChipToggle } from '../../components/shared/ChipToggle';
import { SearchBar } from '../../components/shared/SearchBar';
import { SectionHeader } from '../../components/shared/SectionHeader';
import { PujaCard } from '../../components/shared/PujaCard';
import { ChadhavaCard } from '../../components/shared/ChadhavaCard';

interface HomeScreenProps {
  navigation: any;
}

const SERVICE_CHIPS = [
  { key: 'puja', label: 'Puja', icon: 'fire' },
  { key: 'chadhava', label: 'Chadhava', icon: 'gift-outline' },
];

function mapPuja(p: any) {
  return {
    id: p.id,
    name: p.name,
    templeName: p.temple_name ?? '',
    templeLocation: p.temple_address ?? '',
    imageUrl: p.slider_images?.[0] ?? '',
    date: p.schedule_day ?? '',
    time: p.schedule_time ?? '',
    countdown: '',
    benefits: typeof p.benefits === 'string' ? p.benefits.split(',').map((s: string) => s.trim()) : p.benefits ?? [],
    ritualsIncluded: [],
    howToDo: [],
    videoThumbnail: p.sample_video_url ?? '',
    parcelContents: [],
    pricePerDevotee: Number(p.price_for_1 ?? 0),
    isWeekly: p.event_repeats ?? false,
    templeId: p.temple_id ?? '',
  };
}

function mapChadhava(c: any) {
  const offerings = (c.offerings ?? []).map((o: any) => ({
    id: o.id,
    name: o.item_name ?? o.name ?? '',
    description: o.benefit ?? '',
    price: Number(o.price ?? 0),
    imageUrl: o.images?.[0] ?? '',
  }));
  return {
    id: c.id,
    name: c.name,
    templeName: c.temple_name ?? '',
    templeLocation: c.temple_address ?? '',
    imageUrl: c.slider_images?.[0] ?? '',
    date: c.schedule_day ?? '',
    time: c.schedule_time ?? '',
    countdown: '',
    benefits: typeof c.benefits === 'string' ? c.benefits.split(',').map((s: string) => s.trim()) : c.benefits ?? [],
    ritualsIncluded: [],
    howToOffer: [],
    videoThumbnail: c.sample_video_url ?? '',
    parcelContents: [],
    offerings,
    templeId: c.temple_id ?? '',
    isWeekly: c.booking_mode === 'SUBSCRIPTION',
    startingPrice: Number(c.min_price ?? (offerings.length > 0 ? Math.min(...offerings.map((o: any) => o.price)) : 0)),
  };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [serviceType, setServiceType] = useState('puja');
  const [search, setSearch] = useState('');
  const [pujas, setPujas] = useState<any[]>([]);
  const [chadhavas, setChadhavas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [panchang, setPanchang] = useState<PanchangData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [pujasRes, chadhavasRes, panchangRes] = await Promise.allSettled([
          pujaService.list({ limit: 10 }),
          chadhavaService.list({ limit: 10 }),
          panchangService.get({ date: todayStr() }),
        ]);
        if (pujasRes.status === 'fulfilled' && pujasRes.value.data?.data) {
          setPujas(pujasRes.value.data.data.map(mapPuja));
        }
        if (chadhavasRes.status === 'fulfilled' && chadhavasRes.value.data?.data) {
          setChadhavas(chadhavasRes.value.data.data.map(mapChadhava));
        }
        if (panchangRes.status === 'fulfilled' && panchangRes.value.data?.success) {
          setPanchang(panchangRes.value.data.data as PanchangData);
        }
      } catch (err) {
        console.error('Failed to load home data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredPujas = pujas.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.templeName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredChadhavas = chadhavas.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.templeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Panchang Strip */}
        {panchang && (
          <PanchangStrip
            panchang={panchang}
            onPress={() => navigation.navigate('Panchang')}
          />
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Upcoming Bookings */}
        <SectionHeader title="Upcoming Bookings" />
        <FlatList
          horizontal
          data={[
            { id: '1', name: 'Kashi Viswanath Bhuta Su...', time: '2:00 PM' },
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UpcomingBookingCard
              pujaName={item.name}
              time={item.time}
              onPress={() => navigation.navigate('PujaStatus', { bookingId: item.id })}
            />
          )}
          showsHorizontalScrollIndicator={false}
          style={styles.upcomingList}
        />

        {/* Service Toggle */}
        <View style={styles.chipRow}>
          <ChipToggle
            options={SERVICE_CHIPS}
            selected={serviceType}
            onSelect={setServiceType}
          />
        </View>

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search"
        />

        {/* For You Section */}
        <SectionHeader title="For You" />

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : serviceType === 'puja' ? (
          filteredPujas.map((puja) => (
            <PujaCard
              key={puja.id}
              puja={puja}
              onPress={() => navigation.navigate('PujaDetail', { pujaId: puja.id })}
            />
          ))
        ) : (
          <View style={styles.chadhavaGrid}>
            {filteredChadhavas.map((chadhava) => (
              <ChadhavaCard
                key={chadhava.id}
                chadhava={chadhava}
                onPress={() => navigation.navigate('ChadhavaDetail', { chadhavaId: chadhava.id })}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  divider: {
    height: 3,
    width: 60,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    borderRadius: 2,
    marginVertical: Spacing.md,
  },
  upcomingList: {
    marginBottom: Spacing.lg,
  },
  chipRow: {
    marginBottom: Spacing.lg,
  },
  chadhavaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
