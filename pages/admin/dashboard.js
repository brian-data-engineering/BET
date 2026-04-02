import { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { Ticket, Users, Wallet, TrendingUp, Activity, ShieldCheck } from 'lucide-react';

export default function AdminDashboard() {
  const { profile } = useContext(AdminContext);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ 
    totalBets: 0, totalVolume: 0, managedAccounts: 0, recentBets: [] 
  });

  useEffect(() => {
    if (!profile?.id) return;

    const fetchLiveStats = async () => {
      try {
        const isSuper = ['admin', 'super_admin', 'superadmin'].includes(profile?.role);
        
        // 1. Fetch managed entities
        let managedQuery = supabase.from('profiles').select('balance');
        if (isSuper) {
          managedQuery = managedQuery.eq('role', 'operator');
        } else {
          managedQuery = managedQuery.eq('parent_id', profile.id);
        }

        const [managedRes, betsRes, recentRes] = await Promise.all([
          managedQuery,
          supabase.from('betsnow').select('*', { count: 'exact', head: true }),
          supabase.from('betsnow')
            .select('id, ticket_serial, stake, created_at')
            .order('created_at', { ascending: false })
            .limit(8)
        ]);

        // Check for specific Supabase errors
        if (managedRes.error) throw new Error(`Profiles: ${managedRes.error.message}`);
        if (betsRes.error) throw new Error(`Bets Count: ${betsRes.error.message}`);
        if (recentRes.error) throw new Error(`Recent Bets: ${recentRes.error.message}`);

        const volume = managedRes.data?.reduce((acc, curr) => acc + Number(curr.balance || 0), 0) || 0;

        setStats({ 
          totalBets: betsRes.count || 0, 
          totalVolume: volume, 
          managedAccounts: managedRes.data?.length || 0,
          recentBets: recentRes.data || []
        });
        setError(null);

      } catch (err) {
        console.error("Dashboard Error:", err);
        setError(err.message);
      }
    };

    fetchLiveStats();
    const channel = supabase.channel('db-sync').on('postgres_changes', { event: '*', schema: 'public', table: 'betsnow' }, () => fetchLiveStats()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-500 text-xs font-mono">
            [CONNECTION_ERROR]: {error}
          </div>
        )}

        {/* Header */}
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
              {profile?.username || 'SYSTEM_ONLINE'}
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

        {/* Live Table */}
        <div className="xl:col-span-2 bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <table className="w-full text-left">
            <tbody className="divide-y divide-white/5">
              {stats.recentBets.map((bet) => (
                <tr key={bet.id}>
                  <td className="p-6 font-black text-[#10b981] uppercase italic">{bet.ticket_serial}</td>
                  <td className="p-6 text-slate-200 font-bold">KES {Number(bet.stake).toLocaleString()}</td>
                  <td className="p-6 text-right text-slate-500 text-[10px] uppercase font-black">
                    {new Date(bet.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
