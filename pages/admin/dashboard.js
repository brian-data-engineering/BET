import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Ticket, Users, Wallet, TrendingUp, Activity } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    totalBets: 0, 
    totalVolume: 0, 
    activeCashiers: 0,
    recentBets: [] 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Get total count of bets
        const { count: betsCount } = await supabase
          .from('booked_bets')
          .select('*', { count: 'exact', head: true });

        // 2. Get cashier balances for the 'Float Pool'
        const { data: cashiers } = await supabase
          .from('profiles')
          .select('balance')
          .eq('role', 'cashier');

        // 3. Get the 5 most recent bets for a 'Live Feed' feel
        const { data: recent } = await supabase
          .from('booked_bets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        const volume = cashiers?.reduce((acc, c) => acc + parseFloat(c.balance || 0), 0) || 0;

        setStats({ 
          totalBets: betsCount || 0, 
          totalVolume: volume, 
          activeCashiers: cashiers?.length || 0,
          recentBets: recent || []
        });
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Command Center</h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] mt-1">Real-time system metrics</p>
          </div>
          <div className="flex items-center gap-2 bg-lucra-green/10 px-4 py-2 rounded-full border border-lucra-green/20">
            <Activity size={14} className="text-lucra-green animate-pulse" />
            <span className="text-[10px] font-black text-lucra-green uppercase">System Live</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Booked Bets" 
            value={stats.totalBets} 
            icon={<Ticket className="text-lucra-green" />} 
          />
          <StatCard 
            title="Cashier Float Pool" 
            value={`$${stats.totalVolume.toFixed(2)}`} 
            icon={<Wallet className="text-lucra-green" />} 
            isMoney 
          />
          <StatCard 
            title="Active Cashiers" 
            value={stats.activeCashiers} 
            icon={<Users className="text-lucra-green" />} 
          />
        </div>

        {/* Recent Activity Table */}
        <div className="bg-slate-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-gray-800 flex items-center gap-3">
            <TrendingUp size={20} className="text-gray-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-gray-200">Recent Booking Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-4">Booking Code</th>
                  <th className="p-4">Selections</th>
                  <th className="p-4">Total Odds</th>
                  <th className="p-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {stats.recentBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-black text-lucra-green tracking-widest">{bet.booking_code}</td>
                    <td className="p-4 text-gray-300">{bet.items?.length || 0} Games</td>
                    <td className="p-4 font-mono text-gray-400">@{parseFloat(bet.total_odds).toFixed(2)}</td>
                    <td className="p-4 text-right text-gray-500 text-xs">
                      {new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Sub-component for clean code
function StatCard({ title, value, icon, isMoney }) {
  return (
    <div className="bg-slate-900 p-8 rounded-3xl border border-gray-800 relative overflow-hidden group hover:border-lucra-green/30 transition-all">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{title}</p>
      <p className={`text-4xl font-black tracking-tighter ${isMoney ? 'text-lucra-green' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
