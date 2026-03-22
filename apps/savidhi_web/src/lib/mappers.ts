import type { Puja, Chadhava, Temple, Astrologer } from '@/data/models';

/**
 * Maps API snake_case puja response to frontend Puja model.
 */
export function mapPuja(raw: any): Puja {
  return {
    id: raw.id,
    name: raw.name,
    templeName: raw.temple_name ?? raw.templeName ?? '',
    templeLocation: raw.temple_address ?? raw.templeLocation ?? '',
    imageUrl: raw.slider_images?.[0] ?? raw.imageUrl ?? '',
    sliderImages: raw.slider_images ?? [],
    date: raw.schedule_day ?? raw.date ?? '',
    time: raw.schedule_time ?? raw.time ?? '',
    countdown: raw.countdown ?? '',
    benefits: parseCsvOrArray(raw.benefits),
    ritualsIncluded: parseCsvOrArray(raw.rituals_included ?? raw.ritualsIncluded),
    howToDo: raw.howToDo ?? [],
    videoThumbnail: raw.sample_video_url ?? raw.videoThumbnail ?? '',
    parcelContents: raw.parcelContents ?? [],
    pricePerDevotee: Number(raw.price_for_1 ?? raw.pricePerDevotee ?? 0),
    isWeekly: raw.event_repeats ?? raw.isWeekly ?? false,
    templeId: raw.temple_id ?? raw.templeId ?? '',
  };
}

/**
 * Maps API snake_case chadhava response to frontend Chadhava model.
 */
export function mapChadhava(raw: any): Chadhava {
  const offerings = (raw.offerings ?? []).map((o: any) => ({
    id: o.id,
    name: o.item_name ?? o.name ?? '',
    description: o.benefit ?? o.description ?? '',
    price: Number(o.price ?? 0),
    imageUrl: o.images?.[0] ?? o.imageUrl ?? '',
  }));
  return {
    id: raw.id,
    name: raw.name,
    templeName: raw.temple_name ?? raw.templeName ?? '',
    templeLocation: raw.temple_address ?? raw.templeLocation ?? '',
    imageUrl: raw.slider_images?.[0] ?? raw.imageUrl ?? '',
    sliderImages: raw.slider_images ?? [],
    date: raw.schedule_day ?? raw.date ?? '',
    time: raw.schedule_time ?? raw.time ?? '',
    countdown: raw.countdown ?? '',
    benefits: parseCsvOrArray(raw.benefits),
    ritualsIncluded: parseCsvOrArray(raw.rituals_included ?? raw.ritualsIncluded),
    howToOffer: raw.howToOffer ?? [],
    videoThumbnail: raw.sample_video_url ?? raw.videoThumbnail ?? '',
    parcelContents: raw.parcelContents ?? [],
    offerings,
    templeId: raw.temple_id ?? raw.templeId ?? '',
    isWeekly: raw.booking_mode === 'SUBSCRIPTION' || raw.isWeekly,
    startingPrice: Number(raw.min_price ?? (offerings.length > 0 ? Math.min(...offerings.map((o: any) => o.price)) : 0)),
  };
}

/**
 * Maps API snake_case temple response to frontend Temple model.
 */
export function mapTemple(raw: any): Temple {
  return {
    id: raw.id,
    name: raw.name,
    location: raw.address ?? raw.location ?? '',
    pincode: raw.pincode ?? '',
    images: raw.slider_images ?? raw.images ?? [],
    pujaris: (raw.pujaris ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      role: p.designation ?? p.role ?? '',
      imageUrl: p.profile_pic ?? p.imageUrl ?? '',
    })),
    about: raw.about ?? '',
    history: raw.history_and_significance ?? raw.history ?? '',
    videoThumbnail: raw.sample_video_url ?? raw.videoThumbnail ?? '',
    pujaCount: raw.pujas_count ?? raw.pujaCount ?? 0,
    pujasOffered: (raw.pujas_offered ?? []).map((p: any) => p.name ?? p),
    chadhavasOffered: (raw.chadhavas_offered ?? []).map((c: any) => c.name ?? c),
  };
}

/**
 * Maps API snake_case astrologer response to frontend Astrologer model.
 */
export function mapAstrologer(raw: any): Astrologer {
  return {
    id: raw.id,
    name: raw.name,
    specialty: raw.designation ?? raw.specialty ?? '',
    experience: raw.experience ?? (raw.start_date ? `${Math.floor((Date.now() - new Date(raw.start_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} Years Of Experience` : ''),
    pricePerMin: Number(raw.price_15min ?? raw.pricePerMin ?? 0) / 15,
    imageUrl: raw.profile_pic ?? raw.imageUrl ?? '',
    images: raw.slider_images ?? raw.images ?? [],
    appointmentsBooked: raw.appointments_count ?? raw.appointmentsBooked ?? 0,
    languages: raw.languages ?? [],
    expertise: parseCsvOrArray(raw.expertise),
    about: raw.about ?? '',
    isBookmarked: raw.isBookmarked ?? false,
  };
}

function parseCsvOrArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(',').map((s: string) => s.trim()).filter(Boolean);
  return [];
}
