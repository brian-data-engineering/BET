import { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout, { AdminContext } from '../../components/admin/AdminLayout';
import { Ticket, Users, Wallet, TrendingUp, Activity, ShieldCheck } from 'lucide-center';

export default function AdminDashboard() {
  const { profile } = useContext(AdminContext);
  const [stats, setStats] = useState({ 
    totalBets: 0, totalVolume: 0, managedAccounts: 0, recentBets: [] 
  });

  useEffect(() => {
    // 1. Critical Check: Ensure we have a profile
    if (!profile) return;

    const fetchLiveStats = async () => {
      try {
        // Normalizing the role check to handle 'super_admin' or 'superadmin'
        const userRole = (profile.role || '').toLowerCase().replace('_', '');
        const isSuper = userRole === 'superadmin';
        
        console.log("Current Identity:", profile.username, "| Role:", profile.role, "| IsSuper:", isSuper);

        // 2. Build the Entities Query
        let managedQuery = supabase.from('profiles').select('balance, role');
        
        if (isSuper) {
          // If Super Admin, just get everyone who isn't a super_admin
          managedQuery = managedQuery.neq('role', 'super_admin');
        } else {
          // If Operator, get only their children
          managedQuery = managedQuery.eq('parent_id', profile.id);
        }

        const [managedRes, betsRes, recentRes] = await Promise.all([
          managedQuery,
          supabase.from('betsnow').select('*', { count: 'exact', head: true }),
          supabase.from('betsnow')
            .select('id, ticket_serial, stake, created_at')
            .order('created_at', { ascending: false })
            .limit(10)
        ]);

        // 3. Process Managed Data
        const entities = managedRes.data || [];
        const calculatedVolume = entities.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

        setStats({ 
          totalBets: betsRes.count || 0, 
          totalVolume: calculatedVolume, 
          managedAccounts: entities.length,
          recentBets: recentRes.data || []
        });

      } catch (err) {
        console.error("Transmission Error:", err);
      }
    };

    fetchLiveStats();

    // Realtime Listener
    const channel = supabase.channel('lucra-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'betsnow' }, () => fetchLiveStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchLiveStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        
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
            <div className={`w-2 h-2 rounded-full animate-pulse ${stats.managedAccounts > 0 ? 'bg-[#10b981]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black text-[#10b981] uppercase italic tracking-widest">
              {profile?.username || 'CONNECTING...'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="My Balance" value={(profile?.balance || 0).toLocaleString()} icon={<Wallet />} isMoney />
          <StatCard title="System Volume" value={stats.totalVolume.toLocaleString()} icon={<TrendingUp />} isMoney color="text-[#10b981]" />
          <StatCard title="Total Bets" value={stats.totalBets} icon={<Ticket />} />
          <StatCard title="Entities" value={stats.managedAccounts} icon={<Users />} />
        </div>

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
                    <td className="p-6 font-black text-[#10b981] uppercase italic text-sm">{bet.ticket_serial}</td>
                    <td className="p-6 text-slate-200 font-bold">KES {Number(bet.stake).toLocaleString()}</td>
                    <td className="p-6 text-right text-slate-500 text-[10px] uppercase font-black">
                      {new Date(bet.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
                {stats.recentBets.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-20 text-center text-slate-700 text-[10px] font-black uppercase italic tracking-[0.5em]">
                      NO_DATA_STREAM_DETECTED
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-[#10b981] p-10 rounded-[2.5rem] text-black flex flex-col justify-between">
               <h3 className="text-2xl font-black uppercase italic tracking-tighter">Network</h3>
               <button onClick={() => window.location.href = '/admin/operator'} className="w-full bg-black text-white font-black py-5 rounded-2xl text-xs uppercase italic tracking-widest mt-8">
                 Manage Entities
               </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, isMoney, color = "text-white" }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative">
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 italic">{title}</p>
      <p className={`text-3xl font-black italic ${color}`}>
        {isMoney && <span className="text-sm mr-1 opacity-20">KES</span>}{value}
      </p>
    </div>
  );
}
