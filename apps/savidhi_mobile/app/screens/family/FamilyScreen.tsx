import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors } from '../../theme/colors';
import { familyApi, FamilyMember } from '../../services/extra';

type Tab = 'Accepted' | 'Received' | 'Sent';

export const FamilyScreen: React.FC = () => {
  const [tab, setTab] = useState<Tab>('Accepted');
  const [accepted, setAccepted] = useState<FamilyMember[]>([]);
  const [received, setReceived] = useState<FamilyMember[]>([]);
  const [sent, setSent] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newRelation, setNewRelation] = useState('Brother');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await familyApi.list();
      const d = res.data.data;
      setAccepted(d.accepted); setReceived(d.received); setSent(d.sent);
    } catch (err: any) {
      console.warn('family load failed', err?.response?.data ?? err.message);
    }
  }, []);

  useEffect(() => {
    (async () => { setLoading(true); await load(); setLoading(false); })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  const handleInvite = async () => {
    if (!/^\d{10}$/.test(newPhone)) return Alert.alert('Invalid phone', 'Enter a 10-digit phone number');
    if (!newRelation.trim()) return Alert.alert('Missing relation', 'Select a relation');
    try {
      setBusy(true);
      await familyApi.invite(newPhone, newRelation);
      setAddOpen(false);
      setNewPhone(''); setNewRelation('Brother');
      await load();
      setTab('Sent');
    } catch (err: any) {
      Alert.alert('Invite failed', err?.response?.data?.message ?? err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAccept = async (m: FamilyMember) => {
    try { setBusy(true); await familyApi.accept(m.id); await load(); }
    catch (err: any) { Alert.alert('Accept failed', err?.response?.data?.message ?? err.message); }
    finally { setBusy(false); }
  };

  const handleReject = async (m: FamilyMember) => {
    Alert.alert('Reject request?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try { setBusy(true); await familyApi.reject(m.id); await load(); }
        catch (err: any) { Alert.alert('Reject failed', err?.response?.data?.message ?? err.message); }
        finally { setBusy(false); }
      }},
    ]);
  };

  const handleRemove = async (m: FamilyMember) => {
    Alert.alert('Remove link?', 'This removes the family connection for both parties.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await familyApi.remove(m.id); await load(); }
        catch (err: any) { Alert.alert('Remove failed', err?.response?.data?.message ?? err.message); }
      }},
    ]);
  };

  const list = tab === 'Accepted' ? accepted : tab === 'Received' ? received : sent;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Family</Text>
        <TouchableOpacity onPress={() => setAddOpen(true)} style={styles.addBtn}>
          <Icon name="plus" size={18} color={Colors.textWhite} />
          <Text style={styles.addText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['Accepted', 'Received', 'Sent'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t} {t === 'Received' && received.length > 0 ? `(${received.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={list}
        keyExtractor={(m) => m.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Icon name="account-multiple-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {tab === 'Accepted' && 'No family members yet'}
              {tab === 'Received' && 'No pending requests'}
              {tab === 'Sent' && 'No outgoing invites'}
            </Text>
            <Text style={styles.emptySub}>
              {tab === 'Accepted' ? 'Add family members so their names auto-fill your puja bookings.' : ''}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}><Text style={styles.avatarInitial}>{item.other.name?.[0] ?? '?'}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{item.other.name}</Text>
              <Text style={styles.rowMeta}>
                {item.relation} · {item.other.phone}
              </Text>
            </View>
            {tab === 'Received' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAccept(item)} disabled={busy}>
                  <Text style={styles.primaryBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => handleReject(item)} disabled={busy}>
                  <Text style={styles.outlineBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
            {tab !== 'Received' && (
              <TouchableOpacity onPress={() => handleRemove(item)}>
                <Icon name="close-circle-outline" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      {/* Add modal */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invite Family Member</Text>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={newPhone}
              onChangeText={(v) => setNewPhone(v.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile"
              keyboardType="number-pad"
              maxLength={10}
            />
            <Text style={styles.label}>Relation</Text>
            <View style={styles.chipRow}>
              {['Father', 'Mother', 'Spouse', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, newRelation === r && styles.chipActive]}
                  onPress={() => setNewRelation(r)}
                >
                  <Text style={[styles.chipText, newRelation === r && styles.chipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={[styles.outlineBtn, { flex: 1 }]} onPress={() => setAddOpen(false)}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleInvite} disabled={busy}>
                <Text style={styles.primaryBtnText}>{busy ? 'Sending…' : 'Send Invite'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  addText: { color: Colors.textWhite, fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: Colors.surface, paddingHorizontal: 12, paddingBottom: 4, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 16 },
  tabActive: { backgroundColor: Colors.orangeLight },
  tabText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.orangeLight, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  rowName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  rowMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  primaryBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: Colors.textWhite, fontSize: 12, fontWeight: '600' },
  outlineBtn: { borderWidth: 1, borderColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { color: Colors.primary, fontSize: 12, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', padding: 40, marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, marginTop: 12 },
  emptySub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 260 },
  modalScrim: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
  label: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.background },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.textWhite, fontWeight: '600' },
});
