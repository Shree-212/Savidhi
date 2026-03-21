'use client';

import { useState, useEffect } from 'react';
import { SearchBar } from '@/components/shared/SearchBar';
import { PujaCard } from '@/components/shared/PujaCard';
import { MOCK_PUJAS } from '@/data';
import { pujaService } from '@/lib/services';

export default function PujaListPage() {
  const [search, setSearch] = useState('');
  const [pujas, setPujas] = useState(MOCK_PUJAS);

  useEffect(() => {
    async function load() {
      try {
        const res = await pujaService.list({ limit: 50 });
        if (res.data?.success && res.data.data?.length > 0) {
          const apiPujas = res.data.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            templeName: p.temple_name || '',
            temple: { name: p.temple_name || 'Temple', location: p.temple_address || '' },
            date: p.schedule_day || 'Everyday',
            time: p.schedule_time || '',
            countdown: { days: 0, hours: 12, minutes: 30, seconds: 14 },
            benefits: (p.benefits || '').split(', '),
            ritualsIncluded: (p.rituals_included || '').split(', '),
            prices: { for1: p.price_for_1, for2: p.price_for_2, for4: p.price_for_4, for6: p.price_for_6 },
            images: p.slider_images || [],
            sampleVideoUrl: p.sample_video_url || '',
          }));
          setPujas(apiPujas);
        }
      } catch {
        // Silently fall back to mock data
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((puja: any) => (
          <PujaCard key={puja.id} puja={puja} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-text-muted py-12">No pujas found</p>
        )}
      </div>
    </div>
  );
}
