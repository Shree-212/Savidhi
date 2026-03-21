'use client';

import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/shared/SearchBar';
import { TempleCard } from '@/components/shared/TempleCard';
import { ChipToggle } from '@/components/shared/ChipToggle';
import { MOCK_TEMPLES } from '@/data';
import { templeService } from '@/lib/services';

const TABS = ['Temples', 'Deities', 'Near You'];

export default function TempleListPage() {
  const [tab, setTab] = useState('Temples');
  const [search, setSearch] = useState('');
  const [temples, setTemples] = useState(MOCK_TEMPLES);

  useEffect(() => {
    async function load() {
      try {
        const res = await templeService.list({ limit: 50 });
        if (res.data?.success && res.data.data?.length > 0) {
          const apiTemples = res.data.data.map((t: any) => ({
            id: t.id,
            name: t.name,
            location: t.address,
            pincode: t.pincode,
            images: t.slider_images || [],
            pujaris: [],
            about: t.about,
            history: t.history_and_significance,
            stats: { pujasPerformed: t.pujas_count || 0, devoteeServed: 0 },
          }));
          setTemples(apiTemples);
        }
      } catch {
        // Silently fall back to mock data
      }
    }
    load();
  }, []);

  const filtered = temples.filter((t: any) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-container py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Explore Temples</h1>
      <ChipToggle options={TABS} selected={tab} onSelect={setTab} />
      <div className="max-w-md my-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search temples..." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((temple: any) => (
          <TempleCard key={temple.id} temple={temple} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-text-muted py-12">No temples found</p>
        )}
      </div>
    </div>
  );
}
