'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/shared/SearchBar';
import { TempleCard } from '@/components/shared/TempleCard';
import { ChipToggle } from '@/components/shared/ChipToggle';
import { MOCK_TEMPLES } from '@/data';

const TABS = ['Temples', 'Deities', 'Near You'];

export default function TempleListPage() {
  const [tab, setTab] = useState('Temples');
  const [search, setSearch] = useState('');
  const filtered = MOCK_TEMPLES.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-container py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Explore Temples</h1>
      <ChipToggle options={TABS} selected={tab} onSelect={setTab} />
      <div className="max-w-md my-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search temples..." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((temple) => (
          <TempleCard key={temple.id} temple={temple} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-text-muted py-12">No temples found</p>
        )}
      </div>
    </div>
  );
}
