'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/shared/SearchBar';
import { PujaCard } from '@/components/shared/PujaCard';
import { MOCK_PUJAS } from '@/data';

export default function PujaListPage() {
  const [search, setSearch] = useState('');
  const filtered = MOCK_PUJAS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.templeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-container py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Book A Puja</h1>
      <p className="text-sm text-text-secondary mb-6">Choose from 100+ authentic pujas across sacred temples</p>
      <div className="max-w-md mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search pujas or temples..." />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((puja) => (
          <PujaCard key={puja.id} puja={puja} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-text-muted py-12">No pujas found</p>
        )}
      </div>
    </div>
  );
}
