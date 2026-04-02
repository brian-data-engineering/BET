import { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { Ticket, Users, Wallet, TrendingUp, Activity, ShieldCheck } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useContext(AdminContext);
  const [stats, setStats] = useState({ 
    totalBets: 0, totalVolume: 0, managedAccounts: 0, recentBets: [] 
  });

  useEffect(() => {
    // If profile isn't here yet, we just wait. No "Connecting" screen to get stuck on.
    if (!profile?.id) return;

    const fetchLiveStats = async () => {
      try {
        const isSuper = ['admin', 'super_admin'].includes(profile?.role);
        let profilesQuery = supabase.from('profiles').select('balance', { count: 'exact' });
        
        if (!isSuper) {
          profilesQuery = profilesQuery.eq('parent_id', profile.id);
        } else {
          profilesQuery = profilesQuery.eq('role', 'operator');
        }

        const [managedRes, betsRes, recentRes] = await Promise.all([
          profilesQuery,
          supabase.from('betsnow').select('*', { count: 'exact', head: true }),
          supabase.from('betsnow').select('*').order('created_at', { ascending: false }).limit(8)
        ]);

        setStats({ 
          totalBets: betsRes.count || 0, 
          totalVolume: managedRes.data?.reduce((acc, c) => acc + parseFloat(c.balance || 0), 0) || 0, 
          managedAccounts: managedRes.count || 0,
          recentBets: recentRes.data || []
        });
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };

    fetchLiveStats();
  }, [profile]);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* Header - Uses Optional Chaining so it never crashes */}
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-[#10b981]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Intelligence</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
              {profile?.role?.includes('admin') ? 'Global Control' : 'Shop Command'}
            </h1>
          </div>
          <div className="bg-[#10b981]/5 px-5 py-3 rounded-2xl border border-[#10b981]/10 flex items-center gap-2">
            <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-[#10b981] uppercase italic tracking-widest">
              {profile?.username || 'INITIALIZING...'}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Reserved" value={(profile?.balance || 0).toLocaleString()} icon={<Wallet />} isMoney />
          <StatCard title="Volume" value={stats.totalVolume.toLocaleString()} icon={<TrendingUp />} isMoney color="text-[#10b981]" />
          <StatCard title="Bookings" value={stats.totalBets} icon={<Ticket />} />
          <StatCard title="Entities" value={stats.managedAccounts} icon={<Users />} />
        </div>

        {/* Table Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center gap-3">
              <Activity size={20} className="text-[#10b981]" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] italic text-slate-300">Live Transmission</h2>
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/5">
                {stats.recentBets.map((bet) => (
                  <tr key={bet.id}>
                    <td className="p-6 font-black text-[#10b981] uppercase italic">{bet.ticket_serial}</td>
                    <td className="p-6 text-slate-200 font-bold">KES {bet.stake}</td>
                    <td className="p-6 text-right text-slate-500 text-[10px] uppercase font-black">
                      {new Date(bet.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gradient-to-br from-[#10b981] to-[#059669] p-8 rounded-[2.5rem] text-black">
               <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Provisioning</h3>
               <button onClick={() => window.location.href = '/admin/operator'} className="w-full bg-white text-black font-black py-4 rounded-2xl text-xs uppercase italic tracking-widest mt-4">
                 Manage Network
               </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, isMoney, color = "text-white" }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden">
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 italic">{title}</p>
      <p className={`text-3xl font-black tracking-tighter italic ${color}`}>
        {isMoney && "KES "}{value}
      </p>
    </div>
  );
}
