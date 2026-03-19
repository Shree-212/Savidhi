import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, FlatList, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';
import { MOCK_PUJAS, MOCK_PANCHANG, MOCK_CHADHAVAS } from '../../data';
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

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [serviceType, setServiceType] = useState('puja');
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Panchang Header */}
        <PanchangStrip
          panchang={MOCK_PANCHANG}
          onPress={() => navigation.navigate('Panchang')}
        />

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

        {serviceType === 'puja' ? (
          MOCK_PUJAS.map((puja) => (
            <PujaCard
              key={puja.id}
              puja={puja}
              onPress={() => navigation.navigate('PujaDetail', { pujaId: puja.id })}
            />
          ))
        ) : (
          <View style={styles.chadhavaGrid}>
            {MOCK_CHADHAVAS.map((chadhava) => (
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
