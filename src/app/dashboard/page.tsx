import Link from "next/link";
import { BedDouble, CalendarCheck, Users, DollarSign, TrendingUp, CheckCircle, Clock, Plus, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { name: "Total Rooms", value: "48", change: "+4 this month", icon: BedDouble, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50" },
    { name: "Occupancy Rate", value: "78.5%", change: "+12% vs last week", icon: TrendingUp, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" },
    { name: "Active Bookings", value: "32", change: "8 checking in today", icon: CalendarCheck, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50" },
    { name: "Total Guests", value: "1,240", change: "154 loyalty members", icon: Users, color: "text-purple-600 bg-purple-50 dark:bg-purple-950/50" },
  ];

  const recentBookings = [
    { id: "BK-9021", guest: "Alexander Wright", room: "Suite 401", dates: "Aug 18 - Aug 22", status: "CHECKED_IN", amount: "$840.00" },
    { id: "BK-9022", guest: "Sophia Martinez", room: "Deluxe 204", dates: "Aug 18 - Aug 20", status: "CONFIRMED", amount: "$360.00" },
    { id: "BK-9023", guest: "Marcus Vance", room: "Standard 108", dates: "Aug 19 - Aug 21", status: "PENDING", amount: "$220.00" },
    { id: "BK-9024", guest: "Elena Rostova", room: "Presidential 501", dates: "Aug 20 - Aug 25", status: "CONFIRMED", amount: "$2,450.00" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Header Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/20">
              H
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Hotel RMS</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reservation & Management System</p>
            </div>
          </div>

          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-brand-500 font-semibold">Dashboard</Link>
            <Link href="/api/rooms" className="text-slate-600 dark:text-slate-300 hover:text-brand-500 transition-colors">Rooms API</Link>
            <Link href="/api/bookings" className="text-slate-600 dark:text-slate-300 hover:text-brand-500 transition-colors">Bookings API</Link>
            <Link href="/api/reports" className="text-slate-600 dark:text-slate-300 hover:text-brand-500 transition-colors">Reports API</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">System Overview</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Real-time status of hotel rooms, reservations, and guests.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-4 h-4" />
              Full-Stack Next.js (Raw SQL)
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</span>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-extrabold tracking-tight">{stat.value}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">{stat.change}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Bookings Table */}
        <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-base">Recent Reservations</h3>
            <span className="text-xs font-medium text-brand-500 hover:underline cursor-pointer">View All Bookings</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3 font-medium">Booking Ref</th>
                  <th className="px-6 py-3 font-medium">Guest Name</th>
                  <th className="px-6 py-3 font-medium">Room Assigned</th>
                  <th className="px-6 py-3 font-medium">Stay Dates</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-brand-600 dark:text-brand-400">{b.id}</td>
                    <td className="px-6 py-4 font-medium">{b.guest}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{b.room}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{b.dates}</td>
                    <td className="px-6 py-4">
                      {b.status === "CHECKED_IN" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle className="w-3.5 h-3.5" /> Checked In
                        </span>
                      )}
                      {b.status === "CONFIRMED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                          <Clock className="w-3.5 h-3.5" /> Confirmed
                        </span>
                      )}
                      {b.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold">{b.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
