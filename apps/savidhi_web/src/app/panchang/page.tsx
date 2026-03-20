'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Sun, Moon } from 'lucide-react';
import { ChipToggle } from '@/components/shared/ChipToggle';
import { MOCK_PANCHANG, MOCK_CALENDAR_EVENTS } from '@/data';

const TABS = ['Panchang', 'Calendar'];

export default function PanchangPage() {
  const [tab, setTab] = useState('Panchang');
  const p = MOCK_PANCHANG;

  return (
    <div className="section-container py-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Panchang</h1>
        <ChipToggle options={TABS} selected={tab} onSelect={setTab} />
      </div>

      {tab === 'Panchang' ? (
        <>
          {/* Date Nav */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <button className="text-primary-500 hover:bg-primary-50 rounded-full p-1 transition">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-primary-50 rounded-lg px-4 py-2">
              <Calendar className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-semibold text-primary-600">{p.date}</span>
            </div>
            <button className="text-primary-500 hover:bg-primary-50 rounded-full p-1 transition">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Panchang Header */}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-6 text-sm">
            <span className="font-semibold text-text-primary">{p.date}</span>
            <span className="text-text-secondary">{p.day}</span>
            <span className="font-medium text-text-primary">{p.tithi}</span>
            <span className="text-green-500 text-xs">📍 {p.location}</span>
          </div>

          {/* Festival */}
          <div className="border border-border-DEFAULT rounded-xl p-4 mb-3">
            <h3 className="font-semibold text-text-primary text-sm mb-2">Festival</h3>
            {p.festivals.map((f, i) => (
              <p key={i} className="text-sm text-text-secondary">• {f}</p>
            ))}
          </div>

          {/* Auspicious */}
          <div className="border border-green-200 rounded-xl p-4 mb-3 bg-green-50/30">
            <h3 className="font-semibold text-text-primary text-sm mb-2">Auspicious Time</h3>
            {p.auspiciousTimes.map((t, i) => (
              <div key={i} className="flex justify-between text-sm mb-1">
                <span className="text-green-600 font-medium">{t.name}</span>
                <span className="text-text-secondary">{t.time}</span>
              </div>
            ))}
          </div>

          {/* Inauspicious */}
          <div className="border border-red-200 rounded-xl p-4 mb-3 bg-red-50/30">
            <h3 className="font-semibold text-text-primary text-sm mb-2">Inauspicious Time</h3>
            {p.inauspiciousTimes.map((t, i) => (
              <div key={i} className="flex justify-between text-sm mb-1">
                <span className="text-red-500 font-medium">{t.name}</span>
                <span className="text-text-secondary">{t.time}</span>
              </div>
            ))}
          </div>

          {/* Sun & Moon */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="border border-border-DEFAULT rounded-xl p-4 text-center">
              <Sun className="w-7 h-7 text-primary-500 mx-auto mb-2" />
              <p className="text-xs text-text-secondary">Rise: {p.sunrise}</p>
              <p className="text-xs text-text-secondary">Set: {p.sunset}</p>
            </div>
            <div className="border border-border-DEFAULT rounded-xl p-4 text-center">
              <Moon className="w-7 h-7 text-primary-500 mx-auto mb-2" />
              <p className="text-xs text-text-secondary">Rise: {p.moonrise}</p>
              <p className="text-xs text-text-secondary">Set: {p.moonset}</p>
            </div>
          </div>

          {/* Karna */}
          <div className="border border-border-DEFAULT rounded-xl p-4 mb-3">
            <h3 className="font-semibold text-text-primary text-sm mb-2">Karna</h3>
            {p.karna.map((k, i) => (
              <div key={i} className="flex justify-between text-sm mb-1">
                <span className="font-medium text-text-primary">{k.name}</span>
                <span className="text-text-secondary">{k.time}</span>
              </div>
            ))}
          </div>

          {/* Yoga */}
          <div className="border border-border-DEFAULT rounded-xl p-4">
            <h3 className="font-semibold text-text-primary text-sm mb-2">Yoga</h3>
            {p.yoga.map((y, i) => (
              <div key={i} className="flex justify-between text-sm mb-1">
                <span className="font-medium text-text-primary">{y.name}</span>
                <span className="text-text-secondary">{y.time}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Calendar Tab */
        <div>
          <h2 className="font-semibold text-text-primary mb-4">Upcoming Events</h2>
          {MOCK_CALENDAR_EVENTS.map((event) => (
            <div key={event.id} className="border border-border-DEFAULT rounded-xl p-4 mb-3 bg-white">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary text-sm">{event.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{event.date}</p>
                  <p className="text-xs text-text-muted mt-1">{event.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
