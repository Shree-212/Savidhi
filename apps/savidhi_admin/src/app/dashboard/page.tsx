'use client';

import { useEffect, useState } from 'react';
import { dashboardService } from '@/lib/services';

interface DashboardStats {
  total_pujas: number;
  total_chadhavas: number;
  total_appointments_booked: number;
  total_devotees: number;
  puja_bookings_count: Record<string, number>;
  chadhava_bookings_count: number;
  revenue_total: number;
}

function StatCard({ label, value, prefix }: { label: string; value: number; prefix?: string }) {
  const isRevenue = !!prefix;
  return (
    <div className="border border-border rounded-xl p-4 text-center">
      <p className={`text-2xl font-bold ${isRevenue ? 'text-status-completed' : 'text-foreground'}`}>
        {prefix}{value.toLocaleString()}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await dashboardService.getStats();
        if (res.data?.success) setStats(res.data.data);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading...</div>;
  }

  if (!stats) {
    return <div className="text-center text-destructive text-sm py-8">Failed to load dashboard data</div>;
  }

  const totalPujaBookings = Object.values(stats.puja_bookings_count).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Stats row 1 - Counts */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Pujas Booked" value={totalPujaBookings} />
        <StatCard label="Chadhavas Booked" value={stats.chadhava_bookings_count} />
        <StatCard label="Appointments Booked" value={stats.total_appointments_booked} />
      </div>

      {/* Stats row 2 - Revenue & Counts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Revenue" value={stats.revenue_total} prefix="₹" />
        <StatCard label="Total Devotees" value={stats.total_devotees} />
        <StatCard label="Total Pujas" value={stats.total_pujas} />
      </div>

      {/* Puja Bookings by Status */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
          Puja Bookings by Status
        </h3>
        <div className="space-y-2">
          {Object.entries(stats.puja_bookings_count).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between text-xs">
              <span className="text-foreground/80">{status.replace(/_/g, ' ')}</span>
              <span className="text-primary font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
