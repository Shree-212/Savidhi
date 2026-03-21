'use client';

import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/shared/SearchBar';
import { AstrologerCard } from '@/components/shared/AstrologerCard';
import { MOCK_ASTROLOGERS } from '@/data';
import { astrologerService } from '@/lib/services';

export default function ConsultPage() {
  const [search, setSearch] = useState('');
  const [astrologers, setAstrologers] = useState(MOCK_ASTROLOGERS);

  useEffect(() => {
    async function load() {
      try {
        const res = await astrologerService.list({ limit: 50 });
        if (res.data?.success && res.data.data?.length > 0) {
          const apiAstrologers = res.data.data.map((a: any) => ({
            id: a.id,
            name: a.name,
            specialty: a.designation || '',
            experience: `${a.start_date ? new Date().getFullYear() - new Date(a.start_date).getFullYear() : 10} Years Of Experience`,
            pricePerMin: a.price_15min ? Math.round(a.price_15min / 15) : 61,
            appointmentsCompleted: a.total_appointments || 0,
            rating: a.rating || 4.5,
            languages: a.languages || [],
            expertise: (a.expertise || '').split(', '),
            about: a.about || '',
            image: a.profile_pic || '',
            images: a.slider_images || [],
          }));
          setAstrologers(apiAstrologers);
        }
      } catch {
        // Silently fall back to mock data
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
      <div className="space-y-4 max-w-2xl">
        {filtered.map((astro: any) => (
          <AstrologerCard key={astro.id} astrologer={astro} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-text-muted py-12">No astrologers found</p>
        )}
      </div>
    </div>
  );
}
