'use client';

import React, { useEffect, useState } from 'react';
import { BedDouble, Building2, RefreshCw, CheckCircle2, ShieldAlert, Sparkles, LogOut } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/auth-context';

interface RoomType {
  room_type_id:    string;
  type_name:       string;
  base_daily_rate: number;
  capacity:        number;
  description:     string;
}

interface Branch {
  branch_id:   string;
  branch_name: string;
  city:        string;
}

interface PhysicalRoom {
  room_id:        string;
  room_number:    string;
  floor_number:   number;
  branch_id:      string;
  room_type_name: string;
  status:         'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
}

const SEED_PHYSICAL_ROOMS: PhysicalRoom[] = [
  { room_id: 'rm-101', room_number: '101', floor_number: 1, branch_id: 'b1111111-1111-1111-1111-111111111111', room_type_name: 'Deluxe Ocean Suite', status: 'AVAILABLE' },
  { room_id: 'rm-102', room_number: '102', floor_number: 1, branch_id: 'b1111111-1111-1111-1111-111111111111', room_type_name: 'Deluxe Ocean Suite', status: 'OCCUPIED' },
  { room_id: 'rm-201', room_number: '201', floor_number: 2, branch_id: 'b1111111-1111-1111-1111-111111111111', room_type_name: 'Presidential Sky Suite', status: 'AVAILABLE' },
  { room_id: 'rm-202', room_number: '202', floor_number: 2, branch_id: 'b1111111-1111-1111-1111-111111111111', room_type_name: 'Heritage Villa Room', status: 'MAINTENANCE' },
  { room_id: 'rm-301', room_number: '101', floor_number: 1, branch_id: 'b2222222-2222-2222-2222-222222222222', room_type_name: 'Heritage Villa Room', status: 'OCCUPIED' },
  { room_id: 'rm-302', room_number: '102', floor_number: 1, branch_id: 'b2222222-2222-2222-2222-222222222222', room_type_name: 'Heritage Villa Room', status: 'AVAILABLE' },
  { room_id: 'rm-401', room_number: '201', floor_number: 2, branch_id: 'b3333333-3333-3333-3333-333333333333', room_type_name: 'Hilltop Mountain Pavilion', status: 'AVAILABLE' },
  { room_id: 'rm-402', room_number: '202', floor_number: 2, branch_id: 'b3333333-3333-3333-3333-333333333333', room_type_name: 'Hilltop Mountain Pavilion', status: 'OCCUPIED' },
];

export default function RoomsPage() {
  const { logout } = useAuth();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rtRes, bRes] = await Promise.all([
        apiFetch<{ data: RoomType[] }>('/api/v1/room-types').catch(() => ({ data: [] })),
        apiFetch<{ data: Branch[] }>('/api/v1/branches').catch(() => ({ data: [] })),
      ]);
      setRoomTypes(rtRes.data);
      setBranches(bRes.data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredRooms = selectedBranch === 'ALL'
    ? SEED_PHYSICAL_ROOMS
    : SEED_PHYSICAL_ROOMS.filter(r => r.branch_id === selectedBranch);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-100 font-cinzel">Rooms & Suites</h1>
          <p className="text-stone-500 text-sm mt-0.5 font-jakarta">
            Physical room inventory and architectural categories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={fetchData} title="Refresh rooms">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="danger" size="sm" onClick={logout} className="flex items-center gap-1.5 ml-2">
            <LogOut size={14} /> Log Out
          </Button>
        </div>
      </div>

      {/* Room Types Grid */}
      <div className="mb-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4 font-jakarta">
          Suite Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {roomTypes.map(rt => (
            <Card key={rt.room_type_id} className="flex flex-col justify-between p-5 border-white/10">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-none bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <h3 className="font-cinzel text-base text-stone-100 font-medium">{rt.type_name}</h3>
                <p className="text-xs text-stone-400 line-clamp-2">{rt.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                <span className="text-stone-500">Max {rt.capacity} Guests</span>
                <span className="text-amber-400 font-semibold font-cinzel text-sm">${rt.base_daily_rate} <span className="text-[10px] font-normal text-stone-500">/ night</span></span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Physical Inventory */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400 font-jakarta">
            Physical Inventory ({filteredRooms.length} Rooms)
          </h2>
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-stone-500" />
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-stone-900 border border-white/10 px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-amber-500 rounded-none"
            >
              <option value="ALL">All Branches</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        </div>

        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-stone-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Room No</th>
                <th className="text-left px-6 py-3 font-medium">Category</th>
                <th className="text-left px-6 py-3 font-medium">Floor</th>
                <th className="text-left px-6 py-3 font-medium">Branch</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRooms.map(room => {
                const branchObj = branches.find(b => b.branch_id === room.branch_id);
                return (
                  <tr key={room.room_id} className="hover:bg-white/3 transition-colors">
                    <td className="px-6 py-4 font-semibold text-stone-200 flex items-center gap-2">
                      <BedDouble size={14} className="text-amber-500/70" />
                      Room {room.room_number}
                    </td>
                    <td className="px-6 py-4 text-stone-300">{room.room_type_name}</td>
                    <td className="px-6 py-4 text-stone-400">Floor {room.floor_number}</td>
                    <td className="px-6 py-4 text-stone-400">{branchObj?.branch_name ?? 'Sky Nest Hotel'}</td>
                    <td className="px-6 py-4">
                      {room.status === 'AVAILABLE' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                          <CheckCircle2 size={12} /> Available
                        </span>
                      )}
                      {room.status === 'OCCUPIED' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30">
                          Occupied
                        </span>
                      )}
                      {room.status === 'MAINTENANCE' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/30">
                          <ShieldAlert size={12} /> Maintenance
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
