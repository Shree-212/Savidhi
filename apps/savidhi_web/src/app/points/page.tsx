'use client';

import Image from 'next/image';
import { Flame, Clock, Users, CalendarHeart, Diamond, Share2, Star } from 'lucide-react';
import { MOCK_USER } from '@/data';

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
  const user = MOCK_USER;

  return (
    <div className="section-container py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">My Points</h1>

      {/* User Card */}
      <div className="flex items-center border border-border-DEFAULT rounded-xl p-4 bg-white mb-4">
        <div className="w-14 h-14 rounded-full bg-border-light overflow-hidden relative shrink-0">
          <Image src={user.imageUrl} alt={user.name} fill className="object-cover" sizes="56px" />
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
        {user.achievements.map((ach) => (
          <div key={ach.id} className={`border border-border-DEFAULT rounded-xl p-3 bg-white text-center relative ${!ach.unlocked ? 'opacity-50' : ''}`}>
            <div className="w-12 h-12 rounded-full bg-border-light mx-auto mb-1 overflow-hidden relative">
              <Image src={ach.imageUrl} alt={ach.name} fill className="object-cover" sizes="48px" />
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
