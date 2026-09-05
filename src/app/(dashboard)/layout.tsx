import React from 'react';
import { Nav } from '../../components/ui/Nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 flex">
      <Nav />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

