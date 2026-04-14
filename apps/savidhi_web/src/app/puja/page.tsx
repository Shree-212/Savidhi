'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SearchBar } from '@/components/shared/SearchBar';
import { PujaCard } from '@/components/shared/PujaCard';
import { pujaService } from '@/lib/services';
import { mapPuja } from '@/lib/mappers';

export default function PujaListPage() {
  const [search, setSearch] = useState('');
  const [pujas, setPujas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await pujaService.list({ limit: 50 });
        setPujas((res.data?.data ?? []).map(mapPuja));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load pujas');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = pujas.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.templeName || p.temple?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-container py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Book A Puja</h1>
      <p className="text-sm text-text-secondary mb-6">Choose from 100+ authentic pujas across sacred temples</p>
      <div className="max-w-md mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search pujas or temples..." />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-12">{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((puja: any) => (
            <PujaCard key={puja.id} puja={puja} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-text-muted py-12">No pujas found</p>
          )}
        </div>
      )}
    </div>
  );
}
