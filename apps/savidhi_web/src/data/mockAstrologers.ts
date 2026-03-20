import { Astrologer, DurationOption } from './models';

export const MOCK_ASTROLOGERS: Astrologer[] = [
  {
    id: 'astro-1',
    name: 'Gopal Dash',
    specialty: 'Vedic Pandeet',
    experience: '10 Years Of Experience',
    pricePerMin: 61,
    imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    images: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600',
    ],
    appointmentsBooked: 300,
    languages: ['Hindi', 'Gujarati', 'English'],
    expertise: ['Love & Relationship Issue', 'Health Impacts', 'Career And Investment Advice'],
    about: 'Gopal Dash ji is a renowned Vedic Pandit with over a decade of experience in astrology and spiritual guidance.',
    isBookmarked: true,
  },
  {
    id: 'astro-2',
    name: 'Jagat Bandhu',
    specialty: 'Vedic Astrologer',
    experience: '10 Years Of Experience',
    pricePerMin: 61,
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    images: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
    ],
    appointmentsBooked: 250,
    languages: ['Hindi', 'Bengali', 'English'],
    expertise: ['Kundli Reading', 'Vastu Shastra', 'Gemstone Consultation'],
    about: 'Jagat Bandhu is a veteran Vedic astrologer known for accurate predictions and holistic spiritual advice.',
    isBookmarked: false,
  },
  {
    id: 'astro-3',
    name: 'Jeevan Kumar',
    specialty: 'Tarot Reader',
    experience: '10 Years Of Experience',
    pricePerMin: 61,
    imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
    images: [
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600',
    ],
    appointmentsBooked: 180,
    languages: ['Hindi', 'English'],
    expertise: ['Tarot Reading', 'Numerology', 'Past Life Regression'],
    about: 'Jeevan Kumar specializes in Tarot reading and numerology with a unique blend of Vedic wisdom.',
    isBookmarked: true,
  },
  {
    id: 'astro-4',
    name: 'Ram Sada Siv',
    specialty: 'Vedic Pandeet',
    experience: '15 Years Of Experience',
    pricePerMin: 80,
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    images: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600',
    ],
    appointmentsBooked: 450,
    languages: ['Hindi', 'Sanskrit', 'English'],
    expertise: ['Vedic Astrology', 'Muhurat Planning', 'Spiritual Healing'],
    about: 'Ram Sada Siv is a highly respected Vedic Pandit with 15 years of experience in Jyotish Shastra.',
    isBookmarked: false,
  },
];

export const DURATION_OPTIONS: DurationOption[] = [
  { key: '15min', label: '15 Min', price: 150 },
  { key: '30min', label: '30 Min', price: 280 },
  { key: '1hour', label: '1 Hour', price: 500 },
  { key: '2hour', label: '2 Hour', price: 950 },
];
