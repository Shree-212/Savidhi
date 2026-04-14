'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { SearchBar } from '@/components/shared/SearchBar';
import { ChadhavaCard } from '@/components/shared/ChadhavaCard';
import { chadhavaService } from '@/lib/services';
import { mapChadhava } from '@/lib/mappers';

export default function ChadhavaListPage() {
  const [search, setSearch] = useState('');
  const [chadhavas, setChadhavas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await chadhavaService.list({ limit: 50 });
        setChadhavas((res.data?.data ?? []).map(mapChadhava));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load chadhavas');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = chadhavas.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.templeName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-container py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Offer Chadhava</h1>
      <p className="text-sm text-text-secondary mb-6">Sacred offerings at revered temples</p>
      <div className="max-w-md mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search chadhava or temples..." />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-center text-red-500 py-12">{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((chadhava: any) => (
            <ChadhavaCard key={chadhava.id} chadhava={chadhava} />
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-text-muted py-12">No chadhava found</p>
          )}
        </div>
      )}
    </div>
  );
}
