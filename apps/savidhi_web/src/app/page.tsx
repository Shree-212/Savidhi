'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  BookOpen,
  Gift,
  Users,
  Landmark,
  CalendarDays,
  Gem,
  ArrowUpRight,
} from 'lucide-react';
import { PujaCard } from '@/components/shared/PujaCard';
import { ChadhavaCard } from '@/components/shared/ChadhavaCard';
import { TempleCard } from '@/components/shared/TempleCard';
import { MOCK_PUJAS, MOCK_CHADHAVAS, MOCK_TEMPLES } from '@/data';
import { templeService, pujaService, chadhavaService } from '@/lib/services';
import heroBg from '@/assets/hero-bg.png';

const HOW_TO_STEPS = [
  { num: 1, title: 'Select A Puja As Per Your Need' },
  { num: 2, title: 'Provide Name, Gotra & Sankalp Details' },
  { num: 3, title: 'Receive Prasad & Hamper At Home' },
  { num: 4, title: 'Get Blessings For Family From Home' },
];

const SERVICES = [
  {
    icon: BookOpen,
    title: 'Book Pujas',
    description: 'Book Puja Nifebebf jebebvfjev Ebe Bet Kasre Ashi Jon Ebe',
    href: '/puja',
  },
  {
    icon: Gift,
    title: 'Book Chadhava',
    description: 'Book Chadhava Nifebebf jebebvfjvv Ebe Bet Kasre Ashi Jon Ebe',
    href: '/chadhava',
  },
  {
    icon: Users,
    title: 'Astrology Appointments',
    description: 'Book Astro Nifebebf jebebvfjvv Ebe Bet Kasre Ashi Jon Ebe',
    href: '/consult',
  },
  {
    icon: Landmark,
    title: 'Discover Temples',
    description: 'Discover Famous Temples Across India Which Have Mentioned In A History Like Which Have The...',
    href: '/temples',
  },
  {
    icon: CalendarDays,
    title: 'Know Panchang & Tithi',
    description: 'Read About Arik Panchage Jeeth Hojele Ahrb Ebe Sphrleshlo Ejdsbjei Duhften',
    href: '/panchang',
  },
  {
    icon: Gem,
    title: 'Track Your Devotee Journey',
    description: 'Track HH Fhjbjf Jle Jewith Hojele Ahrb Ebe Fljflebejk Sphrleshlo Ejdsbjei Duhften',
    href: '/points',
  },
];

/* ── Scroll helper for carousels ── */
function useHorizontalScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (!ref.current) return;
    const amount = ref.current.clientWidth * 0.75;
    ref.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };
  return { ref, scroll };
}

function CarouselNav({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onLeft}
        className="w-8 h-8 rounded-full border border-border-DEFAULT flex items-center justify-center hover:bg-primary-50 transition"
      >
        <ChevronLeft className="w-4 h-4 text-text-secondary" />
      </button>
      <button
        onClick={onRight}
        className="w-8 h-8 rounded-full border border-border-DEFAULT flex items-center justify-center hover:bg-primary-50 transition"
      >
        <ChevronRight className="w-4 h-4 text-text-secondary" />
      </button>
    </div>
  );
}

export default function HomePage() {
  const pujaScroll = useHorizontalScroll();
  const chadhavaScroll = useHorizontalScroll();
  const templeScroll = useHorizontalScroll();

  // Fetch real data from API, fallback to mock
  const [pujas, setPujas] = useState(MOCK_PUJAS);
  const [chadhavas, setChadhavas] = useState(MOCK_CHADHAVAS);
  const [temples, setTemples] = useState(MOCK_TEMPLES);

  useEffect(() => {
    async function loadData() {
      try {
        const [pujasRes, chadhavasRes, templesRes] = await Promise.allSettled([
          pujaService.list({ limit: 10 }),
          chadhavaService.list({ limit: 10 }),
          templeService.list({ limit: 10 }),
        ]);

        if (pujasRes.status === 'fulfilled' && pujasRes.value.data?.success && pujasRes.value.data.data?.length > 0) {
          const apiPujas = pujasRes.value.data.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            temple: { name: p.temple_name || p.temple?.name || 'Temple', location: p.temple_address || '' },
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

        if (chadhavasRes.status === 'fulfilled' && chadhavasRes.value.data?.success && chadhavasRes.value.data.data?.length > 0) {
          const apiChadhavas = chadhavasRes.value.data.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            temple: { name: c.temple_name || 'Temple', location: c.temple_address || '' },
            date: c.schedule_day || 'Everyday',
            time: c.schedule_time || '',
            countdown: { days: 0, hours: 12, minutes: 30, seconds: 14 },
            offerings: c.offerings || [],
            images: c.slider_images || [],
          }));
          setChadhavas(apiChadhavas);
        }

        if (templesRes.status === 'fulfilled' && templesRes.value.data?.success && templesRes.value.data.data?.length > 0) {
          const apiTemples = templesRes.value.data.data.map((t: any) => ({
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
    loadData();
  }, []);

  return (
    <div className="min-h-screen">
      {/* ═══════════ HERO BANNER ═══════════ */}
      {/* Desktop: text overlaid on hero image. Mobile: stacked vertically */}

      {/* ── Mobile Hero (< md) ── */}
      <section className="md:hidden bg-[#FBF5EB] overflow-hidden">
        {/* Text block — stacked above illustration */}
        <div className="px-5 pt-8 pb-5 text-center">
          <h1 className="[font-family:var(--font-cabin)] text-[1.625rem] font-bold text-[#502C06] tracking-[0.12em] uppercase leading-snug">
            Puja & Consultation
          </h1>
          <p className="[font-family:var(--font-cabin)] text-[1.625rem] font-bold text-primary-500 uppercase tracking-[0.12em] mt-5 leading-snug">
            Made Easy
          </p>
          <p className="[font-family:var(--font-cabin)] text-sm font-semibold text-[#6E6E6E] mt-2 tracking-wide">
            Trusted By 50000+ Devotee
          </p>

          <div className="flex flex-col gap-3 mt-5">
            <Link
              href="/puja"
              className="bg-primary-500 hover:bg-primary-600 text-[#FFF7F0] [font-family:var(--font-cabin)] font-semibold py-3 rounded-full text-base transition text-center"
            >
              Book Puja
            </Link>
            <button className="flex items-center justify-center gap-2 border border-[#502C06] rounded-full py-3 text-base [font-family:var(--font-cabin)] font-normal text-[#502C06] hover:bg-[#502C06]/5 transition">
              Download App
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.52-1.28 1-1.5l10 10-10 10c-.48-.22-1-.67-1-1.5zm14.54-7.77L5.04 2.03l11.37 6.37 1.13.63zm1.97 1.1l-1.97-1.1-1.97 1.1 1.97 1.1 1.97-1.1zM5.04 21.97l12.5-10.7-1.13-.63-11.37 6.37z"/></svg>
              </span>
            </button>
          </div>
        </div>

        {/* Temple illustration below */}
        <div className="w-full">
          <Image
            src={heroBg}
            alt="Temple illustration"
            className="w-full h-auto block"
            priority
            sizes="100vw"
          />
        </div>
      </section>

      {/* ── Desktop Hero (>= md) ── */}
      <section className="hidden md:block relative overflow-hidden">
        <div className="relative w-full">
          <Image
            src={heroBg}
            alt="Temple illustration"
            className="w-full h-auto block"
            priority
            sizes="100vw"
          />

          {/* Text content overlaid on top of the image */}
          <div className="absolute inset-0 flex flex-col items-center justify-start pt-8 lg:pt-12 xl:pt-16 px-4">
            <h1 className="[font-family:var(--font-cabin)] text-3xl md:text-4xl lg:text-[3rem] xl:text-[3.5rem] font-bold text-[#502C06] tracking-[0.12em] uppercase leading-tight text-center">
              Puja & Consultation
            </h1>
            <p className="[font-family:var(--font-cabin)] text-2xl md:text-3xl lg:text-[2.5rem] xl:text-[2.75rem] font-bold text-primary-500 uppercase tracking-[0.12em] mt-10 lg:mt-14 leading-tight text-center">
              Made Easy
            </p>
            <p className="text-sm lg:text-base text-text-muted mt-2 lg:mt-3 text-center tracking-wide">
              Trusted By 50000+ Devotee
            </p>

            <div className="flex items-center justify-center gap-4 mt-5 lg:mt-7">
              <Link
                href="/puja"
                className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-10 py-3 rounded-full text-sm lg:text-base transition"
              >
                Book Puja
              </Link>
              <button className="flex items-center gap-2 border border-text-primary rounded-full px-8 py-3 text-sm lg:text-base font-medium text-text-primary hover:bg-gray-50/80 transition bg-white/60 backdrop-blur-sm">
                Download App
                <span className="flex items-center gap-1.5 ml-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 20.5v-17c0-.83.52-1.28 1-1.5l10 10-10 10c-.48-.22-1-.67-1-1.5zm14.54-7.77L5.04 2.03l11.37 6.37 1.13.63zm1.97 1.1l-1.97-1.1-1.97 1.1 1.97 1.1 1.97-1.1zM5.04 21.97l12.5-10.7-1.13-.63-11.37 6.37z"/></svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ UPCOMING PUJAS CAROUSEL ═══════════ */}
      <section className="section-container py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Upcoming Pujas</h2>
          <CarouselNav
            onLeft={() => pujaScroll.scroll('left')}
            onRight={() => pujaScroll.scroll('right')}
          />
        </div>
        <div
          ref={pujaScroll.ref}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        >
          {pujas.map((puja) => (
            <div key={puja.id} className="min-w-[260px] sm:min-w-[280px] snap-start">
              <PujaCard puja={puja} />
            </div>
          ))}
          {/* Duplicate for more scrollable content */}
          {pujas.map((puja) => (
            <div key={`dup-${puja.id}`} className="min-w-[260px] sm:min-w-[280px] snap-start">
              <PujaCard puja={puja} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ HOW TO BOOK ═══════════ */}
      <section className="bg-white py-10">
        <div className="section-container">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-6">
            How To Book Puja With Savidhi?
          </h2>
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Steps */}
            <div className="space-y-5">
              {HOW_TO_STEPS.map((step) => (
                <div key={step.num} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {step.num}
                  </div>
                  <p className="text-sm sm:text-base text-text-primary pt-1">{step.title}</p>
                </div>
              ))}
            </div>

            {/* Video Thumbnail */}
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-orange-100 to-orange-50 shadow-lg group cursor-pointer">
              <Image
                src="https://images.unsplash.com/photo-1604608672516-f1b9b1d71e86?w=800"
                alt="How to book puja"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-primary-500 ml-1 fill-primary-500" />
                </div>
              </div>
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <p className="text-xs font-semibold text-text-primary">how to use</p>
                <p className="text-sm font-bold text-primary-500">book puja</p>
              </div>
              <div className="absolute bottom-4 left-4">
                <span className="bg-primary-500 text-white text-xs font-semibold rounded-full px-4 py-1.5">
                  Learn More
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ DAILY CHADHAVA CAROUSEL ═══════════ */}
      <section className="section-container py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">Daily Chadhava</h2>
          <CarouselNav
            onLeft={() => chadhavaScroll.scroll('left')}
            onRight={() => chadhavaScroll.scroll('right')}
          />
        </div>
        <div
          ref={chadhavaScroll.ref}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        >
          {chadhavas.map((c) => (
            <div key={c.id} className="min-w-[260px] sm:min-w-[280px] snap-start">
              <ChadhavaCard chadhava={c} />
            </div>
          ))}
          {chadhavas.map((c) => (
            <div key={`dup-${c.id}`} className="min-w-[260px] sm:min-w-[280px] snap-start">
              <ChadhavaCard chadhava={c} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ OUR SERVICES ═══════════ */}
      <section className="bg-white py-10">
        <div className="section-container">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-6">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((s) => (
              <Link key={s.href} href={s.href} className="group">
                <div className="card p-5 hover:shadow-md hover:border-primary-200 transition-all h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
                      <s.icon className="w-6 h-6 text-primary-500" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-primary-500 transition" />
                  </div>
                  <h3 className="font-bold text-sm text-primary-500 underline decoration-primary-300 underline-offset-2 mb-1.5">
                    {s.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">{s.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ EXPLORE PARTNERED TEMPLES ═══════════ */}
      <section className="section-container py-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-text-primary">
            Explore Our Exclusive Partnered Temples
          </h2>
          <CarouselNav
            onLeft={() => templeScroll.scroll('left')}
            onRight={() => templeScroll.scroll('right')}
          />
        </div>
        <div
          ref={templeScroll.ref}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        >
          {temples.map((temple) => (
            <div key={temple.id} className="min-w-[260px] sm:min-w-[300px] snap-start">
              <TempleCard temple={temple} />
            </div>
          ))}
          {temples.map((temple) => (
            <div key={`dup-${temple.id}`} className="min-w-[260px] sm:min-w-[300px] snap-start">
              <TempleCard temple={temple} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
