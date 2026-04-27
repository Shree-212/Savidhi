'use client';

import { Header } from './Header';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
