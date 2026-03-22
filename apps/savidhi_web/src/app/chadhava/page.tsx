'use client';

import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/shared/SearchBar';
import { ChadhavaCard } from '@/components/shared/ChadhavaCard';
import { MOCK_CHADHAVAS } from '@/data';
import { chadhavaService } from '@/lib/services';
import { mapChadhava } from '@/lib/mappers';

export default function ChadhavaListPage() {
  const [search, setSearch] = useState('');
  const [chadhavas, setChadhavas] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await chadhavaService.list({ limit: 50 });
        if (res.data?.success && res.data.data?.length > 0) {
          setChadhavas(res.data.data.map(mapChadhava));
        } else {
          setChadhavas(MOCK_CHADHAVAS);
        }
      } catch {
        setChadhavas(MOCK_CHADHAVAS);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((chadhava: any) => (
          <ChadhavaCard key={chadhava.id} chadhava={chadhava} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-text-muted py-12">No chadhava found</p>
        )}
      </div>
    </div>
  );
}
