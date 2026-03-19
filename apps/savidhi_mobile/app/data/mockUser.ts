import { UserProfile } from './models';

export const MOCK_USER: UserProfile = {
  id: 'user-1',
  name: 'Smita Bhardwaj',
  phone: '9455567776',
  imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300',
  level: 5,
  gems: 100,
  pujaBooked: 55,
  appointments: 3,
  pujaForOthers: 22,
  devoteeSince: '11 Dec 2025',
  achievements: [
    { id: 'ach-1', name: 'Astro Seeker', imageUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=200', unlocked: true },
    { id: 'ach-2', name: 'Steady One', imageUrl: 'https://images.unsplash.com/photo-1545468800-85cc9bc6ecf7?w=200', unlocked: true },
    { id: 'ach-3', name: 'Devotee', imageUrl: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=200', unlocked: false },
  ],
};
