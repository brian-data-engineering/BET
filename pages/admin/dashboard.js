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
    // 1. Wait for profile to load from Context
    if (!profile?.id) return;

    const fetchLiveStats = async () => {
      try {
        // Normalize role to handle 'super_admin' or 'superadmin'
        const rawRole = (profile.role || '').toLowerCase();
        const isSuper = rawRole.includes('super');
        
        // 2. Build Entities Query
        // If you are Super Admin, we pull EVERYONE who isn't an admin.
        // This bypasses the broken parent_id links for your specific ID.
        let managedQuery = supabase.from('profiles').select('balance, role');
        
        if (isSuper) {
          managedQuery = managedQuery.neq('role', 'super_admin');
        } else {
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

        // 3. Process the data
        const entities = managedRes.data || [];
        const volume = entities.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);

        setStats({ 
          totalBets: betsRes.count || 0, 
          totalVolume: volume, 
          managedAccounts: entities.length,
          recentBets: recentRes.data || []
        });

      } catch (err) {
        console.error("Dashboard Sync Error:", err.message);
      }
    };

    fetchLiveStats();

    // 4. Real-time Subscription
    const channel = supabase.channel('lucra-main-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'betsnow' }, () => fetchLiveStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchLiveStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  return (
    <AdminLayout>
      <div className="p-8 space-y-8 bg-[#0b0f1a] min-h-screen text-white">
        
        {/* Dashboard Header */}
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-[#10b981]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Intelligence</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">
              {profile?.role?.includes('super') ? 'Global Control' : 'Shop Command'}
            </h1>
          </div>
          <div className="bg-[#10b981]/5 px-5 py-3 rounded-2xl border border-[#10b981]/10 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${stats.managedAccounts > 0 ? 'bg-[#10b981]' : 'bg-red-500'}`} />
            <span className="text-[10px] font-black text-[#10b981] uppercase italic tracking-widest">
              {profile?.username || 'CONNECTING...'}
            </span>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Admin Float" value={(profile?.balance || 0).toLocaleString()} icon={<Wallet />} isMoney />
          <StatCard title="Net Volume" value={stats.totalVolume.toLocaleString()} icon={<TrendingUp />} isMoney color="text-[#10b981]" />
          <StatCard title="System Bets" value={stats.totalBets} icon={<Ticket />} />
          <StatCard title="Nodes Online" value={stats.managedAccounts} icon={<Users />} />
        </div>

        {/* Live Data Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-[#111926] border border-white/5 rounded-[2.5rem] overflow-hidden">
            <div className="p-8 border-b border-white/5 flex items-center gap-3 bg-white/[0.02]">
              <Activity size={20} className="text-[#10b981]" />
              <h2 className="text-sm font-black uppercase tracking-[0.2em] italic text-slate-300">Live Transmission</h2>
            </div>
            <table className="w-full text-left">
              <tbody className="divide-y divide-white/5">
                {stats.recentBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-white/[0.01]">
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
                      NO_TRANSMISSIONS_FOUND
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Action Panel */}
          <div className="bg-[#10b981] p-10 rounded-[2.5rem] text-black flex flex-col justify-between shadow-2xl shadow-[#10b981]/20">
               <div>
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4">Network</h3>
                 <p className="text-[10px] font-bold uppercase opacity-80 leading-relaxed italic">
                   System-wide override enabled. Viewing all operational nodes across the Lucra network.
                 </p>
               </div>
               <button 
                onClick={() => window.location.href = '/admin/operator'} 
                className="w-full bg-black text-white font-black py-5 rounded-2xl text-xs uppercase italic tracking-widest mt-8 hover:scale-[1.02] transition-transform"
               >
                 Manage Operators
               </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, isMoney, color = "text-white" }) {
  return (
    <div className="bg-[#111926] p-8 rounded-[2.5rem] border border-white/5 relative group transition-all hover:border-[#10b981]/20">
      <div className="absolute right-6 top-6 text-white opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] mb-3 italic">{title}</p>
      <p className={`text-3xl font-black italic tracking-tighter ${color}`}>
        {isMoney && <span className="text-sm mr-1 opacity-20 not-italic font-bold">KES</span>}
        {value}
      </p>
    </div>
  );
}
