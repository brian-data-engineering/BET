import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';
import { Ticket, Users, Wallet, TrendingUp, Activity, PlusCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ 
    totalBets: 0, 
    totalVolume: 0, 
    managedAccounts: 0,
    recentBets: [],
    role: null,
    myBalance: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // 1. Get the current user's profile and role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, id, balance')
          .eq('id', user.id)
          .single();

        const isSuper = profile.role === 'super_admin';

        // 2. Query based on Hierarchy
        // Super Admin sees everything. Operator sees only their children (parent_id = id)
        let cashierQuery = supabase.from('profiles').select('balance', { count: 'exact' });
        let betsQuery = supabase.from('booked_bets').select('*', { count: 'exact' });

        if (!isSuper) {
          cashierQuery = cashierQuery.eq('parent_id', profile.id);
          // Assuming booked_bets has a 'created_by' or similar link to your cashier/operator
          // If not, we can filter by the specific cashier IDs under this operator
        }

        const { data: managedProfiles, count: accountsCount } = await cashierQuery;
        const { count: betsCount } = await betsQuery;

        // 3. Get Recent Activity
        const { data: recent } = await supabase
          .from('booked_bets')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        const volume = managedProfiles?.reduce((acc, c) => acc + parseFloat(c.balance || 0), 0) || 0;

        setStats({ 
          totalBets: betsCount || 0, 
          totalVolume: volume, 
          managedAccounts: accountsCount || 0,
          recentBets: recent || [],
          role: profile.role,
          myBalance: profile.balance
        });
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen">
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">
              {stats.role === 'super_admin' ? 'Global Control' : 'Shop Terminal'}
            </h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">
              Status: {stats.role?.replace('_', ' ')} active
            </p>
          </div>
          
          <div className="flex gap-4">
            {stats.role === 'operator' && (
              <button className="flex items-center gap-2 bg-[#10b981] text-black px-4 py-2 rounded-xl font-black text-[10px] uppercase italic hover:bg-white transition-all">
                <PlusCircle size={14} /> Create Cashier
              </button>
            )}
            <div className="flex items-center gap-2 bg-[#10b981]/10 px-4 py-2 rounded-xl border border-[#10b981]/20">
              <Activity size={14} className="text-[#10b981] animate-pulse" />
              <span className="text-[10px] font-black text-[#10b981] uppercase italic">System Live</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard 
            title="My Float" 
            value={parseFloat(stats.myBalance).toLocaleString()} 
            icon={<Wallet className="text-[#10b981]" />} 
            isMoney 
          />
          <StatCard 
            title={stats.role === 'super_admin' ? "Global Volume" : "Staff Float Total"} 
            value={stats.totalVolume.toLocaleString()} 
            icon={<TrendingUp className="text-[#10b981]" />} 
            isMoney 
          />
          <StatCard 
            title="Total Bookings" 
            value={stats.totalBets} 
            icon={<Ticket className="text-[#10b981]" />} 
          />
          <StatCard 
            title={stats.role === 'super_admin' ? "Total Operators" : "Active Cashiers"} 
            value={stats.managedAccounts} 
            icon={<Users className="text-[#10b981]" />} 
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111926] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp size={20} className="text-slate-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-200 italic">Live Booking Feed</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0b0f1a]/50 text-slate-500 text-[10px] font-black uppercase tracking-widest italic">
                <tr>
                  <th className="p-4">Ref Code</th>
                  <th className="p-4">Market</th>
                  <th className="p-4">Odds</th>
                  <th className="p-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.recentBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 font-black text-[#10b981] tracking-widest uppercase italic">{bet.booking_code}</td>
                    <td className="p-4 text-slate-300 font-bold uppercase text-xs">{bet.items?.length || 0} Events</td>
                    <td className="p-4 font-mono text-slate-400">@{parseFloat(bet.total_odds || 0).toFixed(2)}</td>
                    <td className="p-4 text-right text-slate-500 text-[10px] font-bold">
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

function StatCard({ title, value, icon, isMoney }) {
  return (
    <div className="bg-[#111926] p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-[#10b981]/30 transition-all">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-2 italic">{title}</p>
      <p className={`text-3xl font-black tracking-tighter italic ${isMoney ? 'text-[#10b981]' : 'text-white'}`}>
        {isMoney && <span className="text-sm mr-1">KES</span>}{value}
      </p>
    </div>
  );
}
