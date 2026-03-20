'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/shared/SearchBar';
import { AstrologerCard } from '@/components/shared/AstrologerCard';
import { MOCK_ASTROLOGERS } from '@/data';

export default function ConsultPage() {
  const [search, setSearch] = useState('');
  const filtered = MOCK_ASTROLOGERS.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="section-container py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Consult An Astrologer</h1>
      <p className="text-sm text-text-secondary mb-6">Talk to Vedic experts for guidance</p>
      <div className="max-w-md mb-6">
        <SearchBar value={search} onChange={setSearch} placeholder="Search astrologers..." />
      </div>
      <div className="space-y-4 max-w-2xl">
        {filtered.map((astro) => (
          <AstrologerCard key={astro.id} astrologer={astro} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-text-muted py-12">No astrologers found</p>
        )}
      </div>
    </div>
  );
}
