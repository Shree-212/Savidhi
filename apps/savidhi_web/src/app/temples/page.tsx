'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SearchBar } from '@/components/shared/SearchBar';
import { TempleCard } from '@/components/shared/TempleCard';
import { templeService } from '@/lib/services';
import { mapTemple } from '@/lib/mappers';
import type { Temple } from '@/data/models';
import { useLocale } from '@/lib/i18n';

export default function TempleListPage() {
  const [search, setSearch] = useState('');
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { locale } = useLocale();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await templeService.list({ limit: 50 });
        setTemples((res.data?.data ?? []).map(mapTemple));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load temples');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locale]);

  const filtered = temples.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-container py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Explore Temples</h1>
      <div className="max-w-md my-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search temples..." />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-12">{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((temple: any) => (
            <TempleCard key={temple.id} temple={temple} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-text-muted py-12">No temples found</p>
          )}
        </div>
      )}
    </div>
  );
}
