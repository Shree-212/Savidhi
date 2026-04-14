'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SearchBar } from '@/components/shared/SearchBar';
import { AstrologerCard } from '@/components/shared/AstrologerCard';
import { astrologerService } from '@/lib/services';
import { mapAstrologer } from '@/lib/mappers';
import type { Astrologer } from '@/data/models';

export default function ConsultPage() {
  const [search, setSearch] = useState('');
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await astrologerService.list({ limit: 50 });
        setAstrologers((res.data?.data ?? []).map(mapAstrologer));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load astrologers');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = astrologers.filter((a: any) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.specialty || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-container py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Consult An Astrologer</h1>
      <p className="text-sm text-text-secondary mb-6">Talk to Vedic experts for guidance</p>
      <div className="max-w-md mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search astrologers..." />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-12">{error}</p>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {filtered.map((astro: any) => (
            <AstrologerCard key={astro.id} astrologer={astro} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-text-muted py-12">No astrologers found</p>
          )}
        </div>
      )}
    </div>
  );
}
