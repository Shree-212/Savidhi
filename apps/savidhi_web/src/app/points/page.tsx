'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flame, Clock, Users, CalendarHeart, Diamond, Share2, Star, Loader2, LogIn } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { userService } from '@/lib/services';
import { normaliseMediaUrl } from '@/lib/utils';

const STATS = [
  { key: 'pujaBooked' as const, label: 'Puja Booked', Icon: Flame },
  { key: 'appointments' as const, label: 'Appointments', Icon: Clock },
  { key: 'pujaForOthers' as const, label: 'Puja For Others', Icon: Users },
];

const EARN_WAYS = [
  { Icon: Flame, text: 'Book a Puja – Earn 10 gems' },
  { Icon: Clock, text: 'Book an Appointment – Earn 5 gems' },
  { Icon: Share2, text: 'Refer a Friend – Earn 25 gems' },
  { Icon: Star, text: 'Complete Weekly Puja – Earn 15 gems' },
];

export default function PointsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    setLoggedIn(true);
    (async () => {
      try {
        const [profileRes, gemsRes, achievementsRes] = await Promise.allSettled([
          userService.getProfile(),
          userService.getGems(),
          userService.getAchievements(),
        ]);

        const d = profileRes.status === 'fulfilled' ? (profileRes.value.data?.data ?? profileRes.value.data) : null;
        const gemsData = gemsRes.status === 'fulfilled' ? (gemsRes.value.data?.data ?? gemsRes.value.data) : null;
        const achData = achievementsRes.status === 'fulfilled' ? (achievementsRes.value.data?.data ?? achievementsRes.value.data) : [];

        if (d) {
          setUser({
            name: d.name ?? '',
            imageUrl: d.image_url ?? '',
            level: d.level ?? 1,
            gems: d.gems ?? gemsData?.balance ?? 0,
            pujaBooked: d.bookings?.puja ?? 0,
            appointments: d.bookings?.appointment ?? 0,
            pujaForOthers: 0,
            devoteeSince: d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
            achievements: (Array.isArray(achData) ? achData : []).map((a: any) => ({
              id: a.id,
              name: a.name,
              imageUrl: a.image_url ?? '',
              unlocked: a.unlocked ?? false,
            })),
          });
        }
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!loggedIn && !loading) {
    return (
      <div className="section-container py-20 max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogIn className="w-10 h-10 text-primary-500" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">Login to view your points</h1>
        <p className="text-text-secondary mb-6">Track your gems, achievements, and devotee journey</p>
        <Link href="/login" className="inline-flex items-center gap-2 bg-primary-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-600 transition">
          Login <LogIn className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">My Points</h1>

      {/* User Card */}
      <div className="flex items-center border border-border-DEFAULT rounded-xl p-4 bg-white mb-4">
        <div className="w-14 h-14 rounded-full bg-border-light overflow-hidden relative shrink-0">
          <Image src={normaliseMediaUrl(user.imageUrl) || '/images/placeholder.jpg'} alt={user.name} fill className="object-cover" sizes="56px" unoptimized />
        </div>
        <div className="flex-1 ml-3">
          <p className="font-semibold text-text-primary">{user.name}</p>
          <p className="text-xs text-primary-500">Level {user.level}</p>
        </div>
        <div className="text-center">
          <Diamond className="w-5 h-5 text-primary-500 mx-auto" />
          <p className="text-xl font-bold text-primary-600">{user.gems}</p>
          <p className="text-[10px] text-text-secondary">Gems</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-text-secondary mb-1">
          <span>Level {user.level}</span>
          <span>Level {user.level + 1}</span>
        </div>
        <div className="h-2 bg-border-light rounded-full overflow-hidden">
          <div className="h-2 bg-primary-500 rounded-full" style={{ width: '65%' }} />
        </div>
        <p className="text-xs text-text-muted mt-1">Complete 35 more pujas to reach Level {user.level + 1}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {STATS.map(({ key, label, Icon }) => (
          <div key={key} className="border border-border-DEFAULT rounded-xl p-3 bg-white text-center">
            <Icon className="w-5 h-5 text-primary-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-text-primary">{user[key]}</p>
            <p className="text-[10px] text-text-secondary">{label}</p>
          </div>
        ))}
      </div>

      {/* Devotee Since */}
      <div className="flex items-center gap-2 bg-primary-50 rounded-xl px-4 py-3 mb-6">
        <CalendarHeart className="w-5 h-5 text-primary-500" />
        <span className="text-sm font-semibold text-primary-600">Devotee Since {user.devoteeSince}</span>
      </div>

      {/* Achievements */}
      <h2 className="font-semibold text-text-primary mb-3">Achievements</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
        {user.achievements.map((ach: any) => (
          <div key={ach.id} className={`border border-border-DEFAULT rounded-xl p-3 bg-white text-center relative ${!ach.unlocked ? 'opacity-50' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-border-light mx-auto mb-1 overflow-hidden relative">
              <Image src={normaliseMediaUrl(ach.imageUrl) || '/images/placeholder.jpg'} alt={ach.name} fill className="object-cover" sizes="48px" unoptimized />
            </div>
            <p className="text-[10px] text-text-primary font-medium">{ach.name}</p>
            {!ach.unlocked && (
              <span className="absolute top-2 right-2 text-text-muted text-xs">🔒</span>
            )}
          </div>
        ))}
      </div>

      {/* How to Earn */}
      <div className="border border-border-DEFAULT rounded-xl p-4 bg-white">
        <h3 className="font-semibold text-text-primary mb-3">How to Earn Gems</h3>
        <div className="space-y-3">
          {EARN_WAYS.map(({ Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-text-secondary">
              <Icon className="w-4 h-4 text-primary-500 shrink-0" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
