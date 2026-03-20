import { PanchangData, CalendarEvent } from './models';

export const MOCK_PANCHANG: PanchangData = {
  date: '25 Jan',
  day: 'Saturday',
  tithi: 'Shukla-Dwitiya',
  location: 'Ahmedabad',
  moonPhase: '🌒',
  festivals: ['Rath Saptami', 'Surya Diwash'],
  auspiciousTimes: [
    { name: 'Brahma Muhurat', time: '11:35 Am To 12:20 Pm' },
    { name: 'Amrit Kaal', time: '11:35 Am To 12:20 Pm' },
    { name: 'Abhijit Muhurat (Now)', time: '11:35 Am To 12:20 Pm' },
  ],
  inauspiciousTimes: [
    { name: 'Rahu Kal', time: '11:35 Am To 12:20 Pm' },
    { name: 'Yamaganda', time: '11:35 Am To 12:20 Pm' },
    { name: 'Varjyam', time: '11:35 Am To 12:20 Pm' },
  ],
  sunrise: '5:00 AM',
  sunset: '5:00 PM',
  moonrise: '5:00 AM',
  moonset: '5:00 PM',
  karna: [
    { name: 'Balava', time: '23 Jan, 2:11 PM To 24 Jan, 1:45 AM' },
    { name: 'Taitila', time: '23 Jan, 2:11 PM To 24 Jan, 1:45 AM' },
    { name: 'Kaulava', time: '23 Jan, 2:11 PM To 24 Jan, 1:45 AM' },
  ],
  yoga: [
    { name: 'Shiva', time: '23 Jan, 2:11 PM To 24 Jan, 1:45 AM' },
    { name: 'Siddha', time: '23 Jan, 2:11 PM To 24 Jan, 1:45 AM' },
  ],
};

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    date: '25 Jan',
    title: 'Rath Saptami',
    tithi: 'Saptami Tithi',
    timings: '23 Jan, 2:11 PM To 24 Jan, 1:45 AM',
    details: ['Govardhan Abhisekh'],
    pujaName: 'Laxmi Dhandatri Puja',
    pujaTemple: 'Ram Adevi Temple, Devi Pitha, UP',
    pujaImageUrl: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d71e86?w=400',
  },
  {
    date: '26 Jan',
    title: 'Rath Saptami',
    tithi: 'Saptami Tithi',
    timings: '23 Jan, 2:11 PM To 24 Jan, 1:45 AM',
    details: ['Govardhan Abhisekh'],
    pujaName: 'Haridwar Shiv Bhuta Shanti',
    pujaTemple: 'Gupteswar Temple, Haridwar, UP',
    pujaImageUrl: 'https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?w=400',
  },
];
