'use client';

import { MOCK_DASHBOARD } from '@/data';

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
  const d = MOCK_DASHBOARD;

  return (
    <div>
      {/* Stats row 1 - Counts */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard label="Pujas Booked" value={d.pujasBooked} />
        <StatCard label="Chadhavas Booked" value={d.chadhavasBooked} />
        <StatCard label="Appointments Booked" value={d.appointmentsBooked} />
      </div>

      {/* Stats row 2 - Revenue */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Puja Revenue" value={d.pujaRevenue} prefix="₹" />
        <StatCard label="Chadhavas Revenue" value={d.chadhavaRevenue} prefix="₹" />
        <StatCard label="Appointments Revenue" value={d.appointmentsRevenue} prefix="₹" />
      </div>

      {/* Top 5 Services */}
      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">
          Top 5 Services by Booking Volume
        </h3>
        <div className="space-y-2">
          {d.topServices.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-foreground/80">{s.name}</span>
              <span className="text-primary font-semibold">{s.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
