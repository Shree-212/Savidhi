import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme';
import { appointmentService } from '../../services';
import { AppointmentCard } from '../../components/shared/AppointmentCard';
import type { AppointmentBooking } from '../../data';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const filterMap: Record<string, (b: AppointmentBooking) => boolean> = {
  all: () => true,
  upcoming: b => b.status === 'YET_TO_START',
  ongoing: b => b.status === 'MEET_IN_PROGRESS',
  completed: b => b.status === 'COMPLETE',
  cancelled: b => b.status === 'CANCELLED',
};

export function AppointmentBookingsScreen({ navigation }: { navigation: any }) {
  const [filter, setFilter] = useState('all');
  const [allAppointments, setAllAppointments] = useState<AppointmentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await appointmentService.list();
        const items = res.data?.data ?? res.data ?? [];
        const statusMap: Record<string, AppointmentBooking['status']> = {
          LINK_YET_TO_BE_GENERATED: 'YET_TO_START',
          INPROGRESS: 'MEET_IN_PROGRESS',
          COMPLETED: 'COMPLETE',
          CANCELLED: 'CANCELLED',
        };
        setAllAppointments(
          (Array.isArray(items) ? items : []).map((d: any) => ({
            id: d.id,
            astrologerName: d.astrologer_name ?? '',
            astrologerImage: d.astrologer_pic ?? '',
            date: d.scheduled_at ? new Date(d.scheduled_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
            timeSlot: d.scheduled_at ? new Date(d.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '',
            status: statusMap[d.status] ?? 'YET_TO_START',
            bookingId: d.id,
          }))
        );
      } catch (err) {
        console.error('AppointmentBookingsScreen fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const appointments = allAppointments.filter(filterMap[filter] || filterMap.all);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Appointment Bookings</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        horizontal
        data={FILTERS}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyExtractor={item => item.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, filter === item.key && styles.chipActive]}
            onPress={() => setFilter(item.key)}
          >
            <Text style={[styles.chipText, filter === item.key && styles.chipTextActive]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={appointments}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>No appointments found</Text>}
        renderItem={({ item }) => (
          <AppointmentCard appointment={item} onPress={() => navigation.navigate('AppointmentStatus', { bookingId: item.bookingId })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 50, paddingBottom: Spacing.md },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  chips: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  empty: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xxxl },
});
