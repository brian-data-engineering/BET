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
    if (!profile?.id) return;

    const fetchLiveStats = async () => {
      try {
        const isSuper = ['admin', 'super_admin'].includes(profile?.role);
        
        // 1. Fetch managed accounts
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

        // DEBUG LOGS - Check your browser console (F12) to see these!
        console.log("Managed Entities Found:", managedRes.data?.length);
        console.log("Total Bets Count:", betsRes.count);

        const volume = managedRes.data?.reduce((acc, curr) => acc + Number(curr.balance || 0), 0) || 0;

        setStats({ 
          totalBets: betsRes.count || 0, 
          totalVolume: volume, 
          managedAccounts: managedRes.data?.length || 0,
          recentBets: recentRes.data || []
        });

      } catch (err) {
        console.error("Sync Error:", err.message);
      }
    };

    fetchLiveStats();

    const channel = supabase.channel('live-db-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'betsnow' }, () => fetchLiveStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        
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

        {/* Live Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center gap-3 bg-white/[0.01]">
              <Activity size={20} className="text-[#10b981]" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] italic text-slate-300">Live Transmission</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#0b0f1a]/50 text-slate-600 text-[9px] font-black uppercase tracking-widest italic">
                  <tr>
                    <th className="p-6 uppercase">Serial ID</th>
                    <th className="p-6 uppercase">Stake</th>
                    <th className="p-6 text-right uppercase">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.recentBets.map((bet) => (
                    <tr key={bet.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-6 font-black text-[#10b981] uppercase italic text-sm">{bet.ticket_serial}</td>
                      <td className="p-6 text-slate-200 font-bold text-sm">KES {Number(bet.stake).toLocaleString()}</td>
                      <td className="p-6 text-right text-slate-500 text-[10px] uppercase font-black italic tracking-widest">
                        {new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                  {stats.recentBets.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-16 text-center text-slate-700 text-[10px] font-black uppercase tracking-[0.4em] italic">
                        Waiting for incoming data...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#10b981] to-[#059669] p-8 rounded-[2.5rem] text-black h-fit shadow-xl">
               <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Provisioning</h3>
               <p className="text-[10px] font-bold uppercase mb-6 italic opacity-80 leading-relaxed">Expand your network nodes or distribute float instantly.</p>
               <button onClick={() => window.location.href = '/admin/operator'} className="w-full bg-white text-black font-black py-4 rounded-2xl text-xs uppercase italic tracking-widest hover:shadow-2xl transition-all">
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
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
      <div className="absolute -top-4 -right-4 p-8 text-white opacity-[0.03] scale-150 rotate-12">{icon}</div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 italic">{title}</p>
      <p className={`text-3xl font-black tracking-tighter italic ${color}`}>
        {isMoney && <span className="text-sm mr-2 opacity-30 not-italic font-bold">KES</span>}
        {value}
      </p>
    </div>
  );
}
