import { Temple } from './models';

export const MOCK_TEMPLES: Temple[] = [
  {
    id: 'temple-1',
    name: 'Ayodhya Ram Janmbhoomi Mandir',
    location: 'Ayodhya, UP',
    pincode: '7675454',
    images: [
      'https://images.unsplash.com/photo-1604608672516-f1b9b1d71e86?w=600',
    ],
    pujaris: [
      { id: 'p1', name: 'Raman Dash', role: 'Head Pujari', imageUrl: '' },
      { id: 'p2', name: 'Laxman Das', role: 'Pujari', imageUrl: '' },
    ],
    about: 'The Ram Janmbhoomi Mandir in Ayodhya is one of the most sacred temples in India, believed to be the birthplace of Lord Ram.',
    history: 'Constructed after decades of efforts, this temple stands as a symbol of devotion and cultural heritage for millions of Hindus worldwide.',
    videoThumbnail: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d71e86?w=400',
    pujaCount: 1000,
    pujasOffered: ['puja-1', 'puja-3'],
    chadhavasOffered: ['chadhava-1'],
  },
  {
    id: 'temple-2',
    name: 'Ramanathaswamy Temple',
    location: 'Rameshwaram, Tamil Nadu',
    pincode: '5555664',
    images: [
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=600',
    ],
    pujaris: [
      { id: 'p3', name: 'Suresh Sharma', role: 'Head Pujari', imageUrl: '' },
    ],
    about: 'Ramanathaswamy Temple is one of the twelve Jyotirlinga temples dedicated to Lord Shiva, located on Rameswaram island.',
    history: 'Built by the Pandya Dynasty in the 12th century, this temple is famous for its magnificent corridor and 1212 pillars.',
    videoThumbnail: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400',
    pujaCount: 800,
    pujasOffered: ['puja-2'],
    chadhavasOffered: [],
  },
  {
    id: 'temple-3',
    name: 'Kedarnath Temple',
    location: 'Kumaon, Uttarakhand',
    pincode: '5566447',
    images: [
      'https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?w=600',
    ],
    pujaris: [
      { id: 'p4', name: 'Raman Dash', role: 'Head Pujari', imageUrl: '' },
      { id: 'p5', name: 'Laxman Das', role: 'Pujari', imageUrl: '' },
    ],
    about: 'Kedarnath Temple is one of the holiest Hindu temples dedicated to Lord Shiva, nestled in the Garhwal Himalayan range.',
    history: 'Believed to have been built by the Pandavas, the temple is part of the Char Dham pilgrimage and one of twelve Jyotirlingas.',
    videoThumbnail: 'https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?w=400',
    pujaCount: 1200,
    pujasOffered: ['puja-2', 'puja-4'],
    chadhavasOffered: ['chadhava-2'],
  },
];
