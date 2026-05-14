'use client';

import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  /** ISO timestamp or Date the countdown is running to. */
  target: string | Date | null | undefined;
  /** Heading rendered above the four boxes. Defaults to "Puja starts in". */
  label?: string;
}

function diff(now: number, target: number) {
  const ms = Math.max(0, target - now);
  const totalSec = Math.floor(ms / 1000);
  const days  = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins  = Math.floor((totalSec % 3600) / 60);
  const secs  = totalSec % 60;
  return { days, hours, mins, secs, done: ms === 0 };
}

/** DD : HH : MM : SS pill row used on puja & chadhava details pages. */
export function CountdownTimer({ target, label = 'Puja starts in' }: CountdownTimerProps) {
  const targetMs = target ? new Date(target).getTime() : NaN;
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!Number.isFinite(targetMs)) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  if (!Number.isFinite(targetMs)) return null;
  const { days, hours, mins, secs, done } = diff(tick, targetMs);
  if (done) return null;

  const Box = ({ value, suffix }: { value: number; suffix: string }) => (
    <div className="bg-primary-50 border border-orange-100 rounded-lg px-3 py-2 min-w-[64px] text-center shadow-sm">
      <span className="block text-lg sm:text-xl font-bold text-primary-600 tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="block text-[10px] uppercase tracking-wider text-text-muted mt-1 font-semibold">{suffix}</span>
    </div>
  );

  return (
    <div className="space-y-1.5">
      <p className="text-sm sm:text-[15px] font-semibold text-text-primary">{label}</p>
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <Box value={days}  suffix="day" />
        <span className="text-primary-400 font-bold text-lg">:</span>
        <Box value={hours} suffix="hr"  />
        <span className="text-primary-400 font-bold text-lg">:</span>
        <Box value={mins}  suffix="min" />
        <span className="text-primary-400 font-bold text-lg">:</span>
        <Box value={secs}  suffix="sec" />
      </div>
    </div>
  );
}
